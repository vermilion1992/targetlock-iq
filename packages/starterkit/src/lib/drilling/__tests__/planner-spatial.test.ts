import { describe, expect, it } from "vitest";
import {
  createLibraryWithHole,
  upsertHole,
  type HoleLibrary,
} from "../hole-library";
import {
  applyCollarlessDisplaySpread,
  buildPlannerMapModel,
  collectSpatialWarnings,
  programMapBounds,
  selectRelatedHoleIds,
} from "../planner-spatial";
import type { PlannerProjectMetadata } from "../planner-types";
import type { SavedHoleProject } from "../storage";
import { buildBlankProject } from "../hole-library";

function plannerHole(
  id: string,
  name: string,
  meta: Partial<PlannerProjectMetadata> & {
    status?: PlannerProjectMetadata["status"];
  } = {},
  extra: Partial<SavedHoleProject> = {}
): SavedHoleProject {
  return {
    ...buildBlankProject(name, "Camp", id),
    planRecords: [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 300, dip: -62, azimuth: 92 },
    ],
    actualRecords: [{ md: 0, dip: -60, azimuth: 90 }],
    plannerMeta: {
      coordinateMode: meta.coordinateMode ?? "collar-relative",
      northReference: "grid",
      plannedAt: "2026-01-01T00:00:00.000Z",
      createdFromPlanner: true,
      status: meta.status ?? "planned",
      programId: meta.programId ?? "prog-1",
      programName: meta.programName ?? "Test Program",
      planType: meta.planType,
      collar: meta.collar,
      projectCoordinateSystem: meta.projectCoordinateSystem,
    },
    holeRole: meta.planType === "daughter" ? "daughter" : "standard",
    parentHoleId: extra.parentHoleId,
    parentHoleName: extra.parentHoleName,
    kickoffMd: extra.kickoffMd,
    ...extra,
  };
}

function buildMotherDaughterLib(): HoleLibrary {
  const mother = {
    ...buildBlankProject("DDH-MOTHER", "Camp", "mother-1"),
    planRecords: [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 400, dip: -65, azimuth: 95 },
    ],
    actualRecords: [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 200, dip: -62, azimuth: 92 },
      { md: 400, dip: -65, azimuth: 95 },
    ],
    plannerMeta: {
      coordinateMode: "grid" as const,
      northReference: "grid" as const,
      plannedAt: "2026-01-01T00:00:00.000Z",
      createdFromPlanner: true,
      status: "active" as const,
      programId: "prog-1",
      programName: "Prog",
      planType: "standard" as const,
      collar: { easting: 1000, northing: 2000, elevation: 100 },
    },
  };

  const daughter = plannerHole(
    "daughter-1",
    "DDH-MOTHERA",
    { programId: "prog-1", programName: "Prog", planType: "daughter" },
    {
      parentHoleId: "mother-1",
      parentHoleName: "DDH-MOTHER",
      kickoffMd: 200,
      planRecords: [
        { md: 200, dip: -65, azimuth: 110 },
        { md: 350, dip: -58, azimuth: 115 },
      ],
    }
  );

  let lib = createLibraryWithHole(mother);
  lib = upsertHole(lib, daughter);
  return lib;
}

