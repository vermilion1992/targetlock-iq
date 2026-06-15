import { describe, expect, it } from "vitest";
import { buildStraightPlan } from "../planner";
import {
  buildBlankProject,
  createLibraryWithHole,
  upsertHole,
} from "../hole-library";
import {
  buildClearancePairs,
  classifyClearanceDistance,
  classifySeparationFactor,
  closestApproach,
} from "../planner-clearance";
import { buildStations } from "../desurvey";
import { getPlannerMapFramePath } from "../planner-spatial";
import { DEFAULT_PLANNER_QA_SETTINGS } from "../planner-qa";
import type { PlannerProjectMetadata } from "../planner-types";

function plannerMeta(
  overrides: Partial<PlannerProjectMetadata> = {}
): PlannerProjectMetadata {
  return {
    coordinateMode: "grid",
    northReference: "grid",
    plannedAt: "2026-01-01T00:00:00.000Z",
    createdFromPlanner: true,
    status: "planned",
    programId: "prog-1",
    programName: "Test",
    collar: { easting: 500000, northing: 7000000, elevation: 400 },
    ...overrides,
  };
}

function standardHole(
  id: string,
  name: string,
  collar: { easting: number; northing: number; elevation: number },
  targetEnu: { e: number; n: number; d: number }
) {
  const planRecords = buildStraightPlan({
    startMd: 0,
    startDip: -60,
    startAzimuth: 90,
    startPosition: { e: 0, n: 0, d: 0 },
    targetEnu,
    targetMd: 300,
    surveyInterval: 30,
  });
  return {
    ...buildBlankProject(name, "Site", id),
    planRecords,
    target: {
      md: 300,
      e: targetEnu.e,
      n: targetEnu.n,
      d: targetEnu.d,
      tolerance: 6,
      maxDls: 3,
      nextInterval: 30,
    },
    plannerMeta: plannerMeta({ collar }),
  };
}

