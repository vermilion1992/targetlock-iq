import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  DEFAULT_PLAN_CORRIDOR,
  allowedPositionOffsetAtMd,
  buildCorridorStatus,
  derivePlanCorridorFromPlan,
} from "../plan-corridor";
import { buildStations } from "../desurvey";
import { dbl } from "./arbitraries";
import type { Recommendation, SurveyRecord } from "../types";

function reco(over: { planOffset: number; label: string }): Recommendation {
  return {
    planOffset: over.planOffset,
    classification: { label: over.label },
  } as unknown as Recommendation;
}

describe("allowedPositionOffsetAtMd — exact widening formula", () => {
  it("equals positionOffsetM + (md/100) * widenPer100m (fuzz)", () => {
    fc.assert(
      fc.property(dbl(0, 20), dbl(0, 5), dbl(0, 3000), (offset, widen, md) => {
        const corridor = { ...DEFAULT_PLAN_CORRIDOR, positionOffsetM: offset, positionWidenPer100m: widen };
        expect(allowedPositionOffsetAtMd(corridor, md)).toBeCloseTo(offset + (md / 100) * widen, 9);
      }),
      { numRuns: 600 }
    );
  });

  it("treats a missing widen factor as zero", () => {
    const corridor = { ...DEFAULT_PLAN_CORRIDOR, positionOffsetM: 4, positionWidenPer100m: undefined };
    expect(allowedPositionOffsetAtMd(corridor, 500)).toBe(4);
  });
});

describe("derivePlanCorridorFromPlan — median and tolerance derivation", () => {
  it("returns base defaults for fewer than two records", () => {
    expect(derivePlanCorridorFromPlan([{ md: 0, dip: -60, azimuth: 0 }])).toEqual({
      ...DEFAULT_PLAN_CORRIDOR,
      intervalM: 30,
    });
  });

  it("takes the median of per-interval lift/drop (odd count)", () => {
    const plan: SurveyRecord[] = [
      { md: 0, dip: -60, azimuth: 0 },
      { md: 30, dip: -59, azimuth: 0 }, // +1
      { md: 60, dip: -57, azimuth: 0 }, // +2
      { md: 90, dip: -54, azimuth: 0 }, // +3
    ];
    const c = derivePlanCorridorFromPlan(plan);
    expect(c.expectedLiftDropDeg).toBe(2);
    expect(c.expectedSwingDeg).toBe(0);
  });

  it("averages the two middle values for an even count", () => {
    const plan: SurveyRecord[] = [
      { md: 0, dip: -60, azimuth: 0 },
      { md: 30, dip: -59, azimuth: 0 }, // +1
      { md: 60, dip: -57, azimuth: 0 }, // +2
      { md: 90, dip: -54, azimuth: 0 }, // +3
      { md: 120, dip: -50, azimuth: 0 }, // +4
    ];
    // lifts [1,2,3,4] -> median 2.5
    expect(derivePlanCorridorFromPlan(plan).expectedLiftDropDeg).toBe(2.5);
  });

  it("adopts the last finite per-record dip/azimuth tolerances", () => {
    const plan: SurveyRecord[] = [
      { md: 0, dip: -60, azimuth: 0 },
      { md: 30, dip: -60, azimuth: 0, dipTolerance: 0.4, aziTolerance: 0.6 },
      { md: 60, dip: -60, azimuth: 0, dipTolerance: 0.5, aziTolerance: 0.7 },
    ];
    const c = derivePlanCorridorFromPlan(plan);
    expect(c.allowedDipDevDeg).toBe(0.5);
    expect(c.allowedAziDevDeg).toBe(0.7);
  });
});

describe("buildCorridorStatus — null guards", () => {
  const planStations = buildStations([
    { md: 0, dip: -60, azimuth: 0 },
    { md: 60, dip: -60, azimuth: 0 },
  ]);
  const actualStations = buildStations([
    { md: 0, dip: -60, azimuth: 0 },
    { md: 30, dip: -60, azimuth: 0 },
  ]);
  const r = reco({ planOffset: 1, label: "On track" });

  it("returns null when corridor, reco, plan, or enough actuals are missing", () => {
    expect(buildCorridorStatus(planStations, actualStations, null, r)).toBeNull();
    expect(buildCorridorStatus(planStations, actualStations, DEFAULT_PLAN_CORRIDOR, null)).toBeNull();
    expect(buildCorridorStatus(planStations, [actualStations[0]!], DEFAULT_PLAN_CORRIDOR, r)).toBeNull();
    expect(buildCorridorStatus([], actualStations, DEFAULT_PLAN_CORRIDOR, r)).toBeNull();
  });
});

describe("buildCorridorStatus — interval and position boundaries", () => {
  // Flat plan so the interpolated planned lift/drop and swing are exactly zero.
  const planStations = buildStations([
    { md: 0, dip: -60, azimuth: 90 },
    { md: 100, dip: -60, azimuth: 90 },
  ]);
  const corridor = {
    ...DEFAULT_PLAN_CORRIDOR,
    allowedDipDevDeg: 0.3,
    allowedAziDevDeg: 0.3,
    positionOffsetM: 100, // large so position never triggers here
    positionWidenPer100m: 0,
  };

  it("dip change exactly at the allowance is inside; just past is outside", () => {
    const inside = buildStations([
      { md: 0, dip: -60, azimuth: 90 },
      { md: 30, dip: -59.7, azimuth: 90 }, // +0.3 == allowance
    ]);
    const outside = buildStations([
      { md: 0, dip: -60, azimuth: 90 },
      { md: 30, dip: -59.69, azimuth: 90 }, // +0.31 > allowance
    ]);
    const r = reco({ planOffset: 1, label: "On track" });
    expect(buildCorridorStatus(planStations, inside, corridor, r)!.latestIntervalInside).toBe(true);
    expect(buildCorridorStatus(planStations, outside, corridor, r)!.latestIntervalInside).toBe(false);
  });

  it("position offset above the allowance flags outsidePlannedCorridor", () => {
    const actual = buildStations([
      { md: 0, dip: -60, azimuth: 90 },
      { md: 30, dip: -60, azimuth: 90 },
    ]);
    const tight = { ...corridor, positionOffsetM: 2, positionWidenPer100m: 0 };
    const within = buildCorridorStatus(planStations, actual, tight, reco({ planOffset: 1.9, label: "On track" }))!;
    const beyond = buildCorridorStatus(planStations, actual, tight, reco({ planOffset: 2.1, label: "On track" }))!;
    expect(within.outsidePlannedCorridor).toBe(false);
    expect(beyond.outsidePlannedCorridor).toBe(true);
  });

  it("targetStillRecoverable mirrors the classification label", () => {
    const actual = buildStations([
      { md: 0, dip: -60, azimuth: 90 },
      { md: 30, dip: -60, azimuth: 90 },
    ]);
    const ok = buildCorridorStatus(planStations, actual, corridor, reco({ planOffset: 1, label: "Correction needed" }))!;
    const risk = buildCorridorStatus(planStations, actual, corridor, reco({ planOffset: 1, label: "Target at risk" }))!;
    expect(ok.targetStillRecoverable).toBe(true);
    expect(risk.targetStillRecoverable).toBe(false);
  });
});
