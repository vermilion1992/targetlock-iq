import { describe, expect, it } from "vitest";
import {
  createLibraryWithHole,
  buildBlankProject,
  upsertHole,
} from "../hole-library";
import {
  buildLockedPlanSnapshot,
  getPlanLockStatus,
  guardLockedPlanEdit,
  hasPlanDriftedSinceLock,
  resolvePlanLockStatus,
  summarizePlanLockStatus,
} from "../plan-lock";
import { activatePlannerPlanForExecution } from "../execution-bridge";
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
    actualRecords: [{ md: 0, dip: -60, azimuth: 90 }],
    plannerMeta: meta,
    ...overrides,
  };
}

describe("plan-lock", () => {
  it("buildLockedPlanSnapshot captures plan records and hash", () => {
    const hole = plannerHole({ holeId: "a", holeName: "A" });
    const lib = createLibraryWithHole(hole);
    const snap = buildLockedPlanSnapshot(hole, lib, { now: "2026-06-01T00:00:00.000Z" });
    expect(snap).not.toBeNull();
    expect(snap!.planRecords).toHaveLength(2);
    expect(snap!.planRevision).toBe(1);
    expect(snap!.qaSummary).toBeTruthy();
  });

  it("detects plan drift after lock", () => {
    const hole = plannerHole({
      holeId: "b",
      holeName: "B",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    let lib = createLibraryWithHole(hole);
    lib = activatePlannerPlanForExecution(lib, "b")!;
    const saved = lib.holes[0]!;
    expect(hasPlanDriftedSinceLock(saved)).toBe(false);

    const drifted: SavedHoleProject = {
      ...saved,
      planRecords: [
        ...saved.planRecords,
        { md: 400, dip: -63, azimuth: 93 },
      ],
    };
    expect(hasPlanDriftedSinceLock(drifted)).toBe(true);
    expect(resolvePlanLockStatus(drifted).state).toBe("plan-changed");
  });

  it("getPlanLockStatus returns locked-current after approved activation", () => {
    const hole = plannerHole({
      holeId: "d",
      holeName: "D",
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
    lib = approvePlannerPlan(lib, "d", {
      approvedBy: "Geologist",
      snapshot,
    })!;
    lib = activatePlannerPlanForExecution(lib, "d")!;
    const saved = lib.holes[0]!;
    expect(getPlanLockStatus(saved, lib).state).toBe("locked-current");
    expect(summarizePlanLockStatus(saved, lib).label).toBe("Approved plan locked");
  });

  it("getPlanLockStatus returns locked-stale when approval drifts after lock", () => {
    const hole = plannerHole({
      holeId: "e",
      holeName: "E",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
        projectCoordinateSystem: {
          mode: "grid",
        },
      },
    });
    let lib = createLibraryWithHole(hole);
    const snapshot = buildPlannerApprovalSnapshot(hole, lib, {
      approvedBy: "Geologist",
    });
    lib = approvePlannerPlan(lib, "e", {
      approvedBy: "Geologist",
      snapshot,
    })!;
    lib = activatePlannerPlanForExecution(lib, "e")!;
    const saved = lib.holes[0]!;
    lib = upsertHole(lib, {
      ...saved,
      plannerMeta: {
        ...saved.plannerMeta!,
        projectCoordinateSystem: {
          mode: "gps",
        },
      },
    });
    const mutated = lib.holes[0]!;
    expect(getPlanLockStatus(mutated, lib).state).toBe("locked-stale");
    expect(summarizePlanLockStatus(mutated, lib).label).toBe("Approval stale");
  });

  it("non-planner hole returns no-lock", () => {
    const hole = buildBlankProject("Field", "Site", "field-1");
    const lib = createLibraryWithHole(hole);
    expect(getPlanLockStatus(hole, lib).state).toBe("no-lock");
  });

  it("guardLockedPlanEdit blocks plan mutation on active hole", () => {
    const hole = plannerHole({
      holeId: "c",
      holeName: "C",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "active",
        lockedPlan: {
          lockedAt: "2026-06-01T00:00:00.000Z",
          planHash: "abc",
          planRevision: 1,
          planRecords: [{ md: 0, dip: -60, azimuth: 90 }],
          target: buildBlankProject("C", "Site", "c").target,
        },
      },
    });
    expect(guardLockedPlanEdit(hole, "planRecords")).toContain("revision");
    expect(guardLockedPlanEdit(hole, "target")).toContain("revision");
    expect(guardLockedPlanEdit(buildBlankProject("X", "", "x"), "planRecords")).toBeNull();
  });
});
