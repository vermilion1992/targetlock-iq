import { describe, expect, it } from "vitest";
import { createLibraryWithHole, buildBlankProject } from "../hole-library";
import {
  activatePlannerPlanForExecution,
} from "../execution-bridge";
import { buildPlannerApprovalSnapshot } from "../planner-approval";
import { approvePlannerPlan } from "../planner-status";
import {
  buildExecutionManifest,
  exportActualSurveysCsv,
  exportExecutionManifestJson,
  resolveExecutionPackageSupport,
} from "../execution-package";
import type { PlannerProjectMetadata } from "../planner-types";
import type { SavedHoleProject } from "../storage";

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
    planRecords: overrides.planRecords ?? [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 300, dip: -62, azimuth: 92 },
    ],
    actualRecords: overrides.actualRecords ?? [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 75, dip: -61, azimuth: 91 },
    ],
    plannerMeta: meta,
    ...overrides,
  };
}

function activeLib() {
  const hole = plannerHole({ holeId: "pkg-1", holeName: "PKG-1" });
  let lib = createLibraryWithHole(hole);
  const snapshot = buildPlannerApprovalSnapshot(hole, lib, {
    approvedBy: "Geologist",
  });
  lib = approvePlannerPlan(lib, "pkg-1", {
    approvedBy: "Geologist",
    snapshot,
  })!;
  lib = activatePlannerPlanForExecution(lib, "pkg-1")!;
  const saved = lib.holes.find((h) => h.holeId === "pkg-1")!;
  return { lib, hole: saved };
}

describe("execution-package", () => {
  it("manifest includes lockedPlan and actual-vs-plan report", () => {
    const { lib, hole } = activeLib();
    const manifest = buildExecutionManifest(hole, lib);
    expect(manifest).not.toBeNull();
    expect(manifest!.lockedPlan?.planHash).toBe(hole.plannerMeta!.lockedPlan!.planHash);
    expect(manifest!.actualVsPlanReport.hasLockedPlan).toBe(true);
    expect(manifest!.actualVsPlanReport.latestActualMd).toBe(75);
    expect(manifest!.auditEvents.length).toBeGreaterThan(0);
  });

  it("actual survey CSV export includes md,dip,azimuth", () => {
    const { hole } = activeLib();
    const csv = exportActualSurveysCsv(hole);
    expect(csv).not.toBeNull();
    expect(csv!.split("\n")[0]).toBe("md,dip,azimuth");
    expect(csv).toContain("75,-61.0,91.0");
  });

  it("non-planner holes produce unsupported result", () => {
    const hole = buildBlankProject("Field", "Site", "f1");
    const lib = createLibraryWithHole(hole);
    const support = resolveExecutionPackageSupport(hole);
    expect(support.supported).toBe(false);
    expect(buildExecutionManifest(hole, lib)).toBeNull();
    expect(exportExecutionManifestJson(hole, lib)).toBeNull();
    expect(exportActualSurveysCsv(hole)).toBeNull();
  });

  it("execution package preserves hashes", () => {
    const { lib, hole } = activeLib();
    const lockedHash = hole.plannerMeta!.lockedPlan!.planHash;
    const approvalHash = hole.plannerMeta!.lockedPlan!.approvalHash;
    const json = exportExecutionManifestJson(hole, lib);
    expect(json).not.toBeNull();
    const parsed = JSON.parse(json!) as ReturnType<typeof buildExecutionManifest>;
    expect(parsed!.lockedPlanHash).toBe(lockedHash);
    expect(parsed!.lockedPlan?.planHash).toBe(lockedHash);
    expect(parsed!.lockedPlan?.approvalHash).toBe(approvalHash);
  });
});
