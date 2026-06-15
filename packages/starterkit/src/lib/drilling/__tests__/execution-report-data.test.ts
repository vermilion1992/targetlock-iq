import { describe, expect, it } from "vitest";
import { createLibraryWithHole } from "../hole-library";
import {
  activatePlannerPlanForExecution,
} from "../execution-bridge";
import { buildPlannerApprovalSnapshot } from "../planner-approval";
import { approvePlannerPlan } from "../planner-status";
import {
  buildExecutionReportData,
  EXECUTION_EVIDENCE_DISCLAIMER,
} from "../execution-report-data";
import { buildExecutionReportText } from "../execution-report-text";
import type { PlannerProjectMetadata } from "../planner-types";
import type { SavedHoleProject } from "../storage";
import { buildBlankProject } from "../hole-library";

function plannerHole(
  overrides: Partial<SavedHoleProject> & { holeId: string; holeName: string }
): SavedHoleProject {
  const meta: PlannerProjectMetadata = {
    coordinateMode: "collar-relative",
    northReference: "grid",
    plannedAt: "2026-01-01T00:00:00.000Z",
    createdFromPlanner: true,
    status: "approved",
    planRevision: 1,
    ...(overrides.plannerMeta ?? {}),
  };
  return {
    ...buildBlankProject(overrides.holeName, "Site", overrides.holeId),
    planRecords: [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 300, dip: -62, azimuth: 92 },
    ],
    actualRecords: [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 40, dip: -60.2, azimuth: 90.2 },
    ],
    plannerMeta: meta,
    ...overrides,
  };
}

describe("execution-report-data", () => {
  it("execution report text includes disclaimer", () => {
    const hole = plannerHole({ holeId: "rpt-1", holeName: "RPT-1" });
    let lib = createLibraryWithHole(hole);
    const snapshot = buildPlannerApprovalSnapshot(hole, lib, {
      approvedBy: "Geologist",
    });
    lib = approvePlannerPlan(lib, "rpt-1", {
      approvedBy: "Geologist",
      snapshot,
    })!;
    lib = activatePlannerPlanForExecution(lib, "rpt-1")!;
    const saved = lib.holes.find((h) => h.holeId === "rpt-1")!;
    const data = buildExecutionReportData(saved, lib);
    expect(data).not.toBeNull();
    expect(data!.disclaimer).toBe(EXECUTION_EVIDENCE_DISCLAIMER);
    const text = buildExecutionReportText(data!);
    expect(text).toContain(EXECUTION_EVIDENCE_DISCLAIMER);
    expect(text).toContain("EXECUTION EVIDENCE REPORT");
    expect(text).toContain("Locked plan hash");
    expect(text).toContain("ACTUAL VS LOCKED PLAN");
  });

  it("returns null for unsupported holes", () => {
    const hole = buildBlankProject("Field", "Site", "f2");
    const lib = createLibraryWithHole(hole);
    expect(buildExecutionReportData(hole, lib)).toBeNull();
  });
});
