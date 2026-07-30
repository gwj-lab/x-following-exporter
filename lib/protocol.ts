import type { ExportJob } from "./types";

export type PopupCommandType = "GET_STATE" | "START" | "PAUSE" | "RESUME" | "STOP";

export interface PopupCommand {
  type: PopupCommandType;
}

export interface CommandResponse {
  ok: boolean;
  job: ExportJob | null;
  ownerUsername?: string;
  message?: string;
  downloadedCount?: number;
}

export interface DownloadRequest {
  type: "DOWNLOAD_CSV";
  csv: string;
  filename: string;
}

const POPUP_COMMANDS = new Set(["GET_STATE", "START", "PAUSE", "RESUME", "STOP"]);
const EXPORT_FILENAME_PATTERN = /^x-following-\d{8}-\d{6}(?:-partial)?\.csv$/;

export function isPopupCommand(value: unknown): value is PopupCommand {
  if (!value || typeof value !== "object") return false;
  const object = value as Record<string, unknown>;
  return (
    Object.keys(object).length === 1 &&
    typeof object.type === "string" &&
    POPUP_COMMANDS.has(object.type)
  );
}

export function isDownloadRequest(value: unknown): value is DownloadRequest {
  if (!value || typeof value !== "object") return false;
  const object = value as Record<string, unknown>;
  return (
    Object.keys(object).length === 3 &&
    object.type === "DOWNLOAD_CSV" &&
    typeof object.csv === "string" &&
    object.csv.length <= 10_000_000 &&
    typeof object.filename === "string" &&
    EXPORT_FILENAME_PATTERN.test(object.filename)
  );
}
