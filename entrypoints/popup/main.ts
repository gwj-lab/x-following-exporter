import { browser } from "wxt/browser";
import type { CommandResponse, PopupCommandType } from "../../lib/protocol";
import type { ExportJobStatus } from "../../lib/types";
import "./style.css";

const statusBadge = document.querySelector<HTMLSpanElement>("#statusBadge")!;
const ownerValue = document.querySelector<HTMLElement>("#ownerValue")!;
const countValue = document.querySelector<HTMLElement>("#countValue")!;
const message = document.querySelector<HTMLParagraphElement>("#message")!;
const startButton = document.querySelector<HTMLButtonElement>("#startButton")!;
const pauseButton = document.querySelector<HTMLButtonElement>("#pauseButton")!;
const resumeButton = document.querySelector<HTMLButtonElement>("#resumeButton")!;
const stopButton = document.querySelector<HTMLButtonElement>("#stopButton")!;
const buttons = [startButton, pauseButton, resumeButton, stopButton];

const STATUS_LABELS: Record<ExportJobStatus | "idle", string> = {
  idle: "待机",
  running: "采集中",
  paused: "已暂停",
  completed: "已完成",
  error: "需处理"
};

let busy = false;
let lastActionMessage = "";

async function sendCommand(type: PopupCommandType): Promise<CommandResponse> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !/^https:\/\/(?:x|twitter)\.com\//.test(tab.url)) {
    return { ok: false, job: null, message: "请先打开一个已登录的 x.com 页面。" };
  }

  try {
    return (await browser.tabs.sendMessage(tab.id, { type })) as CommandResponse;
  } catch {
    return {
      ok: false,
      job: null,
      message: "扩展尚未连接到此页面。请刷新 X 页面后重试。"
    };
  }
}

function render(response: CommandResponse): void {
  const job = response.job;
  const status = job?.status ?? "idle";
  statusBadge.dataset.status = status;
  statusBadge.textContent = STATUS_LABELS[status];
  const ownerUsername = job?.ownerUsername ?? response.ownerUsername;
  ownerValue.textContent = ownerUsername ? `@${ownerUsername}` : "—";
  countValue.textContent = String(job?.records.length ?? response.downloadedCount ?? 0);

  startButton.hidden = status === "running" || status === "paused";
  pauseButton.hidden = status !== "running";
  resumeButton.hidden = status !== "paused" && status !== "error";
  stopButton.hidden = status === "idle" || status === "completed";

  const defaultMessage = job?.error
    ? job.error
    : status === "running"
      ? "请保持 X 标签页打开，扩展正在逐屏读取关注账号。"
      : status === "paused"
        ? "进度已保存在本机，可以刷新页面后继续。"
        : "打开已登录的 X 页面，然后开始导出。";
  message.textContent = lastActionMessage || response.message || defaultMessage;
  message.dataset.error = response.ok ? "false" : "true";
}

async function runAction(type: PopupCommandType): Promise<void> {
  if (busy) return;
  busy = true;
  buttons.forEach((button) => (button.disabled = true));
  const response = await sendCommand(type);
  lastActionMessage = response.message ?? "";
  render(response);
  buttons.forEach((button) => (button.disabled = false));
  busy = false;
}

startButton.addEventListener("click", () => void runAction("START"));
pauseButton.addEventListener("click", () => void runAction("PAUSE"));
resumeButton.addEventListener("click", () => void runAction("RESUME"));
stopButton.addEventListener("click", () => void runAction("STOP"));

async function refresh(): Promise<void> {
  if (busy) return;
  const response = await sendCommand("GET_STATE");
  lastActionMessage = "";
  render(response);
}

void refresh();
const refreshTimer = window.setInterval(() => void refresh(), 1_000);
window.addEventListener("unload", () => window.clearInterval(refreshTimer));
