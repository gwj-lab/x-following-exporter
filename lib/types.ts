export interface FollowingRecord {
  username: string;
  displayName: string;
  profileUrl: string;
}

export type ExportJobStatus = "running" | "paused" | "completed" | "error";

export interface ExportJob {
  ownerUsername: string;
  status: ExportJobStatus;
  records: FollowingRecord[];
  scrollY: number;
  stagnantCycles: number;
  lastPageHeight: number;
  updatedAt: number;
  error?: string;
}