describe("planner-clearance", () => {
  it("two planned holes with safe separation return OK", () => {
    let lib = createLibraryWithHole(
      standardHole("h1", "H1", { easting: 500000, northing: 7000000, elevation: 400 }, {
        e: 150,
        n: 0,
        d: 200,
      })
    );
    lib = upsertHole(
      lib,
      standardHole("h2", "H2", { easting: 500200, northing: 7000000, elevation: 400 }, {
        e: 150,
        n: 0,
        d: 200,
      })
    );

    const pairs = buildClearancePairs(lib, "prog-1", DEFAULT_PLANNER_QA_SETTINGS);
    const stdPair = pairs.find((p) => p.relationship === "standard-standard");
    expect(stdPair).toBeUndefined();
    expect(classifyClearanceDistance(50, 5)).toBe("ok");
  });

  it("two planned holes closer than threshold return risk", () => {
    let lib = createLibraryWithHole(
      standardHole("h1", "H1", { easting: 500000, northing: 7000000, elevation: 400 }, {
        e: 150,
        n: 0,
        d: 200,
      })
    );
    lib = upsertHole(
      lib,
      standardHole("h2", "H2", { easting: 500002, northing: 7000000, elevation: 400 }, {
        e: 150,
        n: 0,
        d: 200,
      })
    );

    const pairs = buildClearancePairs(lib, "prog-1", DEFAULT_PLANNER_QA_SETTINGS);
    const stdPair = pairs.find((p) => p.relationship === "standard-standard");
    expect(stdPair).toBeDefined();
    expect(stdPair!.severity).toBe("risk");
    expect(stdPair!.minDistanceM).toBeLessThan(5);
  });

  it("daughter close to mother at kickoff does not warn", () => {
    const motherActual = [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 300, dip: -62, azimuth: 92 },
    ];
    const mother = {
      ...buildBlankProject("MOTHER", "Site", "mother-1"),
      planRecords: motherActual,
      actualRecords: motherActual,
      plannerMeta: plannerMeta({
        planType: "standard",
        collar: { easting: 500000, northing: 7000000, elevation: 400 },
      }),
    };

    const daughterPlan = buildStraightPlan({
      startMd: 150,
      startDip: -60,
      startAzimuth: 95,
      startPosition: { e: 0, n: 0, d: 0 },
      targetEnu: { e: 80, n: 20, d: 100 },
      targetMd: 350,
      surveyInterval: 30,
    });

    const daughter = {
      ...buildBlankProject("DAUGHTER", "Site", "daughter-1"),
      holeRole: "daughter" as const,
      parentHoleId: "mother-1",
      parentHoleName: "MOTHER",
      kickoffMd: 150,
      planRecords: daughterPlan,
      target: {
        md: 350,
        e: 80,
        n: 20,
        d: 100,
        tolerance: 6,
        maxDls: 3,
        nextInterval: 30,
      },
      plannerMeta: plannerMeta({ planType: "daughter" }),
    };

    let lib = createLibraryWithHole(mother);
    lib = upsertHole(lib, daughter);

    const pairs = buildClearancePairs(lib, "prog-1", {
      ...DEFAULT_PLANNER_QA_SETTINGS,
      motherDaughterKickoffExclusionM: 50,
      minMotherDaughterSeparationM: 3,
    });
    const mdPair = pairs.find((p) => p.relationship === "mother-daughter");
    expect(mdPair).toBeUndefined();
  });

  it("daughter still close to mother after kickoff exclusion warns", () => {
    const motherActual = [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 300, dip: -62, azimuth: 92 },
    ];
    const mother = {
      ...buildBlankProject("MOTHER", "Site", "mother-1"),
      planRecords: motherActual,
      actualRecords: motherActual,
      plannerMeta: plannerMeta({
        planType: "standard",
        collar: { easting: 500000, northing: 7000000, elevation: 400 },
      }),
    };

    const daughterPlan = buildStraightPlan({
      startMd: 150,
      startDip: -60,
      startAzimuth: 92,
      startPosition: { e: 0, n: 0, d: 0 },
      targetEnu: { e: 5, n: 2, d: 50 },
      targetMd: 350,
      surveyInterval: 10,
    });

    const daughter = {
      ...buildBlankProject("DAUGHTER", "Site", "daughter-1"),
      holeRole: "daughter" as const,
      parentHoleId: "mother-1",
      parentHoleName: "MOTHER",
      kickoffMd: 150,
      planRecords: daughterPlan,
      target: {
        md: 350,
        e: 5,
        n: 2,
        d: 50,
        tolerance: 6,
        maxDls: 3,
        nextInterval: 10,
      },
      plannerMeta: plannerMeta({ planType: "daughter" }),
    };

    let lib = createLibraryWithHole(mother);
    lib = upsertHole(lib, daughter);

    const pairs = buildClearancePairs(lib, "prog-1", {
      ...DEFAULT_PLANNER_QA_SETTINGS,
      motherDaughterKickoffExclusionM: 15,
      minMotherDaughterSeparationM: 5,
      sampleIntervalM: 5,
    });
    const mdPair = pairs.find((p) => p.relationship === "mother-daughter");
    expect(mdPair).toBeDefined();
    expect(mdPair!.severity).not.toBe("ok");
  });

  it("sibling daughters too close warn", () => {
    const motherActual = [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 400, dip: -62, azimuth: 92 },
    ];
    const mother = {
      ...buildBlankProject("MOTHER", "Site", "mother-1"),
      planRecords: motherActual,
      actualRecords: motherActual,
      plannerMeta: plannerMeta({
        planType: "standard",
        collar: { easting: 500000, northing: 7000000, elevation: 400 },
      }),
    };

    const daughterAPlan = buildStraightPlan({
      startMd: 200,
      startDip: -60,
      startAzimuth: 100,
      startPosition: { e: 0, n: 0, d: 0 },
      targetEnu: { e: 100, n: 10, d: 80 },
      targetMd: 400,
      surveyInterval: 20,
    });
    const daughterBPlan = buildStraightPlan({
      startMd: 200,
      startDip: -60,
      startAzimuth: 102,
      startPosition: { e: 0, n: 0, d: 0 },
      targetEnu: { e: 102, n: 12, d: 80 },
      targetMd: 400,
      surveyInterval: 20,
    });

    const daughterA = {
      ...buildBlankProject("DAUGHTER-A", "Site", "daughter-a"),
      holeRole: "daughter" as const,
      parentHoleId: "mother-1",
      kickoffMd: 200,
      planRecords: daughterAPlan,
      target: { md: 400, e: 100, n: 10, d: 80, tolerance: 6, maxDls: 3, nextInterval: 20 },
      plannerMeta: plannerMeta({ planType: "daughter" }),
    };
    const daughterB = {
      ...buildBlankProject("DAUGHTER-B", "Site", "daughter-b"),
      holeRole: "daughter" as const,
      parentHoleId: "mother-1",
      kickoffMd: 200,
      planRecords: daughterBPlan,
      target: { md: 400, e: 102, n: 12, d: 80, tolerance: 6, maxDls: 3, nextInterval: 20 },
      plannerMeta: plannerMeta({ planType: "daughter" }),
    };

    let lib = createLibraryWithHole(mother);
    lib = upsertHole(lib, daughterA);
    lib = upsertHole(lib, daughterB);

    const pairs = buildClearancePairs(lib, "prog-1", {
      ...DEFAULT_PLANNER_QA_SETTINGS,
      minSiblingDaughterSeparationM: 5,
      sampleIntervalM: 5,
    });
    const sibPair = pairs.find((p) => p.relationship === "daughter-sibling");
    expect(sibPair).toBeDefined();
    expect(sibPair!.severity).not.toBe("ok");
  });

  it("classifySeparationFactor maps thresholds to severities", () => {
    const settings = {
      ...DEFAULT_PLANNER_QA_SETTINGS,
      separationFactorWarn: 5,
      separationFactorRisk: 2,
    };
    expect(classifySeparationFactor(null, settings)).toBe("ok");
    expect(classifySeparationFactor(10, settings)).toBe("ok");
    expect(classifySeparationFactor(3, settings)).toBe("watch");
    expect(classifySeparationFactor(1.2, settings)).toBe("risk");
  });

  it("clearance pairs carry an uncertainty-aware separation factor", () => {
    let lib = createLibraryWithHole(
      standardHole("h1", "H1", { easting: 500000, northing: 7000000, elevation: 400 }, {
        e: 150,
        n: 0,
        d: 200,
      })
    );
    lib = upsertHole(
      lib,
      standardHole("h2", "H2", { easting: 500002, northing: 7000000, elevation: 400 }, {
        e: 150,
        n: 0,
        d: 200,
      })
    );

    const pairs = buildClearancePairs(lib, "prog-1", DEFAULT_PLANNER_QA_SETTINGS);
    const stdPair = pairs.find((p) => p.relationship === "standard-standard");
    expect(stdPair).toBeDefined();
    expect(stdPair!.separationFactor).not.toBeNull();
    expect(stdPair!.separationFactor!).toBeGreaterThan(0);
    expect(stdPair!.combinedRadiusM!).toBeGreaterThan(0);
  });

  it("low separation factor escalates a distance-OK pair to non-ok", () => {
    // Two deep holes that converge to ~8 m apart at depth: distance is above
    // the 5 m threshold, but accumulated uncertainty makes SF small.
    let lib = createLibraryWithHole(
      standardHole(
        "h1",
        "H1",
        { easting: 500000, northing: 7000000, elevation: 400 },
        { e: 400, n: 0, d: 900 }
      )
    );
    lib = upsertHole(
      lib,
      standardHole(
        "h2",
        "H2",
        { easting: 500008, northing: 7000000, elevation: 400 },
        { e: 408, n: 0, d: 900 }
      )
    );
    // Stretch the plans deep so uncertainty accumulates.
    const pairs = buildClearancePairs(lib, "prog-1", {
      ...DEFAULT_PLANNER_QA_SETTINGS,
      separationFactorWarn: 50,
      separationFactorRisk: 10,
    });
    const stdPair = pairs.find((p) => p.relationship === "standard-standard");
    expect(stdPair).toBeDefined();
    expect(stdPair!.severity).not.toBe("ok");
    expect(stdPair!.message).toContain("Separation factor");
  });

  it("mixed collar RLs produce physically correct vertical separation", () => {
    const vertical = (mdEnd: number) => [
      { md: 0, dip: -90, azimuth: 0 },
      { md: mdEnd, dip: -90, azimuth: 0 },
    ];
    // Hole A: collar RL 400, drilled 200 m (occupies RL 400 → 200).
    const holeA = {
      ...buildBlankProject("RL-LOW", "Site", "rl-low"),
      planRecords: vertical(200),
      target: { md: 200, e: 0, n: 0, d: 200, tolerance: 6, maxDls: 3, nextInterval: 30 },
      plannerMeta: plannerMeta({
        collar: { easting: 500000, northing: 7000000, elevation: 400 },
      }),
    };
    // Hole B: collar RL 600 just 5 m east, drilled 100 m (occupies RL 600 → 500).
    const holeB = {
      ...buildBlankProject("RL-HIGH", "Site", "rl-high"),
      planRecords: vertical(100),
      target: { md: 100, e: 0, n: 0, d: 100, tolerance: 6, maxDls: 3, nextInterval: 30 },
      plannerMeta: plannerMeta({
        collar: { easting: 500005, northing: 7000000, elevation: 600 },
      }),
    };
    let lib = createLibraryWithHole(holeA);
    lib = upsertHole(lib, holeB);

    // True geometry: hole B bottoms out at RL 500, 100 m above hole A's
    // collar (RL 400), so the closest approach is ~sqrt(100^2 + 5^2).
    // The old additive-RL frame inverted the vertical relationship and
    // reported ~5 m — a false collision.
    const frameA = getPlannerMapFramePath(holeA, lib);
    const frameB = getPlannerMapFramePath(holeB, lib);
    const result = closestApproach(frameA.trace, frameB.trace, {
      sampleIntervalM: 5,
    });
    expect(result.minDistanceM).toBeCloseTo(Math.hypot(100, 5), 0);

    // And clearance evaluation must not flag this pair.
    const pairs = buildClearancePairs(lib, "prog-1", DEFAULT_PLANNER_QA_SETTINGS);
    expect(pairs.find((p) => p.relationship === "standard-standard")).toBeUndefined();
  });

  it("closestApproach computes 3D distance between sampled paths", () => {
    const pathA = buildStations([
      { md: 0, dip: -60, azimuth: 90 },
      { md: 100, dip: -60, azimuth: 90 },
    ]);
    const pathB = buildStations([
      { md: 0, dip: -60, azimuth: 90 },
      { md: 100, dip: -60, azimuth: 90 },
    ]);
    pathB.forEach((s) => {
      s.e += 3;
    });
    const result = closestApproach(pathA, pathB, { sampleIntervalM: 10 });
    expect(result.minDistanceM).toBeCloseTo(3, 0);
  });
});
