export interface ProgressState {
  stagnantCycles: number;
  lastPageHeight: number;
}

export interface ProgressResult extends ProgressState {
  shouldFinish: boolean;
}

export function advanceProgress(
  previous: ProgressState,
  addedRecords: number,
  pageHeight: number
): ProgressResult {
  const hasProgress = addedRecords > 0 || pageHeight > previous.lastPageHeight;
  const stagnantCycles = hasProgress ? 0 : previous.stagnantCycles + 1;
  return {
    stagnantCycles,
    lastPageHeight: pageHeight,
    shouldFinish: stagnantCycles >= 6
  };
}
