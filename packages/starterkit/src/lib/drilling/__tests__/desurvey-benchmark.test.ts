import { describe, expect, it } from "vitest";
import {
  buildStations,
  buildStationsWithMethod,
  compareDesurveyMethods,
  displacementWithMethod,
} from "../desurvey";
import { DEG } from "../geometry";
import type { SurveyRecord } from "../types";

/**
 * Benchmark-grade desurvey validation against analytically exact geometry.
 *
 * Every expected value below is derived in closed form (documented in
 * docs/targetlock-pitch/math-validation/desurvey-benchmarks.md) — no
 * fabricated "published" numbers:
 *
 * 1. Straight inclined hole — pure trigonometry.
 * 2. Constant-build circular arc in a vertical plane — minimum curvature is
 *    exact for circular arcs at ANY station spacing (each chord of a circle
 *    is reproduced exactly), so the desurveyed end must equal the exact
 *    circle position to numerical precision.
 * 3. Horizontal constant-rate turn — exact circle in plan view.
 * 4. Radius of curvature in its exact cases — a constant-azimuth build arc
 *    and a constant-inclination horizontal turn (the classic factored RoC
 *    formula is exact when one of I/A is constant; when both vary it is an
 *    approximation covered by the convergence test below).
 * 5. Convergence — all three methods agree as station spacing shrinks, with
 *    the error falling at least an order of magnitude from coarse to fine.
 *
 * Conventions: dip is negative-down (dip −90 = straight down), inclination
 * from vertical I = 90 + dip, d is down-positive.
 */

function endPosition(records: SurveyRecord[]) {
  const stations = buildStations(records);
  const last = stations[stations.length - 1]!;
  return { e: last.e, n: last.n, d: last.d };
}

