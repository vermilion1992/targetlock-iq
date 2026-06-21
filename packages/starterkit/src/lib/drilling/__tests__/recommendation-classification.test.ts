import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  azimuthInstruction,
  calculateRecommendation,
  classify,
  dipInstruction,
} from "../recommendation";
import { buildStations } from "../desurvey";
import { doglegDeg, EPS, vectorFromDipAz } from "../geometry";
import { surveyPathArb } from "./arbitraries";
import type { Recommendation } from "../types";

type ClassifyInput = Omit<Recommendation, "classification">;

function cls(over: {
  remaining?: number;
  miss?: number;
  tolerance?: number;
  dlsRequired?: number;
  maxDls?: number;
  straightRatio?: number;
}): string {
  const base = {
    remaining: 200,
    miss: 0,
    tolerance: 6,
    dlsRequired: 0,
    maxDls: 3,
    straightRatio: 1,
  };
  return classify({ ...base, ...over } as unknown as ClassifyInput).className;
}

describe("classify — decision-tree boundary table", () => {
  it("past-target wins regardless of geometry", () => {
    expect(cls({ remaining: 0 })).toBe("risk");
    expect(cls({ remaining: -1, miss: 0 })).toBe("risk");
  });

  it("on-track exactly at tolerance, watch just above", () => {
    expect(cls({ miss: 6, tolerance: 6 })).toBe("on-track");
    expect(cls({ miss: 6.01, tolerance: 6, dlsRequired: 1, maxDls: 3 })).toBe("watch");
  });

  it("watch only up to 1.5x tolerance and within DLS budget", () => {
    expect(cls({ miss: 9, tolerance: 6, dlsRequired: 3, maxDls: 3 })).toBe("watch");
    // Just above 1.5x tolerance leaves watch.
    expect(cls({ miss: 9.01, tolerance: 6, dlsRequired: 3, maxDls: 3, straightRatio: 1 })).toBe("correction");
    // Within 1.5x but DLS over budget cannot be watch.
    expect(cls({ miss: 8, tolerance: 6, dlsRequired: 3.01, maxDls: 3 })).not.toBe("watch");
  });

  it("correction requires DLS within budget AND straightRatio <= 1.08", () => {
    expect(cls({ miss: 20, tolerance: 6, dlsRequired: 3, maxDls: 3, straightRatio: 1.08 })).toBe("correction");
    // straightRatio just over 1.08 with DLS still ok -> steer.
    expect(cls({ miss: 20, tolerance: 6, dlsRequired: 3, maxDls: 3, straightRatio: 1.081 })).toBe("steer");
  });

  it("steer up to maxDls*1.75, risk beyond", () => {
    expect(cls({ miss: 20, tolerance: 6, dlsRequired: 5.25, maxDls: 3, straightRatio: 2 })).toBe("steer");
    expect(cls({ miss: 20, tolerance: 6, dlsRequired: 5.2501, maxDls: 3, straightRatio: 2 })).toBe("risk");
  });

  it("infinite required DLS is always at risk", () => {
    expect(cls({ miss: 20, tolerance: 6, dlsRequired: Infinity, maxDls: 3 })).toBe("risk");
  });
});

describe("dlsRequired / doglegToTarget — closed form and aim clamp", () => {
  it("dlsRequired equals doglegToTarget / (remaining/30) for random valid paths (fuzz)", () => {
    fc.assert(
      fc.property(surveyPathArb, (plan) => {
        const planStations = buildStations(plan);
        const actual = buildStations(plan.slice(0, Math.max(2, Math.floor(plan.length / 2))));
        const last = planStations[planStations.length - 1]!;
        const target = {
          md: last.md,
          e: last.e,
          n: last.n,
          d: last.d,
          tolerance: 6,
          maxDls: 3,
          nextInterval: 30,
        };
        const reco = calculateRecommendation(planStations, actual, target);
        if (!reco || reco.remaining <= EPS) return;
        expect(reco.dlsRequired).toBeCloseTo(reco.doglegToTarget / (reco.remaining / 30), 6);
      }),
      { numRuns: 800 }
    );
  });

  it("aim is clamped to maxTurn when the target needs a sharper turn than allowed", () => {
    // Current heading straight down; target offset far to the east so the required
    // turn exceeds the per-interval dogleg budget.
    const planStations = buildStations([
      { md: 0, dip: -90, azimuth: 0 },
      { md: 100, dip: -90, azimuth: 0 },
    ]);
    const actual = buildStations([
      { md: 0, dip: -90, azimuth: 0 },
      { md: 50, dip: -90, azimuth: 0 },
    ]);
    const target = { md: 100, e: 80, n: 0, d: 50, tolerance: 1, maxDls: 3, nextInterval: 30 };
    const reco = calculateRecommendation(planStations, actual, target)!;
    const maxTurn = target.maxDls * (target.nextInterval / 30);
    const aimVec = vectorFromDipAz(reco.aimDip, reco.aimAzimuth);
    const aimedTurn = doglegDeg(reco.currentVector, aimVec);
    expect(reco.doglegToTarget).toBeGreaterThan(maxTurn);
    // Aim turn is clamped to the budget (not the full dogleg to target).
    expect(aimedTurn).toBeLessThanOrEqual(maxTurn + 1e-6);
    expect(aimedTurn).toBeCloseTo(maxTurn, 3);
  });

  it("past target gives Infinity required DLS and Infinity straightRatio", () => {
    const planStations = buildStations([
      { md: 0, dip: -90, azimuth: 0 },
      { md: 100, dip: -90, azimuth: 0 },
    ]);
    const actual = buildStations([
      { md: 0, dip: -90, azimuth: 0 },
      { md: 100, dip: -90, azimuth: 0 },
    ]);
    const target = { md: 100, e: 0, n: 0, d: 100, tolerance: 6, maxDls: 3, nextInterval: 30 };
    const reco = calculateRecommendation(planStations, actual, target)!;
    expect(reco.remaining).toBeLessThanOrEqual(EPS);
    expect(reco.dlsRequired).toBe(Infinity);
    expect(reco.straightRatio).toBe(Infinity);
    expect(reco.classification.className).toBe("risk");
  });
});

describe("instruction strings — non-finite handling", () => {
  it("non-finite deltas render as '--'", () => {
    expect(dipInstruction(NaN)).toBe("--");
    expect(dipInstruction(Infinity)).toBe("--");
    expect(azimuthInstruction(NaN)).toBe("--");
    expect(azimuthInstruction(-Infinity)).toBe("--");
  });

  it("sign conventions: negative dip = Drop, positive = Lift; negative azi = left", () => {
    expect(dipInstruction(-2)).toMatch(/Drop/);
    expect(dipInstruction(2)).toMatch(/Lift/);
    expect(dipInstruction(0)).toBe("Hold dip");
    expect(azimuthInstruction(-3)).toMatch(/left/);
    expect(azimuthInstruction(3)).toMatch(/right/);
  });
});
