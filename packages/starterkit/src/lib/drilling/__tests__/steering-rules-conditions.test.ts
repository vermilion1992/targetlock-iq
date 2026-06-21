import { describe, expect, it } from "vitest";
import {
  conditionMatches,
  gateMatches,
  DEFAULT_GEAR,
  type GearAvailability,
} from "../steering-settings";
import type { PlanCorridorStatus } from "../plan-corridor";
import {
  CLASS_NAMES,
  currentOffPlan,
  flatPlanStations,
  makeReco,
} from "./steering-rule-fixtures";

const noCorridor: PlanCorridorStatus | null = null;
const gearAllOff: GearAvailability = {
  natural: false,
  parameter: false,
  motorNavi: false,
  devidrill: false,
  wedgeBranch: false,
};

describe("conditionMatches — numeric thresholds (below / at / above)", () => {
  it("plan_offset_gte respects the boundary", () => {
    const cond = { type: "plan_offset_gte", valueM: 4 } as const;
    expect(conditionMatches(cond, makeReco({ planOffset: 3.99 }), [], noCorridor, DEFAULT_GEAR)).toBe(false);
    expect(conditionMatches(cond, makeReco({ planOffset: 4 }), [], noCorridor, DEFAULT_GEAR)).toBe(true);
    expect(conditionMatches(cond, makeReco({ planOffset: 4.01 }), [], noCorridor, DEFAULT_GEAR)).toBe(true);
  });

  it("projected_miss_gte respects the boundary", () => {
    const cond = { type: "projected_miss_gte", valueM: 8 } as const;
    expect(conditionMatches(cond, makeReco({ miss: 7.99 }), [], noCorridor, DEFAULT_GEAR)).toBe(false);
    expect(conditionMatches(cond, makeReco({ miss: 8 }), [], noCorridor, DEFAULT_GEAR)).toBe(true);
  });

  it("projected_miss_gt_tolerance is strict (equal is inside)", () => {
    const cond = { type: "projected_miss_gt_tolerance" } as const;
    expect(conditionMatches(cond, makeReco({ miss: 6, tolerance: 6 }), [], noCorridor, DEFAULT_GEAR)).toBe(false);
    expect(conditionMatches(cond, makeReco({ miss: 6.01, tolerance: 6 }), [], noCorridor, DEFAULT_GEAR)).toBe(true);
  });

  it("required_dls_gte respects the boundary and rejects non-finite DLS", () => {
    const cond = { type: "required_dls_gte", valueDls: 2.5 } as const;
    expect(conditionMatches(cond, makeReco({ dlsRequired: 2.49 }), [], noCorridor, DEFAULT_GEAR)).toBe(false);
    expect(conditionMatches(cond, makeReco({ dlsRequired: 2.5 }), [], noCorridor, DEFAULT_GEAR)).toBe(true);
    expect(conditionMatches(cond, makeReco({ dlsRequired: Infinity }), [], noCorridor, DEFAULT_GEAR)).toBe(false);
    expect(conditionMatches(cond, makeReco({ dlsRequired: NaN }), [], noCorridor, DEFAULT_GEAR)).toBe(false);
  });

  it("required_dls_gt_max uses a +0.05 guard band over maxDls", () => {
    const cond = { type: "required_dls_gt_max" } as const;
    expect(conditionMatches(cond, makeReco({ dlsRequired: 3.04, maxDls: 3 }), [], noCorridor, DEFAULT_GEAR)).toBe(false);
    expect(conditionMatches(cond, makeReco({ dlsRequired: 3.05, maxDls: 3 }), [], noCorridor, DEFAULT_GEAR)).toBe(false);
    expect(conditionMatches(cond, makeReco({ dlsRequired: 3.06, maxDls: 3 }), [], noCorridor, DEFAULT_GEAR)).toBe(true);
    expect(conditionMatches(cond, makeReco({ dlsRequired: Infinity, maxDls: 3 }), [], noCorridor, DEFAULT_GEAR)).toBe(false);
  });

  it("miss_gte_tolerance_multiple respects the boundary", () => {
    const cond = { type: "miss_gte_tolerance_multiple", multiplier: 2 } as const;
    expect(conditionMatches(cond, makeReco({ miss: 11.99, tolerance: 6 }), [], noCorridor, DEFAULT_GEAR)).toBe(false);
    expect(conditionMatches(cond, makeReco({ miss: 12, tolerance: 6 }), [], noCorridor, DEFAULT_GEAR)).toBe(true);
  });
});

