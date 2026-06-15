import { describe, expect, it } from "vitest";
import { createLibraryWithHole, buildBlankProject, upsertHole } from "../hole-library";
import {
  activatePlannerPlan,
  approvePlannerPlan,
  canTransitionStatus,
  guardApprovedEdit,
  isPlannerCreatedHole,
  migratePlannerMeta,
  requiresBackwardConfirmation,
  transitionPlannerStatus,
} from "../planner-status";
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

describe("planner-status", () => {
  it("identifies planner-created holes", () => {
    const hole = plannerHole({ holeId: "a", holeName: "A" });
    expect(isPlannerCreatedHole(hole)).toBe(true);
    expect(isPlannerCreatedHole(buildBlankProject("X", "", "x"))).toBe(false);
  });

  it("allows valid forward transitions and blocks invalid ones", () => {
    expect(canTransitionStatus("draft", "planned")).toBe(true);
    expect(canTransitionStatus("planned", "approved")).toBe(true);
    expect(canTransitionStatus("approved", "active")).toBe(true);
    expect(canTransitionStatus("active", "completed")).toBe(true);
    expect(canTransitionStatus("draft", "active")).toBe(false);
    expect(canTransitionStatus("planned", "completed")).toBe(false);
  });

  it("flags backward transitions that need confirmation", () => {
    expect(requiresBackwardConfirmation("approved", "draft")).toBe(true);
    expect(requiresBackwardConfirmation("active", "planned")).toBe(true);
    expect(requiresBackwardConfirmation("approved", "archived")).toBe(false);
  });

  it("approve transitions planned to approved with timestamp", () => {
    const hole = plannerHole({
      holeId: "p1",
      holeName: "P1",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "planned",
      },
    });
    const lib = createLibraryWithHole(hole);
    const next = approvePlannerPlan(lib, "p1", "Geologist");
    expect(next).not.toBeNull();
    const saved = next!.holes.find((h) => h.holeId === "p1");
    expect(saved?.plannerMeta?.status).toBe("approved");
    expect(saved?.plannerMeta?.approvedBy).toBe("Geologist");
    expect(saved?.plannerMeta?.approvedAt).toBeTruthy();
  });

  it("activate preserves planRecords and sets activeHoleId", () => {
    const planRecords = [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 300, dip: -62, azimuth: 92 },
    ];
    const hole = plannerHole({
      holeId: "p1",
      holeName: "P1",
      planRecords,
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    const lib = createLibraryWithHole(
      buildBlankProject("Other", "", "other-1")
    );
    const withPlan = upsertHole(lib, hole);
    const next = activatePlannerPlan(withPlan, "p1");
    expect(next).not.toBeNull();
    expect(next!.activeHoleId).toBe("p1");
    const saved = next!.holes.find((h) => h.holeId === "p1");
    expect(saved?.planRecords).toEqual(planRecords);
    expect(saved?.plannerMeta?.status).toBe("active");
  });

  it("guardApprovedEdit blocks editing approved plans", () => {
    const hole = plannerHole({
      holeId: "p1",
      holeName: "P1",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    expect(guardApprovedEdit(hole)).toContain("approved");
    expect(
      guardApprovedEdit({
        ...hole,
        plannerMeta: { ...hole.plannerMeta!, status: "draft" },
      })
    ).toBeNull();
  });

  it("migratePlannerMeta backfills Phase 1 holes", () => {
    const legacy = {
      ...buildBlankProject("Legacy", "Site", "legacy-1"),
      plannerMeta: {
        coordinateMode: "collar-relative" as const,
        northReference: "grid" as const,
        plannedAt: "2025-06-01T00:00:00.000Z",
      },
    } as SavedHoleProject;
    const migrated = migratePlannerMeta(legacy);
    expect(migrated.plannerMeta?.createdFromPlanner).toBe(true);
    expect(migrated.plannerMeta?.status).toBe("planned");
    expect(migrated.plannerMeta?.planRevision).toBe(1);
  });

  it("transitionPlannerStatus returns null for invalid move", () => {
    const hole = plannerHole({ holeId: "p1", holeName: "P1" });
    expect(transitionPlannerStatus(hole, "active")).toBeNull();
  });
});
