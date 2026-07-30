import { expect, test } from "vitest";
import { isPopupCommand, isDownloadRequest } from "../lib/protocol";

test("accepts only the fixed popup command allowlist", () => {
  expect(isPopupCommand({ type: "START" })).toBe(true);
  expect(isPopupCommand({ type: "STOP" })).toBe(true);
  expect(isPopupCommand({ type: "START", payload: "injected" })).toBe(false);
  expect(isPopupCommand({ type: "EVAL", code: "alert(1)" })).toBe(false);
});

test("validates download messages and rejects unsafe filenames", () => {
  expect(
    isDownloadRequest({
      type: "DOWNLOAD_CSV",
      csv: "\uFEFFusername,display_name,profile_url",
      filename: "x-following-20260730-120000.csv"
    })
  ).toBe(true);
  expect(
    isDownloadRequest({ type: "DOWNLOAD_CSV", csv: "x", filename: "../secret.csv" })
  ).toBe(false);
});
