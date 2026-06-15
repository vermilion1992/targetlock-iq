import { describe, expect, it } from "vitest";
import { buildBlankProject, createLibraryWithHole } from "../hole-library";
import { checkHoleDrillability } from "../planner-drillability";
import { DEFAULT_PLANNER_QA_SETTINGS } from "../planner-qa";
import type { PlannerProjectMetadata } from "../planner-types";

function plannerMeta(): PlannerProjectMetadata {
  return {
    coordinateMode: "collar-relative",
    northReference: "grid",
    plannedAt: "2026-01-01T00:00:00.000Z",
    createdFromPlanner: true,
    status: "planned",
    programId: "prog-1",
    programName: "Test",
  };
}

describe("planner-drillability", () => {
  it("flags DLS above max", () => {
    const hole = {
      ...buildBlankProject("H1", "Site", "h1"),
      planRecords: [
        { md: 0, dip: -60, azimuth: 90 },
        { md: 30, dip: -30, azimuth: 180 },
        { md: 60, dip: -60, azimuth: 270 },
      ],
      target: {
        md: 60,
        e: 50,
        n: 20,
        d: 40,
        tolerance: 6,
        maxDls: 3,
        nextInterval: 30,
      },
      plannerMeta: plannerMeta(),
    };
    const lib = createLibraryWithHole(hole);
    const result = checkHoleDrillability(hole, lib, DEFAULT_PLANNER_QA_SETTINGS);
    expect(result.issues.some((i) => i.code === "dls_exceeded")).toBe(true);
  });

  it("blocks non-increasing MD", () => {
    const hole = {
      ...buildBlankProject("H1", "Site", "h1"),
      planRecords: [
        { md: 0, dip: -60, azimuth: 90 },
        { md: 30, dip: -62, azimuth: 92 },
        { md: 25, dip: -63, azimuth: 93 },
      ],
      target: {
        md: 30,
        e: 50,
        n: 20,
        d: 40,
        tolerance: 6,
        maxDls: 3,
        nextInterval: 30,
      },
      plannerMeta: plannerMeta(),
    };
    const lib = createLibraryWithHole(hole);
    const result = checkHoleDrillability(hole, lib, DEFAULT_PLANNER_QA_SETTINGS);
    expect(result.hasHardErrors).toBe(true);
    expect(result.issues.some((i) => i.code === "md_not_increasing")).toBe(true);
  });

  it("blocks missing plan records", () => {
    const hole = {
      ...buildBlankProject("H1", "Site", "h1"),
      planRecords: [],
      target: {
        md: 0,
        e: 0,
        n: 0,
        d: 0,
        tolerance: 6,
        maxDls: 3,
        nextInterval: 30,
      },
      plannerMeta: plannerMeta(),
    };
    const lib = createLibraryWithHole(hole);
    const result = checkHoleDrillability(hole, lib, DEFAULT_PLANNER_QA_SETTINGS);
    expect(result.hasHardErrors).toBe(true);
  });
});