describe("conditionMatches — angular deviation from plan", () => {
  // Plan deviation is computed by round-tripping dip/azimuth through a direction
  // vector (interpolateAtMd), so the reconstructed plan angle carries ~1e-13 noise.
  // Tests therefore stay clear of the exact threshold rather than sitting on it.
  it("dip_deviation_gte uses |actual dip − plan dip|", () => {
    const cond = { type: "dip_deviation_gte", valueDeg: 5 } as const;
    const recoUnder = makeReco({ current: currentOffPlan(120, 4, 0) });
    const recoOver = makeReco({ current: currentOffPlan(120, 6, 0) });
    const recoOverNeg = makeReco({ current: currentOffPlan(120, -6, 0) });
    expect(conditionMatches(cond, recoUnder, flatPlanStations, noCorridor, DEFAULT_GEAR)).toBe(false);
    expect(conditionMatches(cond, recoOver, flatPlanStations, noCorridor, DEFAULT_GEAR)).toBe(true);
    expect(conditionMatches(cond, recoOverNeg, flatPlanStations, noCorridor, DEFAULT_GEAR)).toBe(true);
  });

  it("azi_deviation_gte uses the shortest signed azimuth difference", () => {
    const cond = { type: "azi_deviation_gte", valueDeg: 5 } as const;
    const recoUnder = makeReco({ current: currentOffPlan(120, 0, 4) });
    const recoOver = makeReco({ current: currentOffPlan(120, 0, 6) });
    expect(conditionMatches(cond, recoUnder, flatPlanStations, noCorridor, DEFAULT_GEAR)).toBe(false);
    expect(conditionMatches(cond, recoOver, flatPlanStations, noCorridor, DEFAULT_GEAR)).toBe(true);
  });

  it("combined_angle_gte is the SUM of dip and azimuth deviation (documents the additive behaviour)", () => {
    const cond = { type: "combined_angle_gte", valueDeg: 6 } as const;
    // dip 3.5 + azi 3.5 = 7 → fires even though neither component alone reaches 6.
    const recoSum = makeReco({ current: currentOffPlan(120, 3.5, 3.5) });
    expect(conditionMatches(cond, recoSum, flatPlanStations, noCorridor, DEFAULT_GEAR)).toBe(true);
    // dip 2.5 + azi 2.5 = 5 → below threshold.
    const recoUnder = makeReco({ current: currentOffPlan(120, 2.5, 2.5) });
    expect(conditionMatches(cond, recoUnder, flatPlanStations, noCorridor, DEFAULT_GEAR)).toBe(false);
  });

  it("angular conditions are false when there is no plan to compare against", () => {
    const cond = { type: "combined_angle_gte", valueDeg: 0.1 } as const;
    const reco = makeReco({ current: currentOffPlan(120, 10, 10) });
    expect(conditionMatches(cond, reco, [], noCorridor, DEFAULT_GEAR)).toBe(false);
  });
});

