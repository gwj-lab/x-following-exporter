import type { FollowingRecord } from "./types";

function escapeCsvCell(value: string): string {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

export function createFollowingCsv(records: FollowingRecord[]): string {
  const rows = records.map((record) =>
    [record.username, record.displayName, record.profileUrl]
      .map(escapeCsvCell)
      .join(",")
  );
  return `\uFEFFusername,display_name,profile_url${rows.length ? `\r\n${rows.join("\r\n")}` : ""}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function createExportFilename(date: Date, partial: boolean): string {
  const timestamp = [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "-",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds())
  ].join("");
  return `x-following-${timestamp}${partial ? "-partial" : ""}.csv`;
}
