import { describe, expect, test } from "vitest";
import { createJob, mergeScanIntoJob, setJobError } from "../lib/job";

describe("export job state", () => {
  test("merges scans without duplicating virtualized users", () => {
    const job = createJob("Owner", 800, 100);
    const merged = mergeScanIntoJob(
      job,
      [
        { username: "Alpha", displayName: "甲", profileUrl: "https://x.com/Alpha" },
        { username: "alpha", displayName: "重复", profileUrl: "https://x.com/alpha" },
        { username: "Beta", displayName: "乙", profileUrl: "https://x.com/Beta" }
      ],
      420,
      800,
      200
    );

    expect(merged.records.map((record) => record.username)).toEqual(["Alpha", "Beta"]);
    expect(merged.scrollY).toBe(420);
    expect(merged.stagnantCycles).toBe(0);
    expect(merged.updatedAt).toBe(200);
  });

  test("increments stagnation when a scan has no progress", () => {
    const job = createJob("owner", 800, 100);
    const merged = mergeScanIntoJob(job, [], 420, 800, 200);

    expect(merged.stagnantCycles).toBe(1);
  });

  test("moves a running job into an actionable error state", () => {
    const job = setJobError(createJob("owner", 800, 100), "页面结构已变化", 200);
    expect(job.status).toBe("error");
    expect(job.error).toBe("页面结构已变化");
    expect(job.updatedAt).toBe(200);
  });
});