describe("planner-spatial", () => {
  it("missing coordinate metadata returns warnings", () => {
    const hole = plannerHole("p1", "H1", {
      coordinateMode: "grid",
      programId: "prog-1",
    });
    const lib = createLibraryWithHole(hole);
    const warnings = collectSpatialWarnings(hole, lib);
    expect(warnings.some((w) => w.toLowerCase().includes("collar"))).toBe(true);
  });

  it("daughter kickoff appears as spatial node under mother", () => {
    const lib = buildMotherDaughterLib();
    const model = buildPlannerMapModel(lib, "prog-1");
    expect(model).not.toBeNull();

    const daughterLayer = model!.layers.find((l) => l.holeId === "daughter-1");
    expect(daughterLayer).toBeDefined();
    expect(daughterLayer!.kickoff).not.toBeNull();
    expect(daughterLayer!.motherTrace?.length).toBeGreaterThan(0);
    expect(daughterLayer!.trace.length).toBeGreaterThan(0);
  });

  it("archived holes are hidden by default in map model", () => {
    let lib = createLibraryWithHole(
      plannerHole("p1", "H1", { programId: "prog-1", status: "planned" })
    );
    lib = upsertHole(
      lib,
      plannerHole("p2", "H2", { programId: "prog-1", status: "archived" })
    );
    const model = buildPlannerMapModel(lib, "prog-1");
    expect(model!.layers).toHaveLength(1);
    expect(model!.layers[0]!.holeId).toBe("p1");
  });

  it("keeps target depth in the same frame as the trace for grid collars", () => {
    const hole = plannerHole("p1", "H1", {
      coordinateMode: "grid",
      programId: "prog-1",
      collar: { easting: 500000, northing: 7000000, elevation: 420 },
    });
    hole.target = {
      ...hole.target,
      e: 50,
      n: 10,
      d: 280,
      tolerance: 15,
    };
    const lib = createLibraryWithHole(hole);
    const model = buildPlannerMapModel(lib, "prog-1");
    const layer = model!.layers[0]!;

    // Map frame d = depth below the RL-0 datum: the RL 420 collar sits at
    // d = -420 and the target 280 m below the collar at d = 280 - 420.
    // Targets must share the trace frame or 3D/DXF consumers render them
    // hundreds of metres away from the hole bottom.
    expect(layer.trace[0]!.d).toBeCloseTo(-420, 6);
    expect(layer.target.d).toBeCloseTo(280 - 420, 6);
    expect(layer.target.e).toBeCloseTo(500050, 6);
  });

  it("preserves true vertical separation for collars at different RLs", () => {
    // Two vertical-ish holes on the same E/N; collar B is 100 m higher.
    // At any common depth-below-own-collar, hole B's stations sit 100 m
    // above hole A's in the shared frame (frame d smaller by 100).
    const holeA = plannerHole("rl-a", "RL-A", {
      coordinateMode: "grid",
      programId: "prog-rl",
      collar: { easting: 500000, northing: 7000000, elevation: 400 },
    });
    const holeB = plannerHole("rl-b", "RL-B", {
      coordinateMode: "grid",
      programId: "prog-rl",
      collar: { easting: 500000, northing: 7000000, elevation: 500 },
    });
    let lib = createLibraryWithHole(holeA);
    lib = upsertHole(lib, holeB);

    const model = buildPlannerMapModel(lib, "prog-rl");
    const layerA = model!.layers.find((l) => l.holeId === "rl-a")!;
    const layerB = model!.layers.find((l) => l.holeId === "rl-b")!;

    // Identical plans, so local d matches station-for-station.
    expect(layerA.trace.length).toBe(layerB.trace.length);
    layerA.trace.forEach((sa, i) => {
      const sb = layerB.trace[i]!;
      expect(sa.d - sb.d).toBeCloseTo(100, 6);
    });
    // Collar stations at true RLs (frame d = -RL).
    expect(layerA.trace[0]!.d).toBeCloseTo(-400, 6);
    expect(layerB.trace[0]!.d).toBeCloseTo(-500, 6);
  });

  it("relationship selection returns mother + daughters", () => {
    const lib = buildMotherDaughterLib();
    const related = selectRelatedHoleIds("daughter-1", lib, "prog-1");
    expect(related).toContain("mother-1");
    expect(related).toContain("daughter-1");

    const fromMother = selectRelatedHoleIds("mother-1", lib, "prog-1");
    expect(fromMother).toContain("mother-1");
    expect(fromMother).toContain("daughter-1");
  });

  it("map bounds do not pull grid programs toward world origin", () => {
    const hole = plannerHole("p1", "H1", {
      coordinateMode: "grid",
      programId: "prog-grid",
      collar: { easting: 500000, northing: 7000000, elevation: 420 },
    });
    const lib = createLibraryWithHole(hole);
    const model = buildPlannerMapModel(lib, "prog-grid");
    const b = programMapBounds(model!.layers);
    expect(b.minX).toBeGreaterThan(400000);
    expect(b.minY).toBeGreaterThan(6_900_000);
    expect(b.maxX).toBeLessThan(600000);
  });

  it("fans collarless holes apart for display when they share the origin", () => {
    let lib = createLibraryWithHole(
      plannerHole("p1", "H1", { programId: "prog-local", coordinateMode: "collar-relative" })
    );
    lib = upsertHole(
      lib,
      plannerHole("p2", "H2", { programId: "prog-local", coordinateMode: "collar-relative" })
    );
    const model = buildPlannerMapModel(lib, "prog-local");
    const a = model!.layers.find((l) => l.holeId === "p1")!;
    const b = model!.layers.find((l) => l.holeId === "p2")!;
    expect(Math.hypot(a.trace[0]!.e - b.trace[0]!.e, a.trace[0]!.n - b.trace[0]!.n)).toBeGreaterThan(
      20
    );
    expect(model!.programWarnings.some((w) => w.includes("fanned for display"))).toBe(true);
  });

  it("applyCollarlessDisplaySpread returns null when collars separate holes", () => {
    const model = buildPlannerMapModel(
      createLibraryWithHole(
        plannerHole("p1", "H1", {
          programId: "prog-grid",
          coordinateMode: "grid",
          collar: { easting: 500000, northing: 7000000, elevation: 420 },
        })
      ),
      "prog-grid"
    );
    expect(applyCollarlessDisplaySpread(model!.layers)).toBeNull();
  });
});
