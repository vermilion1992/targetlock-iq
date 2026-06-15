import { describe, expect, it } from "vitest";
import { createLibraryWithHole, upsertHole } from "../hole-library";
import { resolveBranchPlannerContext } from "../planner-branch-context";
import type { SavedHoleProject } from "../storage";

function blankHole(
  holeId: string,
  patch: Partial<SavedHoleProject> = {}
): SavedHoleProject {
  return {
    version: 1,
    holeId,
    holeName: holeId,
    siteName: "Test",
    planRecords: [{ md: 0, dip: -60, azimuth: 0 }],
    actualRecords: [
      { md: 0, dip: -60, azimuth: 0 },
      { md: 30, dip: -61, azimuth: 1 },
    ],
    target: { md: 300, e: 0, n: 0, d: 200, tolerance: 8, maxDls: 3, nextInterval: 30 },
    mode: "advanced",
    history: [],
    updatedAt: new Date().toISOString(),
    ...patch,
  };
}

describe("resolveBranchPlannerContext", () => {
  it("returns null without library", () => {
    expect(resolveBranchPlannerContext(blankHole("h1"), null, null)).toBeNull();
  });

  it("allows branch init on non-planner mother", () => {
    const hole = blankHole("mother-1", { holeRole: "mother" });
    const lib = createLibraryWithHole(hole);
    const ctx = resolveBranchPlannerContext(hole, lib, null);
    expect(ctx?.blockBranchInit).toBe(false);
    expect(ctx?.planningReadOnly).toBe(false);
  });

  it("blocks branch init when mother is planner-managed", () => {
    const hole = blankHole("mother-1", {
      holeRole: "mother",
      plannerMeta: {
        createdFromPlanner: true,
        status: "planned",
        programId: "prog-1",
        programName: "RC2 Demo",
        planRevision: 1,
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    const lib = createLibraryWithHole(hole);
    const ctx = resolveBranchPlannerContext(hole, lib, null);
    expect(ctx?.blockBranchInit).toBe(true);
    expect(ctx?.planningReadOnly).toBe(true);
    expect(ctx?.programName).toBe("RC2 Demo");
  });

  it("marks planning read-only when daughter was created in Planner", () => {
    const mother = blankHole("mother-1", {
      holeRole: "mother",
      branchProgram: {
        programId: "bp-1",
        name: "Mother branch",
        site: "Test",
        targets: [],
        daughters: [{ daughterHoleId: "d1", daughterId: "D1", targetId: "t1", kickoffMd: 420, method: "motor-navi", status: "draft" }],
        activeDaughterHoleId: "d1",
      },
    });
    const daughter = blankHole("d1", {
      holeRole: "daughter",
      parentHoleId: "mother-1",
      plannerMeta: {
        createdFromPlanner: true,
        status: "planned",
        programId: "prog-1",
        programName: "Institutional",
        planRevision: 1,
        coordinateMode: "collar-relative",
        northReference: "grid",
        planType: "daughter",
        plannedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    let lib = createLibraryWithHole(mother);
    lib = upsertHole(lib, daughter)!;
    const ctx = resolveBranchPlannerContext(mother, lib, null);
    expect(ctx?.planningReadOnly).toBe(true);
    expect(ctx?.blockBranchInit).toBe(true);
  });

  it("links planner to parent when viewing a planner daughter", () => {
    const mother = blankHole("mother-1", { holeRole: "mother" });
    const daughter = blankHole("d1", {
      holeRole: "daughter",
      parentHoleId: "mother-1",
      plannerMeta: {
        createdFromPlanner: true,
        status: "active",
        programId: "prog-1",
        programName: "Institutional",
        planRevision: 1,
        coordinateMode: "collar-relative",
        northReference: "grid",
        planType: "daughter",
        plannedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    let lib = createLibraryWithHole(mother);
    lib = upsertHole(lib, daughter)!;
    const ctx = resolveBranchPlannerContext(daughter, lib, null);
    expect(ctx?.plannerLinkHoleId).toBe("mother-1");
    expect(ctx?.isPlannerHole).toBe(true);
  });
});
