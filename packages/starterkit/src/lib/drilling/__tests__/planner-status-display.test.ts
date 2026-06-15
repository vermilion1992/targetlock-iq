import { describe, expect, it } from "vitest";
import { createLibraryWithHole } from "../hole-library";
import { buildBlankProject } from "../hole-library";
import {
  getAllowedPlannerActions,
  getPlannerStatusDisplay,
  PLANNER_ACTION_LABELS,
} from "../planner-status-display";
import type { PlannerProjectMetadata } from "../planner-types";

function plannerHole(id: string, name: string, meta: Partial<PlannerProjectMetadata> = {}) {
  return {
    ...buildBlankProject(name, "Camp", id),
    planRecords: [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 300, dip: -62, azimuth: 92 },
    ],
    target: { e: 100, n: 200, d: 50, md: 300, tolerance: 6, maxDls: 3, nextInterval: 30 },
    plannerMeta: {
      coordinateMode: "collar-relative" as const,
      northReference: "grid" as const,
      plannedAt: "2026-01-01T00:00:00.000Z",
      createdFromPlanner: true,
      status: "planned" as const,
      programId: "prog-1",
      programName: "Test Program",
      collar: { easting: 100, northing: 200, elevation: 50 },
      ...meta,
    },
  };
}

describe("planner-status-display", () => {
  it("returns lifecycle labels for planned status", () => {
    const lib = createLibraryWithHole(plannerHole("p1", "H1"));
    const display = getPlannerStatusDisplay(lib.holes[0]!, lib);
    expect(display.label).toBe("Planned");
    expect(display.status).toBe("planned");
  });

  it("includes approve action for planned holes", () => {
    const lib = createLibraryWithHole(plannerHole("p1", "H1"));
    const actions = getAllowedPlannerActions(lib.holes[0]!, lib);
    expect(actions).toContain("approve");
    expect(actions).toContain("review");
    expect(actions).not.toContain("activate");
  });

  it("includes activate for approved holes", () => {
    const lib = createLibraryWithHole(
      plannerHole("p1", "H1", { status: "approved", approvedAt: "2026-01-01T00:00:00.000Z" })
    );
    const actions = getAllowedPlannerActions(lib.holes[0]!, lib);
    expect(actions).toContain("activate");
    expect(actions).toContain("create-revision");
  });

  it("uses consistent action labels", () => {
    expect(PLANNER_ACTION_LABELS.approve).toBe("Approve");
    expect(PLANNER_ACTION_LABELS["create-revision"]).toBe("Create revision");
  });

  it("shows revised display for superseded execution state", () => {
    const lib = createLibraryWithHole(
      plannerHole("p1", "H1", {
        status: "completed",
        executionStatus: { state: "revised" },
      })
    );
    const display = getPlannerStatusDisplay(lib.holes[0]!, lib);
    expect(display.status).toBe("revised");
    expect(display.label).toBe("Revised");
  });

  it("blocks edit actions for approved holes via getAllowedPlannerActions", () => {
    const lib = createLibraryWithHole(
      plannerHole("p1", "H1", { status: "approved", approvedAt: "2026-01-01T00:00:00.000Z" })
    );
    const actions = getAllowedPlannerActions(lib.holes[0]!, lib);
    expect(actions).toContain("create-revision");
    expect(actions).not.toContain("approve");
  });
});
