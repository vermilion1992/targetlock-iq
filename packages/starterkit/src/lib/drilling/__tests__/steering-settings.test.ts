import { describe, expect, it } from "vitest";
import { buildStations } from "../desurvey";
import { calculateRecommendation } from "../recommendation";
import { buildCorridorStatus } from "../plan-corridor";
import { DEFAULT_PLAN_CORRIDOR } from "../plan-corridor";
import {
  applySteeringPolicy,
  DEFAULT_STEERING_RULES,
  DEFAULT_STEERING_SETTINGS,
  evaluateSteeringPolicy,
  isGearMethodAvailable,
  normalizeSteeringSettings,
} from "../steering-settings";
import { computeSteeringFeasibility } from "../steering-feasibility";
import type { SurveyRecord } from "../types";

const plan: SurveyRecord[] = [
  { md: 0, dip: -60, azimuth: 90 },
  { md: 150, dip: -60, azimuth: 90 },
  { md: 600, dip: -60, azimuth: 90 },
];

const actualEarlyDrift: SurveyRecord[] = [
  { md: 0, dip: -60, azimuth: 90 },
  { md: 120, dip: -54, azimuth: 96 },
];

describe("steering-settings", () => {
  it("normalizes defaults with motor off", () => {
    const s = normalizeSteeringSettings(null);
    expect(s.gear.motorNavi).toBe(false);
    expect(s.gear.parameter).toBe(true);
    expect(s.rules.length).toBeGreaterThanOrEqual(8);
  });

  it("merges saved rule edits with fixed default catalog", () => {
    const saved = normalizeSteeringSettings({
      rules: [
        {
          ...DEFAULT_STEERING_RULES[0]!,
          label: "Custom early angle",
          condition: { type: "combined_angle_gte", valueDeg: 8 },
        },
        { id: "custom-only", label: "Should drop", enabled: true, condition: { type: "outside_corridor" }, gate: { type: "any" }, action: "watch" },
      ],
    });
    expect(saved.rules).toHaveLength(DEFAULT_STEERING_RULES.length);
    expect(saved.rules[0]?.label).toBe("Custom early angle");
    expect(saved.rules[0]?.condition).toEqual({ type: "combined_angle_gte", valueDeg: 8 });
    expect(saved.rules.find((r) => r.id === "custom-only")).toBeUndefined();
    expect(saved.rules.every((r) => DEFAULT_STEERING_RULES.some((d) => d.id === r.id))).toBe(true);
  });

  it("flags no navi gear when correction needs steering", () => {
    const deepDrift: SurveyRecord[] = [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 300, dip: -42, azimuth: 125 },
    ];
    const planStations = buildStations(plan);
    const actualStations = buildStations(deepDrift);
    const target = {
      md: 600,
      e: planStations[planStations.length - 1]!.e,
      n: planStations[planStations.length - 1]!.n,
      d: planStations[planStations.length - 1]!.d,
      tolerance: 6,
      maxDls: 3,
      nextInterval: 30,
    };
    const reco = calculateRecommendation(planStations, actualStations, target);
    expect(reco).not.toBeNull();
    const onlyNoNavi = normalizeSteeringSettings({
      gear: DEFAULT_STEERING_SETTINGS.gear,
      rules: DEFAULT_STEERING_RULES.filter((r) => r.id === "default-no-navi-recovery"),
    });
    const match = evaluateSteeringPolicy(
      reco,
      planStations,
      buildCorridorStatus(planStations, actualStations, DEFAULT_PLAN_CORRIDOR, reco),
      onlyNoNavi
    );
    expect(match?.ruleId).toBe("default-no-navi-recovery");
  });

  it("flags early combined angle rule", () => {
    const planStations = buildStations(plan);
    const actualStations = buildStations(actualEarlyDrift);
    const target = {
      md: 600,
      e: planStations[planStations.length - 1]!.e,
      n: planStations[planStations.length - 1]!.n,
      d: planStations[planStations.length - 1]!.d,
      tolerance: 6,
      maxDls: 3,
      nextInterval: 30,
    };
    const reco = calculateRecommendation(planStations, actualStations, target);
    expect(reco).not.toBeNull();
    const match = evaluateSteeringPolicy(
      reco,
      planStations,
      buildCorridorStatus(planStations, actualStations, DEFAULT_PLAN_CORRIDOR, reco),
      DEFAULT_STEERING_SETTINGS
    );
    expect(match?.ruleId).toBe("default-early-angle");
    expect(match?.action).toBe("supervisor_review");
  });

  it("disables motor when gear off", () => {
    expect(isGearMethodAvailable("motor_navi", DEFAULT_STEERING_SETTINGS.gear)).toBe(false);
    expect(isGearMethodAvailable("parameter", DEFAULT_STEERING_SETTINGS.gear)).toBe(true);
  });

  it("applySteeringPolicy escalates action from rule", () => {
    const planStations = buildStations(plan);
    const actualStations = buildStations(actualEarlyDrift);
    const target = {
      md: 600,
      e: planStations[planStations.length - 1]!.e,
      n: planStations[planStations.length - 1]!.n,
      d: planStations[planStations.length - 1]!.d,
      tolerance: 6,
      maxDls: 3,
      nextInterval: 30,
    };
    const reco = calculateRecommendation(planStations, actualStations, target)!;
    const steering = computeSteeringFeasibility(
      reco,
      planStations,
      actualStations,
      undefined,
      DEFAULT_PLAN_CORRIDOR
    )!;
    const policy = evaluateSteeringPolicy(
      reco,
      planStations,
      buildCorridorStatus(planStations, actualStations, DEFAULT_PLAN_CORRIDOR, reco),
      DEFAULT_STEERING_SETTINGS
    );
    const adjusted = applySteeringPolicy(
      steering,
      reco,
      policy,
      DEFAULT_STEERING_SETTINGS.gear
    );
    expect(adjusted.simple.currentAction).toBe("Supervisor review");
    expect(adjusted.simple.bestMethod).not.toMatch(/supervisor review before drilling/i);
  });
});
