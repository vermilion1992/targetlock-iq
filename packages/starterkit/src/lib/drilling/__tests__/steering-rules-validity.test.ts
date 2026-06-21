import { describe, expect, it } from "vitest";
import {
  actionFromRule,
  actionRank,
  applySteeringPolicy,
  conditionMatches,
  DEFAULT_STEERING_RULES,
  DEFAULT_STEERING_SETTINGS,
  evaluateSteeringPolicy,
  gateMatches,
  isGearMethodAvailable,
  normalizeSteeringSettings,
  type GearAvailability,
  type SteeringRule,
} from "../steering-settings";
import type { PlanCorridorStatus } from "../plan-corridor";
import {
  flatPlanStations,
  geometricAction,
  makeReco,
  makeSteering,
  SMOOTH_STEERING_METHOD_IDS,
} from "./steering-rule-fixtures";
import type { Recommendation, SurveyStation } from "../types";

const CATALOG_IDS = new Set(DEFAULT_STEERING_RULES.map((r) => r.id));

/** Small deterministic PRNG so fuzz runs are reproducible. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function randomReco(rng: () => number): {
  reco: Recommendation;
  plan: SurveyStation[];
  corridor: PlanCorridorStatus | null;
  gear: GearAvailability;
} {
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]!;
  const tolerance = 2 + rng() * 8;
  const maxDls = 1.5 + rng() * 3;
  const className = pick(["on-track", "watch", "correction", "steer", "risk"] as const);
  const md = rng() * 600;
  const reco = makeReco({
    current: {
      md,
      dip: -60 + (rng() * 16 - 8),
      azimuth: 90 + (rng() * 16 - 8),
    },
    remaining: rng() * 400 - 40, // can be negative (past target)
    miss: rng() * 30,
    tolerance,
    dlsRequired: rng() < 0.1 ? Infinity : rng() * 8,
    maxDls,
    planOffset: rng() * 12,
    classification: { label: className, className, confidence: "x" },
  });
  return {
    reco,
    plan: rng() < 0.5 ? flatPlanStations : [],
    corridor:
      rng() < 0.5 ? null : ({ outsidePlannedCorridor: rng() < 0.5 } as PlanCorridorStatus),
    gear: {
      natural: rng() < 0.9,
      parameter: rng() < 0.9,
      motorNavi: rng() < 0.4,
      devidrill: rng() < 0.3,
      wedgeBranch: rng() < 0.8,
    },
  };
}

describe("evaluateSteeringPolicy — robustness invariants (fuzz)", () => {
  it("never throws, returns null or a catalog rule, and is deterministic", () => {
    const rng = makeRng(20260621);
    for (let i = 0; i < 3000; i += 1) {
      const { reco, plan, corridor, gear } = randomReco(rng);
      const settings = { gear, rules: DEFAULT_STEERING_RULES };
      const run = () => evaluateSteeringPolicy(reco, plan, corridor, settings);
      expect(run).not.toThrow();
      const match = run();
      expect(run()).toEqual(match);
      if (match) {
        expect(CATALOG_IDS.has(match.ruleId)).toBe(true);
      }
    }
  });

  it("the matched rule genuinely satisfies its own gate AND condition", () => {
    const rng = makeRng(7);
    for (let i = 0; i < 3000; i += 1) {
      const { reco, plan, corridor, gear } = randomReco(rng);
      const normalized = normalizeSteeringSettings({ gear, rules: DEFAULT_STEERING_RULES });
      const match = evaluateSteeringPolicy(reco, plan, corridor, normalized);
      if (!match) continue;
      const rule = normalized.rules.find((r) => r.id === match.ruleId)!;
      expect(rule.enabled).toBe(true);
      expect(gateMatches(rule.gate, reco)).toBe(true);
      expect(conditionMatches(rule.condition, reco, plan, corridor, normalized.gear)).toBe(true);
    }
  });

  it("the matched rule is the FIRST matching enabled rule in catalog order", () => {
    const rng = makeRng(99);
    for (let i = 0; i < 2000; i += 1) {
      const { reco, plan, corridor, gear } = randomReco(rng);
      const normalized = normalizeSteeringSettings({ gear, rules: DEFAULT_STEERING_RULES });
      const match = evaluateSteeringPolicy(reco, plan, corridor, normalized);
      const firstMatch = normalized.rules.find(
        (r) =>
          r.enabled &&
          gateMatches(r.gate, reco) &&
          conditionMatches(r.condition, reco, plan, corridor, normalized.gear)
      );
      expect(match?.ruleId ?? null).toBe(firstMatch?.id ?? null);
    }
  });
});

describe("applySteeringPolicy — never softens the geometric classification (fuzz)", () => {
  it("final action rank is always >= the geometric action floor", () => {
    const rng = makeRng(424242);
    for (let i = 0; i < 3000; i += 1) {
      const { reco, plan, corridor, gear } = randomReco(rng);
      const floor = geometricAction(reco.classification.className);
      const steering = makeSteering(reco, floor);
      const policy = evaluateSteeringPolicy(reco, plan, corridor, { gear, rules: DEFAULT_STEERING_RULES });
      const result = applySteeringPolicy(steering, reco, policy, gear);
      expect(actionRank(result.currentAction)).toBeGreaterThanOrEqual(actionRank(floor));
      expect(actionRank(result.simple.currentAction)).toBeGreaterThanOrEqual(actionRank(floor));
      if (policy) {
        expect(actionRank(result.currentAction)).toBeGreaterThanOrEqual(
          actionRank(actionFromRule(policy.action))
        );
      }
    }
  });
});

describe("applySteeringPolicy — gear and method-filter honouring (fuzz)", () => {
  it("any method marked feasible is gear-available and rule-permitted", () => {
    const rng = makeRng(31337);
    for (let i = 0; i < 3000; i += 1) {
      const { reco, plan, corridor, gear } = randomReco(rng);
      const steering = makeSteering(reco);
      const policy = evaluateSteeringPolicy(reco, plan, corridor, { gear, rules: DEFAULT_STEERING_RULES });
      const result = applySteeringPolicy(steering, reco, policy, gear);
      for (const m of result.methods) {
        if (!m.feasible) continue;
        expect(isGearMethodAvailable(m.id, gear)).toBe(true);
        if (policy?.allowedMethods?.length && m.id !== "shorten_interval") {
          expect(policy.allowedMethods.includes(m.id)).toBe(true);
        }
      }
    }
  });

  it("when a correction is actually recommended, the headline method is never a feasible-but-unavailable tool", () => {
    const rng = makeRng(8675309);
    for (let i = 0; i < 3000; i += 1) {
      const { reco, plan, corridor, gear } = randomReco(rng);
      const steering = makeSteering(reco);
      const policy = evaluateSteeringPolicy(reco, plan, corridor, { gear, rules: DEFAULT_STEERING_RULES });
      const result = applySteeringPolicy(steering, reco, policy, gear);
      const best = result.bestMethodId;
      const bestRow = result.methods.find((m) => m.id === best);
      // A smooth method only counts as a real recommendation if it is marked feasible.
      if ((SMOOTH_STEERING_METHOD_IDS as readonly string[]).includes(best) && bestRow?.feasible) {
        expect(isGearMethodAvailable(best, gear)).toBe(true);
        if (policy?.allowedMethods?.length) {
          expect(policy.allowedMethods.includes(best)).toBe(true);
        }
      }
    }
  });

  it("KNOWN QUIRK: an On-track hole keeps the default natural headline even if natural gear is off", () => {
    // Documents that the informational headline pointer is not re-validated when no
    // correction is needed; the methods[] feasibility list (asserted above) stays correct.
    const reco = makeReco({
      miss: 1,
      tolerance: 6,
      classification: { label: "On track", className: "on-track", confidence: "High" },
    });
    const gear: GearAvailability = {
      natural: false,
      parameter: true,
      motorNavi: false,
      devidrill: false,
      wedgeBranch: true,
    };
    const result = applySteeringPolicy(makeSteering(reco), reco, null, gear);
    expect(result.currentAction).toBe("On track");
    expect(result.bestMethodId).toBe("natural");
    expect(result.methods.find((m) => m.id === "natural")?.feasible).toBe(false);
  });
});

describe("default catalog — structural consistency", () => {
  it("has unique ids and valid action ranks for every rule", () => {
    const ids = DEFAULT_STEERING_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const rule of DEFAULT_STEERING_RULES) {
      expect(actionRank(actionFromRule(rule.action))).toBeGreaterThanOrEqual(0);
      expect(rule.label.length).toBeGreaterThan(0);
    }
  });

  it("every rule still fires somewhere — none is permanently shadowed by an earlier rule", () => {
    // For each rule, find an input where it is the first match under the full default
    // catalog. If a rule can never win, it is dead config and should be flagged.
    const rng = makeRng(2024);
    const winners = new Set<string>();
    for (let i = 0; i < 20000 && winners.size < CATALOG_IDS.size; i += 1) {
      const { reco, plan, corridor, gear } = randomReco(rng);
      const match = evaluateSteeringPolicy(reco, plan, corridor, { gear, rules: DEFAULT_STEERING_RULES });
      if (match) winners.add(match.ruleId);
    }
    const neverWins = [...CATALOG_IDS].filter((id) => !winners.has(id));
    expect(neverWins).toEqual([]);
  });
});

describe("known ordering interactions (pinned behaviour)", () => {
  // These pin the current "first match wins" outcomes for inputs where two rules of
  // different severity both match. They are correct under the never-soften guarantee
  // (geometry sets the floor), but document the order so any future reshuffle is noticed.
  const onlyTwo = (a: string, b: string): SteeringRule[] =>
    DEFAULT_STEERING_RULES.map((r) => ({ ...r, enabled: r.id === a || r.id === b }));

  it("required DLS over max AND over the wedge threshold → dls-over-max wins (listed first)", () => {
    const reco = makeReco({ dlsRequired: 4, maxDls: 3 });
    const match = evaluateSteeringPolicy(reco, [], null, {
      gear: DEFAULT_STEERING_SETTINGS.gear,
      rules: onlyTwo("default-dls-over-max", "default-wedge-dls"),
    });
    expect(match?.ruleId).toBe("default-dls-over-max");
    // wedge-dls (a stronger wedge/branch action) also matches but is shadowed here:
    expect(conditionMatches({ type: "required_dls_gte", valueDls: 2.5 }, reco, [], null, DEFAULT_STEERING_SETTINGS.gear)).toBe(true);
  });

  it("large offset AND miss > 2x tolerance with depth remaining → plan-offset wins (listed first)", () => {
    const reco = makeReco({ planOffset: 6, remaining: 200, miss: 14, tolerance: 6 });
    const match = evaluateSteeringPolicy(reco, [], null, {
      gear: DEFAULT_STEERING_SETTINGS.gear,
      rules: onlyTwo("default-plan-offset", "default-miss-multiple"),
    });
    expect(match?.ruleId).toBe("default-plan-offset");
    expect(conditionMatches({ type: "miss_gte_tolerance_multiple", multiplier: 2 }, reco, [], null, DEFAULT_STEERING_SETTINGS.gear)).toBe(true);
  });
});
