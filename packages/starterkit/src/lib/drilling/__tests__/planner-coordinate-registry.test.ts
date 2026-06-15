import { describe, expect, it } from "vitest";
import { createLibraryWithHole, upsertHole } from "../hole-library";
import { buildBlankProject } from "../hole-library";
import {
  buildProgramCollarRows,
  buildDaughterKickoffRows,
  evaluateCollarCoordinateStatus,
  evaluateTargetCoordinateStatus,
  GPS_COORDINATE_HONESTY_WARNING,
  evaluateCoordinateWarnings,
} from "../planner-coordinate-registry";
import type { PlannerProjectMetadata } from "../planner-types";

function plannerHole(
  id: string,
  meta: Partial<PlannerProjectMetadata> = {}
) {
  return {
    ...buildBlankProject(id, "Camp", id),
    planRecords: [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 300, dip: -62, azimuth: 92 },
    ],
    target: { md: 300, e: 100, n: 50, d: 200, tolerance: 6, maxDls: 3, nextInterval: 30 },
    plannerMeta: {
      coordinateMode: "grid" as const,
      northReference: "grid" as const,
      plannedAt: "2026-01-01T00:00:00.000Z",
      createdFromPlanner: true,
      status: "planned" as const,
      programId: "prog-1",
      programName: "Test Program",
      collar: { easting: 500000, northing: 7000000, elevation: 400 },
      ...meta,
    },
  };
}

describe("planner-coordinate-registry", () => {
  it("evaluates collar complete for grid mode with collar", () => {
    const hole = plannerHole("h1");
    expect(evaluateCollarCoordinateStatus(hole)).toBe("complete");
  });

  it("evaluates collar-relative as complete without grid collar", () => {
    const hole = plannerHole("h1", {
      coordinateMode: "collar-relative",
      collar: undefined,
    });
    expect(evaluateCollarCoordinateStatus(hole)).toBe("complete");
  });

  it("evaluates grid mode missing collar as missing", () => {
    const hole = plannerHole("h1", { collar: undefined });
    expect(evaluateCollarCoordinateStatus(hole)).toBe("missing");
  });

  it("builds collar rows with coordinate mode columns", () => {
    let lib = createLibraryWithHole(plannerHole("p1"));
    lib = upsertHole(lib, plannerHole("p2"));
    const rows = buildProgramCollarRows(lib, "prog-1");
    expect(rows).toHaveLength(2);
    expect(rows[0].coordinateMode).toBe("grid");
    expect(rows[0].easting).toBe(500000);
  });

  it("includes GPS honesty warning when GPS without EPSG", () => {
    const hole = plannerHole("h1", {
      coordinateMode: "gps",
      collar: {
        easting: 0,
        northing: 0,
        elevation: 0,
        latitude: -25,
        longitude: 133,
      },
      projectCoordinateSystem: { mode: "gps" },
    });
    const lib = createLibraryWithHole(hole);
    const warnings = evaluateCoordinateWarnings(hole, lib);
    expect(warnings.some((w) => w.includes(GPS_COORDINATE_HONESTY_WARNING))).toBe(true);
  });

  it("builds daughter kickoff rows with mother survey flag", () => {
    const mother = {
      ...buildBlankProject("m1", "Camp", "m1"),
      actualRecords: [{ md: 0, dip: -60, azimuth: 90 }, { md: 500, dip: -62, azimuth: 91 }],
      plannerMeta: {
        coordinateMode: "grid" as const,
        northReference: "grid" as const,
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "active" as const,
        programId: "prog-1",
        programName: "Test Program",
        collar: { easting: 500000, northing: 7000000, elevation: 400 },
      },
    };
    const daughter = {
      ...buildBlankProject("d1", "Camp", "d1"),
      parentHoleId: "m1",
      parentHoleName: "m1",
      kickoffMd: 200,
      kickoffE: 10,
      kickoffN: 5,
      kickoffD: 50,
      kickoffDip: -65,
      kickoffAzimuth: 95,
      holeRole: "daughter" as const,
      planRecords: [
        { md: 200, dip: -65, azimuth: 95 },
        { md: 350, dip: -66, azimuth: 96 },
      ],
      target: { md: 350, e: 80, n: 40, d: 120, tolerance: 6, maxDls: 3, nextInterval: 30 },
      plannerMeta: {
        coordinateMode: "collar-relative" as const,
        northReference: "grid" as const,
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "planned" as const,
        planType: "daughter" as const,
        programId: "prog-1",
        programName: "Test Program",
      },
    };
    let lib = createLibraryWithHole(mother);
    lib = upsertHole(lib, daughter);
    const rows = buildDaughterKickoffRows(lib, "prog-1");
    expect(rows).toHaveLength(1);
    expect(rows[0].motherSurveyMissing).toBe(false);
    expect(rows[0].kickoffGridE).not.toBeNull();
  });
});
