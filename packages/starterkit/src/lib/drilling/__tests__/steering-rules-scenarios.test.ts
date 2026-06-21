import { describe, expect, it } from "vitest";
import {
  DEFAULT_STEERING_RULES,
  DEFAULT_STEERING_SETTINGS,
  evaluateSteeringPolicy,
  type SteeringRuleAction,
  type SteeringSettings,
} from "../steering-settings";
import type { PlanCorridorStatus } from "../plan-corridor";
import type { SurveyStation } from "../types";
import { currentOffPlan, flatPlanStations, makeReco } from "./steering-rule-fixtures";

/**
 * Because mergeSteeringRules always re-imposes the full default catalog, the only
 * way to verify a single rule in isolation is to enable just that rule and disable
 * the rest. This mirrors how "first match wins" would behave if only this rule existed.
 */
function onlyRule(id: string): SteeringSettings {
  return {
    gear: { ...DEFAULT_STEERING_SETTINGS.gear },
    rules: DEFAULT_STEERING_RULES.map((r) => ({ ...r, enabled: r.id === id })),
  };
}

const outsideCorridor = { outsidePlannedCorridor: true } as PlanCorridorStatus;

type Case = {
  id: string;
  action: SteeringRuleAction;
  reco: ReturnType<typeof makeReco>;
  plan?: SurveyStation[];
  corridor?: PlanCorridorStatus | null;
};

const cases: Case[] = [
  {
    id: "default-early-angle",
    action: "supervisor_review",
    reco: makeReco({ current: currentOffPlan(120, 4, 4) }),
    plan: flatPlanStations,
  },
  {
    id: "default-early-dip",
    action: "supervisor_review",
    reco: makeReco({ current: currentOffPlan(180, 6, 0) }),
    plan: flatPlanStations,
  },
  {
    id: "default-no-navi-recovery",
    action: "supervisor_review",
    reco: makeReco({
      dlsRequired: 2.5,
      maxDls: 3,
      classification: { label: "Steering recommended", className: "steer", confidence: "Medium" },
    }),
  },
  {
    id: "default-dls-over-max",
    action: "steering_review",
    reco: makeReco({ dlsRequired: 4, maxDls: 3 }),
  },
  {
    id: "default-wedge-dls",
    action: "wedge_branch_review",
    reco: makeReco({ dlsRequired: 2.6, maxDls: 5 }),
  },
  {
    id: "default-steering-class",
    action: "steering_review",
    reco: makeReco({
      classification: { label: "Steering recommended", className: "steer", confidence: "Medium" },
    }),
  },
  {
    id: "default-plan-offset",
    action: "steering_review",
    reco: makeReco({ planOffset: 5, remaining: 200 }),
  },
  {
    id: "default-miss-multiple",
    action: "supervisor_review",
    reco: makeReco({ miss: 12, tolerance: 6 }),
  },
  {
    id: "default-late-miss",
    action: "supervisor_review",
    reco: makeReco({ miss: 10, tolerance: 6, remaining: 40 }),
  },
  {
    id: "default-corridor-watch",
    action: "watch",
    reco: makeReco(),
    corridor: outsideCorridor,
  },
];

describe("default steering rules — each fires on an intended scenario", () => {
  it("covers every rule in the default catalog", () => {
    expect(new Set(cases.map((c) => c.id))).toEqual(
      new Set(DEFAULT_STEERING_RULES.map((r) => r.id))
    );
  });

  for (const c of cases) {
    it(`${c.id} fires and yields ${c.action}`, () => {
      const match = evaluateSteeringPolicy(
        c.reco,
        c.plan ?? [],
        c.corridor ?? null,
        onlyRule(c.id)
      );
      expect(match?.ruleId).toBe(c.id);
      expect(match?.action).toBe(c.action);
    });
  }
});

describe("default steering rules — calm hole trips nothing", () => {
  it("an on-plan, in-tolerance hole produces no policy match", () => {
    const calm = makeReco({
      current: { md: 100, dip: -60, azimuth: 90 },
      planOffset: 0,
      miss: 1,
      tolerance: 6,
      dlsRequired: 0.5,
      maxDls: 3,
      remaining: 200,
      classification: { label: "On track", className: "on-track", confidence: "High" },
    });
    const match = evaluateSteeringPolicy(
      calm,
      flatPlanStations,
      { outsidePlannedCorridor: false } as PlanCorridorStatus,
      DEFAULT_STEERING_SETTINGS
    );
    expect(match).toBeNull();
  });

  it("disabled rules never fire even when their condition holds", () => {
    const reco = makeReco({ planOffset: 99, remaining: 500 });
    const allDisabled: SteeringSettings = {
      gear: { ...DEFAULT_STEERING_SETTINGS.gear },
      rules: DEFAULT_STEERING_RULES.map((r) => ({ ...r, enabled: false })),
    };
    expect(evaluateSteeringPolicy(reco, [], null, allDisabled)).toBeNull();
  });
});
