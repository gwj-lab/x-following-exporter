import type { ExportJob, FollowingRecord } from "./types";

const USERNAME_PATTERN = /^[A-Za-z0-9_]{1,15}$/;
const VALID_STATUSES = new Set(["running", "paused", "completed", "error"]);

export interface StorageAreaLike {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}

export function jobStorageKey(ownerUsername: string): string {
  if (!USERNAME_PATTERN.test(ownerUsername)) throw new Error("无效的 X 用户名");
  return `x-following-exporter:job:${ownerUsername.toLowerCase()}`;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isFollowingRecord(value: unknown): value is FollowingRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.username !== "string" || !USERNAME_PATTERN.test(record.username)) return false;
  if (typeof record.displayName !== "string" || record.displayName.length > 500) return false;
  if (typeof record.profileUrl !== "string") return false;

  try {
    const url = new URL(record.profileUrl);
    return (
      url.protocol === "https:" &&
      url.hostname === "x.com" &&
      url.pathname === `/${record.username}` &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export function isExportJob(value: unknown): value is ExportJob {
  if (!value || typeof value !== "object") return false;
  const job = value as Record<string, unknown>;
  return (
    typeof job.ownerUsername === "string" &&
    USERNAME_PATTERN.test(job.ownerUsername) &&
    typeof job.status === "string" &&
    VALID_STATUSES.has(job.status) &&
    Array.isArray(job.records) &&
    job.records.length <= 100_000 &&
    job.records.every(isFollowingRecord) &&
    isNonNegativeNumber(job.scrollY) &&
    Number.isInteger(job.stagnantCycles) &&
    isNonNegativeNumber(job.stagnantCycles) &&
    isNonNegativeNumber(job.lastPageHeight) &&
    isNonNegativeNumber(job.updatedAt) &&
    (job.error === undefined || (typeof job.error === "string" && job.error.length <= 1_000))
  );
}

export class ExportJobStore {
  constructor(private readonly storage: StorageAreaLike) {}

  async load(ownerUsername: string): Promise<ExportJob | null> {
    const key = jobStorageKey(ownerUsername);
    const stored = (await this.storage.get(key))[key];
    return isExportJob(stored) ? stored : null;
  }

  async save(job: ExportJob): Promise<void> {
    await this.storage.set({ [jobStorageKey(job.ownerUsername)]: job });
  }

  async clear(ownerUsername: string): Promise<void> {
    await this.storage.remove(jobStorageKey(ownerUsername));
  }
}
