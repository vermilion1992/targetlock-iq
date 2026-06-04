import { describe, expect, it } from "vitest";
import { DEFAULT_PLAN_CORRIDOR } from "../plan-corridor";
import {
  buildImportUndoSnapshot,
  describeImportUndo,
} from "../sidebar-import-undo";

describe("sidebar-import-undo", () => {
  it("snapshots plan and actual before import", () => {
    const snap = buildImportUndoSnapshot({
      kind: "plan",
      planRecords: [{ md: 0, dip: -60, azimuth: 125 }],
      actualRecords: [{ md: 0, dip: -59, azimuth: 126 }],
      planCorridor: DEFAULT_PLAN_CORRIDOR,
    });
    expect(snap.previousPlan).toHaveLength(1);
    expect(snap.previousActual).toHaveLength(1);
    expect(snap.previousCorridor.intervalM).toBe(DEFAULT_PLAN_CORRIDOR.intervalM);
    expect(snap.kind).toBe("plan");
  });

  it("describes undo scope in plain language", () => {
    const snap = buildImportUndoSnapshot({
      kind: "actual",
      planRecords: [],
      actualRecords: [],
      planCorridor: DEFAULT_PLAN_CORRIDOR,
    });
    expect(describeImportUndo(snap)).toContain("survey results");
  });
});
