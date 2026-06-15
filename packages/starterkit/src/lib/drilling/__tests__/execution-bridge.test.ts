import { describe, expect, it } from "vitest";
import { createLibraryWithHole, buildBlankProject } from "../hole-library";
import { buildHolePackage, parseHolePackage } from "../hole-package";
import {
  activatePlannerHoleForExecution,
  activatePlannerPlanForExecution,
  completePlannerExecution,
} from "../execution-bridge";
import { createPlannerRevision } from "../planner";
import { buildPlannerApprovalSnapshot } from "../planner-approval";
import { approvePlannerPlan } from "../planner-status";
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
    status: "planned",
    planRevision: 1,
    ...(overrides.plannerMeta ?? {}),
  };
  return {
    ...buildBlankProject(overrides.holeName, "Site", overrides.holeId),
    planRecords: overrides.planRecords ?? [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 300, dip: -62, azimuth: 92 },
    ],
    actualRecords: overrides.actualRecords ?? [{ md: 0, dip: -60, azimuth: 90 }],
    plannerMeta: meta,
    ...overrides,
  };
}

describe("execution-bridge", () => {
  it("activating approved plan creates lockedPlan snapshot", () => {
    const hole = plannerHole({
      holeId: "p1",
      holeName: "P1",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
        approvedBy: "Geologist",
        approvedAt: "2026-06-01T00:00:00.000Z",
      },
    });
    let lib = createLibraryWithHole(hole);
    const snapshot = buildPlannerApprovalSnapshot(hole, lib, {
      approvedBy: "Geologist",
    });
    lib = approvePlannerPlan(lib, "p1", {
      approvedBy: "Geologist",
      snapshot,
    })!;
    const next = activatePlannerPlanForExecution(lib, "p1", {
      now: "2026-06-02T00:00:00.000Z",
    });
    expect(next).not.toBeNull();
    const saved = next!.holes.find((h) => h.holeId === "p1");
    expect(saved?.plannerMeta?.status).toBe("active");
    expect(saved?.plannerMeta?.lockedPlan).toBeTruthy();
    expect(saved?.plannerMeta?.lockedPlan?.planRecords).toHaveLength(2);
    expect(saved?.plannerMeta?.lockedPlan?.approvalHash).toBeTruthy();
    expect(saved?.plannerMeta?.activePlanHash).toBe(saved?.plannerMeta?.lockedPlan?.planHash);
    expect(saved?.plannerMeta?.executionStatus?.state).toBe("not-started");
    expect(next!.activeHoleId).toBe("p1");
  });

  it("activating unapproved plan with allowUnapproved creates warning context", () => {
    const hole = plannerHole({
      holeId: "p2",
      holeName: "P2",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "planned",
      },
    });
    const lib = createLibraryWithHole(hole);
    const next = activatePlannerPlanForExecution(lib, "p2", {
      allowUnapproved: true,
      now: "2026-06-02T00:00:00.000Z",
    });
    expect(next).not.toBeNull();
    const saved = next!.holes.find((h) => h.holeId === "p2");
    expect(saved?.plannerMeta?.lockedPlan).toBeTruthy();
    expect(saved?.plannerMeta?.approvalSnapshot).toBeFalsy();
    expect(saved?.plannerMeta?.lockedPlan?.approvalHash).toBeUndefined();
  });

  it("completed plan preserves lockedPlan and actualRecords", () => {
    const hole = plannerHole({
      holeId: "p3",
      holeName: "P3",
      actualRecords: [
        { md: 0, dip: -60, azimuth: 90 },
        { md: 50, dip: -60.5, azimuth: 90.5 },
      ],
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    let lib = createLibraryWithHole(hole);
    lib = activatePlannerPlanForExecution(lib, "p3")!;
    const lockedHash = lib.holes[0]!.plannerMeta!.lockedPlan!.planHash;
    const result = completePlannerExecution(lib, "p3", {
      completedBy: "Driller",
      completionNotes: "TD reached",
      completedAt: "2026-06-03T00:00:00.000Z",
    });
    expect(result).not.toBeNull();
    const saved = result!.completedHole;
    expect(saved.plannerMeta?.status).toBe("completed");
    expect(saved.plannerMeta?.lockedPlan?.planHash).toBe(lockedHash);
    expect(saved.actualRecords).toHaveLength(2);
    expect(saved.plannerMeta?.executionStatus?.completedBy).toBe("Driller");
    expect(saved.plannerMeta?.completionSnapshot?.actualSurveyCount).toBe(2);
  });

  it("creating revision from active plan leaves locked plan unchanged on source", () => {
    const hole = plannerHole({
      holeId: "p4",
      holeName: "P4",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    let lib = createLibraryWithHole(hole);
    lib = activatePlannerPlanForExecution(lib, "p4")!;
    const sourceLocked = lib.holes.find((h) => h.holeId === "p4")!.plannerMeta!.lockedPlan!;
    const next = createPlannerRevision(lib, "p4");
    expect(next).not.toBeNull();
    const source = next!.holes.find((h) => h.holeId === "p4");
    expect(source?.plannerMeta?.lockedPlan?.planHash).toBe(sourceLocked.planHash);
    expect(source?.plannerMeta?.executionStatus?.state).toBe("revised");
    expect(source?.plannerMeta?.nextRevisionHoleId).toBeTruthy();
    const revision = next!.holes.find((h) => h.holeName.includes("R2"));
    expect(revision?.plannerMeta?.lockedPlan).toBeUndefined();
    expect(revision?.plannerMeta?.status).toBe("draft");
    expect(revision?.actualRecords).toHaveLength(1);
  });

  it("lockedPlan survives hole package round trip", () => {
    const hole = plannerHole({
      holeId: "p5",
      holeName: "P5",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    let lib = createLibraryWithHole(hole);
    const snapshot = buildPlannerApprovalSnapshot(hole, lib, {
      approvedBy: "Geologist",
    });
    lib = approvePlannerPlan(lib, "p5", {
      approvedBy: "Geologist",
      snapshot,
    })!;
    lib = activatePlannerPlanForExecution(lib, "p5")!;
    const before = lib.holes.find((h) => h.holeId === "p5")!;
    const pkg = buildHolePackage(lib);
    const parsed = parseHolePackage(JSON.stringify(pkg));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const restored = parsed.package.library.holes.find((h) => h.holeId === "p5");
    expect(restored?.plannerMeta?.lockedPlan?.planHash).toBe(
      before.plannerMeta?.lockedPlan?.planHash
    );
    expect(restored?.plannerMeta?.activePlanHash).toBe(
      before.plannerMeta?.activePlanHash
    );
    expect(restored?.plannerMeta?.executionStatus?.state).toBe("not-started");
  });

  it("activatePlannerHoleForExecution returns warnings for unapproved activation", () => {
    const hole = plannerHole({
      holeId: "p6",
      holeName: "P6",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "planned",
      },
    });
    const lib = createLibraryWithHole(hole);
    const result = activatePlannerHoleForExecution(lib, "p6", {
      allowUnapproved: true,
    });
    expect(result).not.toBeNull();
    expect(result!.warnings.length).toBeGreaterThan(0);
    expect(result!.lockStatus.state).toBe("no-approval");
  });
});