describe("desurvey benchmarks — analytically exact golden cases", () => {
  it("straight inclined hole matches closed-form trig position", () => {
    // dip −60, azimuth 30, 600 m: horizontal = 600·cos60° = 300,
    // e = 300·sin30° = 150, n = 300·cos30°, d = 600·sin60°.
    const records: SurveyRecord[] = [
      { md: 0, dip: -60, azimuth: 30 },
      { md: 250, dip: -60, azimuth: 30 },
      { md: 600, dip: -60, azimuth: 30 },
    ];
    const end = endPosition(records);
    expect(end.e).toBeCloseTo(150, 9);
    expect(end.n).toBeCloseTo(300 * Math.cos(30 * DEG), 9);
    expect(end.d).toBeCloseTo(600 * Math.sin(60 * DEG), 9);
  });

  it("constant-build circular arc in a vertical plane is exact (R = L/Δθ)", () => {
    // Build from vertical (dip −90, I = 0) to I = 60° over 600 m at constant
    // 3°/30 m. Circle radius R = L/Δθ = 600/(60°·π/180).
    // Exact circle: n(I) = R(1 − cos I), d(I) = R·sin I, e = 0.
    const length = 600;
    const buildDeg = 60;
    const radius = length / (buildDeg * DEG);

    // Stations every 50 m (5° of build per interval) — minimum curvature
    // must reproduce the circle exactly regardless of spacing.
    const records: SurveyRecord[] = [];
    for (let md = 0; md <= length; md += 50) {
      records.push({ md, dip: -90 + (md / length) * buildDeg, azimuth: 0 });
    }

    const end = endPosition(records);
    expect(end.e).toBeCloseTo(0, 9);
    expect(end.n).toBeCloseTo(radius * (1 - Math.cos(buildDeg * DEG)), 7);
    expect(end.d).toBeCloseTo(radius * Math.sin(buildDeg * DEG), 7);

    // Same arc sampled twice as coarsely (10° per interval) — still exact.
    const coarse: SurveyRecord[] = [];
    for (let md = 0; md <= length; md += 100) {
      coarse.push({ md, dip: -90 + (md / length) * buildDeg, azimuth: 0 });
    }
    const coarseEnd = endPosition(coarse);
    expect(coarseEnd.n).toBeCloseTo(end.n, 7);
    expect(coarseEnd.d).toBeCloseTo(end.d, 7);
  });

  it("horizontal constant-rate turn matches the exact plan-view circle", () => {
    // Horizontal hole (dip 0) turning from azimuth 0 to 90 over 300 m.
    // Plan-view circle radius R = L/Δψ = 300/(π/2); end at e = R(1 − cos ψ),
    // n = R·sin ψ → both equal R at ψ = 90°.
    const length = 300;
    const turnDeg = 90;
    const radius = length / (turnDeg * DEG);

    const records: SurveyRecord[] = [];
    for (let md = 0; md <= length; md += 30) {
      records.push({ md, dip: 0, azimuth: (md / length) * turnDeg });
    }

    const end = endPosition(records);
    expect(end.e).toBeCloseTo(radius, 7);
    expect(end.n).toBeCloseTo(radius, 7);
    expect(end.d).toBeCloseTo(0, 9);
  });

  it("radius of curvature is exact on a constant-azimuth build arc", () => {
    // Single 600 m interval building I = 0° → 60° at fixed azimuth 45°.
    // Exact circle (R = L/ΔI): vertical = R·sin60°, horizontal = R(1 − cos60°),
    // split into e/n by the fixed azimuth.
    const length = 600;
    const radius = length / (60 * DEG);
    const horizontal = radius * (1 - Math.cos(60 * DEG));

    const roc = displacementWithMethod(
      { dip: -90, azimuth: 45 },
      { dip: -30, azimuth: 45 },
      length,
      "radius-of-curvature"
    );
    expect(roc.d).toBeCloseTo(radius * Math.sin(60 * DEG), 9);
    expect(roc.e).toBeCloseTo(horizontal * Math.sin(45 * DEG), 9);
    expect(roc.n).toBeCloseTo(horizontal * Math.cos(45 * DEG), 9);
  });

  it("radius of curvature is exact on a constant-inclination horizontal turn", () => {
    // Single 300 m horizontal interval turning azimuth 10° → 100°.
    // Exact plan circle (R = L/ΔA): e = R(cos A1 − cos A2), n = R(sin A2 − sin A1).
    const length = 300;
    const a1 = 10 * DEG;
    const a2 = 100 * DEG;
    const radius = length / (a2 - a1);

    const roc = displacementWithMethod(
      { dip: 0, azimuth: 10 },
      { dip: 0, azimuth: 100 },
      length,
      "radius-of-curvature"
    );
    expect(roc.e).toBeCloseTo(radius * (Math.cos(a1) - Math.cos(a2)), 9);
    expect(roc.n).toBeCloseTo(radius * (Math.sin(a2) - Math.sin(a1)), 9);
    expect(roc.d).toBeCloseTo(0, 9);
  });

  it("all three methods converge as station spacing shrinks (tolerance scaling)", () => {
    // Smooth build-and-turn path: I from 0° to 50°, A from 30° to 150°.
    const length = 600;
    const path = (md: number): SurveyRecord => ({
      md,
      dip: -90 + (md / length) * 50,
      azimuth: 30 + (md / length) * 120,
    });
    const sample = (spacing: number): SurveyRecord[] => {
      const records: SurveyRecord[] = [];
      for (let md = 0; md <= length; md += spacing) records.push(path(md));
      return records;
    };

    const maxMethodSpread = (records: SurveyRecord[]): number => {
      const ends = compareDesurveyMethods(records).map((c) => c.end);
      let max = 0;
      for (let i = 0; i < ends.length; i += 1) {
        for (let j = i + 1; j < ends.length; j += 1) {
          max = Math.max(
            max,
            Math.hypot(
              ends[i]!.e - ends[j]!.e,
              ends[i]!.n - ends[j]!.n,
              ends[i]!.d - ends[j]!.d
            )
          );
        }
      }
      return max;
    };

    const coarseSpread = maxMethodSpread(sample(60));
    const fineSpread = maxMethodSpread(sample(5));

    // At 5 m stations the three methods must agree to centimetre level, and
    // the disagreement must shrink by at least an order of magnitude vs the
    // 60 m sampling (methods differ at O(spacing²)).
    expect(fineSpread).toBeLessThan(0.05);
    expect(fineSpread).toBeLessThan(coarseSpread / 10);

    // And every method individually converges to the same fine-spacing
    // minimum-curvature position.
    const reference = endPosition(sample(5));
    for (const method of [
      "balanced-tangential",
      "radius-of-curvature",
    ] as const) {
      const stations = buildStationsWithMethod(sample(5), method);
      const last = stations[stations.length - 1]!;
      expect(
        Math.hypot(last.e - reference.e, last.n - reference.n, last.d - reference.d)
      ).toBeLessThan(0.05);
    }
  });
});
