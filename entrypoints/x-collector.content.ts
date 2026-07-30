import { browser } from "wxt/browser";
import { createExportFilename, createFollowingCsv } from "../lib/csv";
import { createJob, mergeScanIntoJob, setJobError, setJobStatus } from "../lib/job";
import { parseFollowingRecords } from "../lib/parser";
import {
  isPopupCommand,
  type CommandResponse,
  type DownloadRequest,
  type PopupCommand
} from "../lib/protocol";
import { ExportJobStore, type StorageAreaLike } from "../lib/storage";
import type { ExportJob } from "../lib/types";
import { findOwnerUsername, followingPageUrl, isFollowingPage } from "../lib/x-page";

const MIN_DELAY_MS = 1_200;
const MAX_DELAY_MS = 2_000;
const STRUCTURE_TIMEOUT_MS = 60_000;

export default defineContentScript({
  matches: ["https://x.com/*", "https://twitter.com/*"],
  runAt: "document_idle",
  main(ctx) {
    const storageArea: StorageAreaLike = {
      get: async (key) => (await browser.storage.local.get(key)) as Record<string, unknown>,
      set: async (items) => browser.storage.local.set(items),
      remove: async (key) => browser.storage.local.remove(key)
    };
    const store = new ExportJobStore(storageArea);
    let runVersion = 0;
    let structureMissingSince: number | null = null;

    const pageHeight = () =>
      Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0);
    const delay = (milliseconds: number) =>
      new Promise<void>((resolve) => ctx.setTimeout(resolve, milliseconds));
    const randomDelay = () =>
      MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1));

    async function requestDownload(job: ExportJob, partial: boolean): Promise<void> {
      const request: DownloadRequest = {
        type: "DOWNLOAD_CSV",
        csv: createFollowingCsv(job.records),
        filename: createExportFilename(new Date(), partial)
      };
      const response = (await browser.runtime.sendMessage(request)) as
        | { ok: true; downloadId: number }
        | { ok: false; error: string }
        | undefined;
      if (!response?.ok) throw new Error(response?.error ?? "下载服务没有响应");
    }

    async function failJob(job: ExportJob, message: string): Promise<ExportJob> {
      const failed = setJobError(job, message);
      await store.save(failed);
      return failed;
    }

    async function completeJob(job: ExportJob, partial: boolean): Promise<number> {
      const completed = setJobStatus(job, "completed");
      await store.save(completed);
      try {
        await requestDownload(completed, partial);
        await store.clear(completed.ownerUsername);
        return completed.records.length;
      } catch (error) {
        await failJob(
          completed,
          `导出文件创建失败：${error instanceof Error ? error.message : "未知错误"}`
        );
        throw error;
      }
    }

    async function runCollector(ownerUsername: string, version: number): Promise<void> {
      let job = await store.load(ownerUsername);
      if (!job || job.status !== "running" || version !== runVersion) return;

      if (!isFollowingPage(location.href, ownerUsername)) {
        location.assign(followingPageUrl(location.href, ownerUsername));
        return;
      }

      if (job.scrollY > 0) window.scrollTo({ top: job.scrollY });

      while (ctx.isValid && version === runVersion) {
        job = await store.load(ownerUsername);
        if (!job || job.status !== "running") return;

        const primaryColumn =
          document.querySelector('[data-testid="primaryColumn"]') ??
          document.querySelector('main[role="main"]');
        const scanned = primaryColumn ? parseFollowingRecords(document) : [];

        if (!primaryColumn || (scanned.length === 0 && job.records.length === 0)) {
          structureMissingSince ??= Date.now();
          if (Date.now() - structureMissingSince >= STRUCTURE_TIMEOUT_MS) {
            await failJob(
              job,
              "持续 60 秒无法识别关注账号。请确认已经登录并打开自己的“正在关注”页面；如果页面显示正常，可能是 X 页面结构已变化。"
            );
            return;
          }
          await delay(1_000);
          continue;
        }

        structureMissingSince = null;
        job = mergeScanIntoJob(job, scanned, window.scrollY, pageHeight());
        await store.save(job);

        if (job.stagnantCycles >= 6) {
          const finalJob = mergeScanIntoJob(
            job,
            parseFollowingRecords(document),
            window.scrollY,
            pageHeight()
          );
          await completeJob(finalJob, false);
          return;
        }

        window.scrollBy({ top: Math.max(Math.floor(window.innerHeight * 0.85), 600) });
        await delay(randomDelay());
      }
    }

    function startLoop(ownerUsername: string): void {
      runVersion += 1;
      structureMissingSince = null;
      void runCollector(ownerUsername, runVersion);
    }

    async function getCurrentJob(): Promise<{ owner: string | null; job: ExportJob | null }> {
      const owner = findOwnerUsername(document);
      return { owner, job: owner ? await store.load(owner) : null };
    }

    async function handleCommand(command: PopupCommand): Promise<CommandResponse> {
      const { owner, job } = await getCurrentJob();
      if (!owner) {
        return {
          ok: false,
          job: null,
          message: "未识别到当前账号。请先在此标签页登录 X，等待页面加载完成后重试。"
        };
      }

      if (command.type === "GET_STATE") return { ok: true, job, ownerUsername: owner };

      if (command.type === "START") {
        const started = createJob(owner, pageHeight());
        await store.save(started);
        startLoop(owner);
        return {
          ok: true,
          job: started,
          ownerUsername: owner,
          message: "已开始采集关注列表"
        };
      }

      if (!job) {
        return { ok: false, job: null, message: "当前账号没有可操作的导出任务。" };
      }

      if (command.type === "PAUSE") {
        runVersion += 1;
        const paused = setJobStatus(job, "paused");
        await store.save(paused);
        return { ok: true, job: paused, ownerUsername: owner, message: "采集已暂停" };
      }

      if (command.type === "RESUME") {
        const resumed = setJobStatus(job, "running");
        await store.save(resumed);
        startLoop(owner);
        return { ok: true, job: resumed, ownerUsername: owner, message: "正在继续采集" };
      }

      runVersion += 1;
      let finalJob = job;
      if (isFollowingPage(location.href, owner)) {
        finalJob = mergeScanIntoJob(
          job,
          parseFollowingRecords(document),
          window.scrollY,
          pageHeight()
        );
      }
      try {
        const downloadedCount = await completeJob(finalJob, true);
        return {
          ok: true,
          job: null,
          ownerUsername: owner,
          downloadedCount,
          message: `已导出 ${downloadedCount} 个账号（部分结果）`
        };
      } catch {
        return {
          ok: false,
          job: await store.load(owner),
          ownerUsername: owner,
          message: "部分结果下载失败，检查点已保留，请重试。"
        };
      }
    }

    browser.runtime.onMessage.addListener((message) => {
      if (!isPopupCommand(message)) return undefined;
      return handleCommand(message);
    });

    void (async () => {
      for (let attempt = 0; attempt < 60 && ctx.isValid; attempt += 1) {
        const owner = findOwnerUsername(document);
        if (owner) {
          const job = await store.load(owner);
          if (job?.status === "running") startLoop(owner);
          return;
        }
        await delay(1_000);
      }
    })();
  }
});
