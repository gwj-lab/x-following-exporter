import { expect, test } from "vitest";
import { createFollowingCsv, createExportFilename } from "../lib/csv";

test("creates an Excel-compatible CSV with escaped values", () => {
  const csv = createFollowingCsv([
    {
      username: "alice",
      displayName: "Alice, \"A\"\n中文",
      profileUrl: "https://x.com/alice"
    }
  ]);

  expect(csv).toBe(
    '\uFEFFusername,display_name,profile_url\r\nalice,"Alice, ""A""\n中文",https://x.com/alice'
  );
});

test("marks manually stopped exports as partial", () => {
  const date = new Date("2026-07-30T04:05:06Z");
  expect(createExportFilename(date, true)).toBe("x-following-20260730-040506-partial.csv");
  expect(createExportFilename(date, false)).toBe("x-following-20260730-040506.csv");
});
