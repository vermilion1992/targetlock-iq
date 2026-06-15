import { describe, expect, it } from "vitest";
import { buildStraightPlan } from "../planner";
import {
  buildBlankProject,
  createLibraryWithHole,
} from "../hole-library";
import { buildDxf, buildHoleDxf, buildProgramDxf } from "../dxf-export";
import { buildStations } from "../desurvey";
import type { PlannerProjectMetadata } from "../planner-types";

const PLAN = [
  { md: 0, dip: -60, azimuth: 90 },
  { md: 100, dip: -61, azimuth: 91 },
  { md: 200, dip: -62, azimuth: 92 },
];
const ACTUAL = [
  { md: 0, dip: -60, azimuth: 90 },
  { md: 100, dip: -63, azimuth: 94 },
];

describe("buildDxf", () => {
  it("emits a valid skeleton with layers, polylines, and EOF", () => {
    const dxf = buildDxf([
      {
        holeName: "DDH-001",
        plan: buildStations(PLAN),
        actual: buildStations(ACTUAL),
        target: { e: 50, n: 10, d: 150, tolerance: 6 },
      },
    ]);

    expect(dxf).toContain("SECTION");
    expect(dxf).toContain("ENTITIES");
    expect(dxf.trim().endsWith("EOF")).toBe(true);
    expect(dxf).toContain("DDH-001_PLAN");
    expect(dxf).toContain("DDH-001_ACTUAL");
    expect(dxf).toContain("POLYLINE");
    expect(dxf).toContain("SEQEND");
    expect(dxf).toContain("COLLARS");
    expect(dxf).toContain("TARGETS");
    expect(dxf).toContain("CIRCLE");
  });

  it("flips depth sign so Z decreases with depth", () => {
    const stations = buildStations(PLAN);
    const dxf = buildDxf([{ holeName: "H", plan: stations }]);
    const bottom = stations[stations.length - 1]!;
    expect(dxf).toContain((-bottom.d).toFixed(3));
  });

  it("sanitizes layer names", () => {
    const dxf = buildDxf([
      { holeName: "DDH 001/A (rev 2)", plan: buildStations(PLAN) },
    ]);
    expect(dxf).toContain("DDH_001_A_REV_2_PLAN");
  });
});

describe("buildHoleDxf", () => {
  it("includes actual trace only when there are enough records", () => {
    const withActual = buildHoleDxf("H1", PLAN, ACTUAL);
    expect(withActual).toContain("H1_ACTUAL");

    const withoutActual = buildHoleDxf("H1", PLAN, [ACTUAL[0]!]);
    expect(withoutActual).not.toContain("H1_ACTUAL");
  });
});

describe("buildProgramDxf", () => {
  it("exports every hole in the program with framed coordinates", () => {
    const meta: PlannerProjectMetadata = {
      coordinateMode: "grid",
      northReference: "grid",
      plannedAt: "2026-01-01T00:00:00.000Z",
      createdFromPlanner: true,
      status: "planned",
      programId: "prog-1",
      programName: "Test",
      collar: { easting: 500000, northing: 7000000, elevation: 400 },
    };
    const plan = buildStraightPlan({
      startMd: 0,
      startDip: -60,
      startAzimuth: 90,
      startPosition: { e: 0, n: 0, d: 0 },
      targetEnu: { e: 150, n: 0, d: 200 },
      targetMd: 300,
      surveyInterval: 30,
    });
    const lib = createLibraryWithHole({
      ...buildBlankProject("DDH-100", "Site", "h1"),
      planRecords: plan,
      plannerMeta: meta,
    });

    const dxf = buildProgramDxf(lib, "prog-1");
    expect(dxf).not.toBeNull();
    expect(dxf!).toContain("DDH-100_PLAN");
    // Collar easting appears in framed coordinates.
    expect(dxf!).toContain("500000.000");
    // Frame d = depth below the RL-0 datum, so DXF Z = -d is a true RL:
    // the collar vertex sits at its surveyed elevation.
    expect(dxf!).toContain("400.000");
    expect(dxf!).toContain("Z=Elevation/RL");
  });

  it("returns null for an unknown program", () => {
    const lib = createLibraryWithHole(buildBlankProject("X", "Site", "x1"));
    expect(buildProgramDxf(lib, "missing-program")).toBeNull();
  });
});