describe("conditionMatches — corridor, gear and classification", () => {
  it("outside_corridor only fires on an explicit true status", () => {
    const cond = { type: "outside_corridor" } as const;
    const reco = makeReco();
    expect(conditionMatches(cond, reco, [], null, DEFAULT_GEAR)).toBe(false);
    expect(
      conditionMatches(cond, reco, [], { outsidePlannedCorridor: false } as PlanCorridorStatus, DEFAULT_GEAR)
    ).toBe(false);
    expect(
      conditionMatches(cond, reco, [], { outsidePlannedCorridor: true } as PlanCorridorStatus, DEFAULT_GEAR)
    ).toBe(true);
  });

  it("no_steering_gear_available fires only when navi/devidrill are off AND a steering-grade correction is needed", () => {
    const cond = { type: "no_steering_gear_available" } as const;
    // Needs steering: dlsRequired > maxDls*0.75 and not on-track.
    const needs = makeReco({
      dlsRequired: 2.5,
      maxDls: 3,
      classification: { label: "Steering recommended", className: "steer", confidence: "Medium" },
    });
    expect(conditionMatches(cond, needs, [], noCorridor, gearAllOff)).toBe(true);
    // Same correction but motor/navi present → not flagged.
    expect(
      conditionMatches(cond, needs, [], noCorridor, { ...gearAllOff, motorNavi: true })
    ).toBe(false);
    // On-track never needs gear even if DLS is high.
    const onTrack = makeReco({ dlsRequired: 2.9, maxDls: 3 });
    expect(conditionMatches(cond, onTrack, [], noCorridor, gearAllOff)).toBe(false);
  });

  it("classification_at_least fires at or above the configured level for every real class", () => {
    const ranks: Record<string, number> = {
      "on-track": 0,
      watch: 1,
      correction: 2,
      steer: 3,
      risk: 4,
    };
    const levelRank: Record<string, number> = { watch: 1, correction: 2, steering: 3, risk: 4 };
    for (const className of CLASS_NAMES) {
      for (const level of ["watch", "correction", "steering", "risk"] as const) {
        const reco = makeReco({ classification: { label: className, className, confidence: "x" } });
        const cond = { type: "classification_at_least", level } as const;
        expect(
          conditionMatches(cond, reco, [], noCorridor, DEFAULT_GEAR),
          `class ${className} vs level ${level}`
        ).toBe(ranks[className]! >= levelRank[level]!);
      }
    }
  });
});

describe("gateMatches — depth/remaining windows (below / at / above)", () => {
  it("any always matches", () => {
    expect(gateMatches({ type: "any" }, makeReco())).toBe(true);
  });

  it("remaining_gt is strict", () => {
    const gate = { type: "remaining_gt", valueM: 100 } as const;
    expect(gateMatches(gate, makeReco({ remaining: 100 }))).toBe(false);
    expect(gateMatches(gate, makeReco({ remaining: 100.01 }))).toBe(true);
  });

  it("remaining_lte matches at the boundary but EXCLUDES holes at/below target depth", () => {
    const gate = { type: "remaining_lte", valueM: 60 } as const;
    expect(gateMatches(gate, makeReco({ remaining: 60 }))).toBe(true);
    expect(gateMatches(gate, makeReco({ remaining: 1 }))).toBe(true);
    // Documents the known gap: past-target holes (remaining <= 0) do not satisfy this gate.
    expect(gateMatches(gate, makeReco({ remaining: 0 }))).toBe(false);
    expect(gateMatches(gate, makeReco({ remaining: -5 }))).toBe(false);
  });

  it("above_md / below_md split at the exact MD (neither matches the boundary)", () => {
    const above = { type: "above_md", valueM: 200 } as const;
    const below = { type: "below_md", valueM: 200 } as const;
    expect(gateMatches(above, makeReco({ current: { md: 200 } }))).toBe(false);
    expect(gateMatches(above, makeReco({ current: { md: 200.01 } }))).toBe(true);
    expect(gateMatches(below, makeReco({ current: { md: 200 } }))).toBe(false);
    expect(gateMatches(below, makeReco({ current: { md: 199.99 } }))).toBe(true);
  });

  it("first_m includes the boundary MD", () => {
    const gate = { type: "first_m", valueM: 150 } as const;
    expect(gateMatches(gate, makeReco({ current: { md: 150 } }))).toBe(true);
    expect(gateMatches(gate, makeReco({ current: { md: 150.01 } }))).toBe(false);
  });
});
