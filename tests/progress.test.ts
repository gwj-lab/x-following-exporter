import { describe, expect, test } from "vitest";
import { advanceProgress } from "../lib/progress";

describe("advanceProgress", () => {
  test("resets stagnation when records are added", () => {
    expect(
      advanceProgress({ stagnantCycles: 4, lastPageHeight: 1000 }, 2, 1000)
    ).toEqual({ stagnantCycles: 0, lastPageHeight: 1000, shouldFinish: false });
  });

  test("does not advance stagnation while the page is still growing", () => {
    expect(
      advanceProgress({ stagnantCycles: 4, lastPageHeight: 1000 }, 0, 1200)
    ).toEqual({ stagnantCycles: 0, lastPageHeight: 1200, shouldFinish: false });
  });

  test("finishes after six unchanged cycles", () => {
    expect(
      advanceProgress({ stagnantCycles: 5, lastPageHeight: 1200 }, 0, 1200)
    ).toEqual({ stagnantCycles: 6, lastPageHeight: 1200, shouldFinish: true });
  });
});
