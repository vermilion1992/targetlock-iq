import { describe, expect, it } from "vitest";
import { createLibraryWithHole, buildBlankProject } from "../hole-library";
import { activatePlannerPlanForExecution } from "../execution-bridge";
import { completePlannerExecution } from "../plan-completion";
import { guardLockedPlanEdit } from "../plan-lock";
import {
  buildPlanRevisionLineage,
  canEditPlannerPlan,
  createPlannerRevision,
  plannerPlanEditBlockedReason,
} from "../plan-revision";
import { buildHolePlanningReportData } from "../planner-report-data";
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
    actualRecords: overrides.actualRecords ?? [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 50, dip: -60.5, azimuth: 90.5 },
    ],
    plannerMeta: meta,
    ...overrides,
  };
}

describe("plan-revision", () => {
  it("creating revision increments planRevision", () => {
    const hole = plannerHole({
      holeId: "r1",
      holeName: "R1",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    const lib = createLibraryWithHole(hole);
    const result = createPlannerRevision(lib, "r1", { reason: "Target moved" });
    expect(result!.revisionHole.plannerMeta?.planRevision).toBe(2);
    expect(result!.revisionHole.plannerMeta?.revisionReason).toBe("Target moved");
  });

  it("creating revision clears approval, lockedPlan, activation, completion, and actualRecords", () => {
    const hole = plannerHole({
      holeId: "r2",
      holeName: "R2",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
        approvedBy: "Geo",
        approvedAt: "2026-06-01T00:00:00.000Z",
      },
    });
    let lib = createLibraryWithHole(hole);
    lib = activatePlannerPlanForExecution(lib, "r2")!;
    const result = createPlannerRevision(lib, "r2");
    const rev = result!.revisionHole;
    expect(rev.plannerMeta?.lockedPlan).toBeUndefined();
    expect(rev.plannerMeta?.approvalSnapshot).toBeUndefined();
    expect(rev.plannerMeta?.executionStatus).toBeUndefined();
    expect(rev.plannerMeta?.completionSnapshot).toBeUndefined();
    expect(rev.plannerMeta?.activatedFromPlannerAt).toBeUndefined();
    expect(rev.actualRecords).toHaveLength(1);
  });

  it("original approved/active/completed plan is not mutated by revision", () => {
    const hole = plannerHole({
      holeId: "r3",
      holeName: "R3",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    let lib = createLibraryWithHole(hole);
    lib = activatePlannerPlanForExecution(lib, "r3")!;
    const sourceLocked = lib.holes[0]!.plannerMeta!.lockedPlan!.planHash;
    const sourceActuals = lib.holes[0]!.actualRecords.length;
    const result = createPlannerRevision(lib, "r3");
    const source = result!.sourceHole;
    expect(source.plannerMeta?.lockedPlan?.planHash).toBe(sourceLocked);
    expect(source.actualRecords).toHaveLength(sourceActuals);
    expect(source.plannerMeta?.nextRevisionHoleId).toBe(
      result!.revisionHole.holeId
    );
  });

  it("revision from completed plan works", () => {
    const hole = plannerHole({
      holeId: "r4",
      holeName: "R4",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    let lib = createLibraryWithHole(hole);
    lib = activatePlannerPlanForExecution(lib, "r4")!;
    lib = completePlannerExecution(lib, "r4")!.library;
    const result = createPlannerRevision(lib, "r4");
    expect(result).not.toBeNull();
    expect(result!.sourceHole.plannerMeta?.status).toBe("completed");
    expect(result!.revisionHole.plannerMeta?.status).toBe("draft");
  });

  it("edit guard allows draft/planned", () => {
    expect(
      canEditPlannerPlan(
        plannerHole({
          holeId: "e1",
          holeName: "E1",
          plannerMeta: {
            coordinateMode: "collar-relative",
            northReference: "grid",
            plannedAt: "2026-01-01T00:00:00.000Z",
            createdFromPlanner: true,
            status: "draft",
          },
        })
      )
    ).toBe(true);
    expect(
      canEditPlannerPlan(
        plannerHole({
          holeId: "e2",
          holeName: "E2",
          plannerMeta: {
            coordinateMode: "collar-relative",
            northReference: "grid",
            plannedAt: "2026-01-01T00:00:00.000Z",
            createdFromPlanner: true,
            status: "planned",
          },
        })
      )
    ).toBe(true);
  });

  it("edit guard blocks approved/active/completed/archived", () => {
    for (const status of ["approved", "active", "completed", "archived"] as const) {
      const hole = plannerHole({
        holeId: `e-${status}`,
        holeName: status,
        plannerMeta: {
          coordinateMode: "collar-relative",
          northReference: "grid",
          plannedAt: "2026-01-01T00:00:00.000Z",
          createdFromPlanner: true,
          status,
        },
      });
      expect(canEditPlannerPlan(hole)).toBe(false);
      expect(plannerPlanEditBlockedReason(hole)).toBeTruthy();
    }
  });

  it("active hole still allows actual survey updates via guardLockedPlanEdit", () => {
    const hole = plannerHole({
      holeId: "r5",
      holeName: "R5",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    let lib = createLibraryWithHole(hole);
    lib = activatePlannerPlanForExecution(lib, "r5")!;
    const active = lib.holes[0]!;
    expect(guardLockedPlanEdit(active, "planRecords")).toContain("revision");
    expect(guardLockedPlanEdit(active, "target")).toContain("revision");
    expect(guardLockedPlanEdit(active, "planCorridor")).toContain("revision");
  });

  it("revision lineage returns previous/current/next", () => {
    const hole = plannerHole({
      holeId: "r6",
      holeName: "R6",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    let lib = createLibraryWithHole(hole);
    const rev1 = createPlannerRevision(lib, "r6")!;
    const rev1Approved = {
      ...rev1.revisionHole,
      plannerMeta: {
        ...rev1.revisionHole.plannerMeta!,
        status: "approved" as const,
      },
    };
    lib = {
      ...rev1.library,
      holes: rev1.library.holes.map((h) =>
        h.holeId === rev1Approved.holeId ? rev1Approved : h
      ),
    };
    const rev2 = createPlannerRevision(lib, rev1Approved.holeId)!;
    const lineage = buildPlanRevisionLineage(
      rev2.library,
      rev2.revisionHole.holeId
    );
    expect(lineage).not.toBeNull();
    expect(lineage!.previous).toHaveLength(2);
    expect(lineage!.current.holeId).toBe(rev2.revisionHole.holeId);
    expect(lineage!.next).toBeNull();
    const rootLineage = buildPlanRevisionLineage(rev2.library, "r6");
    expect(rootLineage!.next?.holeId).toBe(rev1.revisionHole.holeId);
    expect(rev1.sourceHole.plannerMeta?.nextRevisionHoleId).toBe(
      rev1.revisionHole.holeId
    );
  });

  it("reports include revision lineage", () => {
    const hole = plannerHole({
      holeId: "r7",
      holeName: "R7",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    let lib = createLibraryWithHole(hole);
    const rev = createPlannerRevision(lib, "r7")!;
    const report = buildHolePlanningReportData(
      rev.library,
      rev.revisionHole.holeId
    );
    expect(report?.revisionLineage).toContain("R7");
    expect(report?.revisionLineage).toContain("R2");
  });
});
