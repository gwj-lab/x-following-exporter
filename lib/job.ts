import { advanceProgress } from "./progress";
import type { ExportJob, FollowingRecord } from "./types";

export function createJob(
  ownerUsername: string,
  pageHeight: number,
  now = Date.now()
): ExportJob {
  return {
    ownerUsername,
    status: "running",
    records: [],
    scrollY: 0,
    stagnantCycles: 0,
    lastPageHeight: pageHeight,
    updatedAt: now
  };
}

export function mergeScanIntoJob(
  job: ExportJob,
  scannedRecords: FollowingRecord[],
  scrollY: number,
  pageHeight: number,
  now = Date.now()
): ExportJob {
  const records = [...job.records];
  const seen = new Set(records.map((record) => record.username.toLowerCase()));

  for (const record of scannedRecords) {
    const normalized = record.username.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    records.push(record);
  }

  const progress = advanceProgress(
    { stagnantCycles: job.stagnantCycles, lastPageHeight: job.lastPageHeight },
    records.length - job.records.length,
    pageHeight
  );
  return {
    ...job,
    records,
    scrollY,
    stagnantCycles: progress.stagnantCycles,
    lastPageHeight: progress.lastPageHeight,
    updatedAt: now,
    error: undefined
  };
}

export function setJobError(job: ExportJob, error: string, now = Date.now()): ExportJob {
  return { ...job, status: "error", error, updatedAt: now };
}

export function setJobStatus(
  job: ExportJob,
  status: ExportJob["status"],
  now = Date.now()
): ExportJob {
  return { ...job, status, error: undefined, updatedAt: now };
}
