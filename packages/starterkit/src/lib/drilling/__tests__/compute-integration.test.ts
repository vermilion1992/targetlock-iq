import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { computeHole } from "../compute";
import {
  actionRank,
  isGearMethodAvailable,
  type GearAvailability,
} from "../steering-settings";
import { geometricAction } from "./steering-rule-fixtures";
import { surveyPathArb } from "./arbitraries";
import type { SurveyRecord, TargetConfig } from "../types";

const gearArb: fc.Arbitrary<GearAvailability> = fc.record({
  natural: fc.boolean(),
  parameter: fc.boolean(),
  motorNavi: fc.boolean(),
  devidrill: fc.boolean(),
  wedgeBranch: fc.boolean(),
});

const targetArb: fc.Arbitrary<TargetConfig> = fc.record({
  md: fc.double({ min: 50, max: 1200, noNaN: true }),
  e: fc.double({ min: -300, max: 300, noNaN: true }),
  n: fc.double({ min: -300, max: 300, noNaN: true }),
  d: fc.double({ min: 0, max: 1000, noNaN: true }),
  tolerance: fc.double({ min: 1, max: 20, noNaN: true }),
  maxDls: fc.double({ min: 0.5, max: 6, noNaN: true }),
  nextInterval: fc.constantFrom(15, 30, 60),
});

describe("computeHole — end-to-end adversarial fuzz", () => {
  it("never throws and produces finite recommendation geometry", () => {
    fc.assert(
      fc.property(surveyPathArb, surveyPathArb, targetArb, gearArb, (plan, actual, target, gear) => {
        let computed: ReturnType<typeof computeHole> | null = null;
        expect(() => {
          computed = computeHole(plan, actual, target, null, null, null, { gear });
        }).not.toThrow();
        const reco = computed!.recommendation;
        if (reco) {
          expect(Number.isFinite(reco.miss)).toBe(true);
          expect(Number.isFinite(reco.planOffset)).toBe(true);
          expect(Number.isFinite(reco.aimDip)).toBe(true);
          expect(Number.isFinite(reco.aimAzimuth)).toBe(true);
          expect(reco.aimAzimuth).toBeGreaterThanOrEqual(0);
          expect(reco.aimAzimuth).toBeLessThan(360);
        }
      }),
      { numRuns: 1500 }
    );
  });

  it("SAFETY INVARIANT: steering action never softens below the geometric classification", () => {
    fc.assert(
      fc.property(surveyPathArb, surveyPathArb, targetArb, gearArb, (plan, actual, target, gear) => {
        const { recommendation, steering } = computeHole(plan, actual, target, null, null, null, { gear });
        if (!recommendation || !steering) return;
        const floor = geometricAction(recommendation.classification.className);
        expect(actionRank(steering.currentAction)).toBeGreaterThanOrEqual(actionRank(floor));
      }),
      { numRuns: 1500 }
    );
  });

  it("SAFETY INVARIANT: every method shown feasible is actually available in the gear set", () => {
    fc.assert(
      fc.property(surveyPathArb, surveyPathArb, targetArb, gearArb, (plan, actual, target, gear) => {
        const { steering } = computeHole(plan, actual, target, null, null, null, { gear });
        if (!steering) return;
        for (const method of steering.methods) {
          if (method.feasible) {
            expect(isGearMethodAvailable(method.id, gear)).toBe(true);
          }
        }
      }),
      { numRuns: 1500 }
    );
  });

  it("is deterministic: identical inputs yield identical actions", () => {
    fc.assert(
      fc.property(surveyPathArb, surveyPathArb, targetArb, gearArb, (plan, actual, target, gear) => {
        const a = computeHole(plan, actual, target, null, null, null, { gear });
        const b = computeHole(plan, actual, target, null, null, null, { gear });
        expect(a.steering?.currentAction).toBe(b.steering?.currentAction);
        expect(a.recommendation?.classification.className).toBe(
          b.recommendation?.classification.className
        );
        expect(a.steeringPolicy?.ruleId ?? null).toBe(b.steeringPolicy?.ruleId ?? null);
      }),
      { numRuns: 400 }
    );
  });
});

describe("computeHole — known steering escalation scenario", () => {
  it("a hole badly off plan with no steering gear escalates and exposes no infeasible gear", () => {
    const plan: SurveyRecord[] = [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 300, dip: -60, azimuth: 90 },
      { md: 600, dip: -60, azimuth: 90 },
    ];
    const actual: SurveyRecord[] = [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 150, dip: -52, azimuth: 104 }, // drifting hard off plan
      { md: 300, dip: -44, azimuth: 118 },
    ];
    const target: TargetConfig = { md: 600, e: 520, n: 0, d: 520, tolerance: 4, maxDls: 3, nextInterval: 30 };
    const gear: GearAvailability = {
      natural: true,
      parameter: true,
      motorNavi: false,
      devidrill: false,
      wedgeBranch: true,
    };
    const { recommendation, steering } = computeHole(plan, actual, target, null, null, null, { gear });
    expect(recommendation).not.toBeNull();
    expect(steering).not.toBeNull();
    const floor = geometricAction(recommendation!.classification.className);
    expect(actionRank(steering!.currentAction)).toBeGreaterThanOrEqual(actionRank(floor));
    for (const m of steering!.methods) {
      if (m.feasible) expect(isGearMethodAvailable(m.id, gear)).toBe(true);
    }
  });
});
