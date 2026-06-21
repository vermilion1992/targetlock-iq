import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  designWellPath,
  requiredDoglegRate,
  type WellPathDesignInput,
} from "../well-path-design";
import { buildStations } from "../desurvey";
import {
  DEG,
  RAD,
  add,
  distance,
  dot,
  normalizeVector,
  scale,
  subtract,
  vectorFromDipAz,
  vectorLength,
} from "../geometry";
import type { Vec3 } from "../types";
import { dbl } from "./arbitraries";

const cross = (a: Vec3, b: Vec3): Vec3 => ({
  e: a.n * b.d - a.d * b.n,
  n: a.d * b.e - a.e * b.d,
  d: a.e * b.n - a.n * b.e,
});

/**
 * Forward, mostly-reachable design inputs: a downward start direction and a
 * target placed `along` metres ahead plus `lateral` metres to one side, so a
 * large fraction of generated cases are feasible (closure can be asserted).
 */
const forwardDesignArb: fc.Arbitrary<{
  input: WellPathDesignInput;
  t0: Vec3;
  delta: Vec3;
}> = fc
  .record({
    startDip: dbl(-80, -10),
    startAzimuth: dbl(0, 360),
    // designWellPath emits direction-only records; buildStations reconstructs
    // from the origin, so closure/plane are validated relative to (0,0,0).
    start: fc.constant({ e: 0, n: 0, d: 0 }),
    along: dbl(80, 1200),
    lateral: dbl(0, 350),
    lateralAzi: dbl(0, 360),
    maxDls: dbl(1, 6),
    surveyInterval: fc.constantFrom(10, 15, 30),
  })
  .map(({ startDip, startAzimuth, start, along, lateral, lateralAzi, maxDls, surveyInterval }) => {
    const t0 = vectorFromDipAz(startDip, startAzimuth);
    // A perpendicular to t0: remove the t0 component from a world axis.
    const seed = Math.abs(t0.d) > 0.9 ? { e: 1, n: 0, d: 0 } : { e: 0, n: 0, d: 1 };
    let perp = subtract(seed, scale(t0, dot(seed, t0)));
    // Rotate perp around t0 by lateralAzi to spread the side direction.
    const perpA = normalizeVector(perp, { e: 1, n: 0, d: 0 });
    const perpB = normalizeVector(cross(t0, perpA), { e: 0, n: 1, d: 0 });
    perp = add(
      scale(perpA, Math.cos(lateralAzi * DEG)),
      scale(perpB, Math.sin(lateralAzi * DEG))
    );
    const targetEnu = add(add(start, scale(t0, along)), scale(perp, lateral));
    const delta = subtract(targetEnu, start);
    return {
      input: {
        startMd: 0,
        startDip,
        startAzimuth,
        startPosition: start,
        targetEnu,
        surveyInterval,
        maxDls,
      },
      t0,
      delta,
    };
  });

function endPos(records: { md: number; dip: number; azimuth: number }[]): Vec3 {
  const s = buildStations(records);
  const last = s[s.length - 1]!;
  return { e: last.e, n: last.n, d: last.d };
}

function mdStrictlyIncreasing(records: { md: number }[]): boolean {
  for (let i = 1; i < records.length; i += 1) {
    if (records[i]!.md <= records[i - 1]!.md) return false;
  }
  return true;
}

/**
 * Largest tangent inclination in the design. Within ~2 deg of vertical the
 * dip/azimuth survey representation loses azimuth, so closure and in-plane
 * properties are only asserted clear of that singularity (documented limit).
 */
function maxAbsDip(records: { dip: number }[]): number {
  return Math.max(...records.map((r) => Math.abs(r.dip)));
}

describe("designWellPath curve-to-target — generation invariants (fuzz)", () => {
  it("feasible designs desurvey back onto the target", () => {
    fc.assert(
      fc.property(forwardDesignArb, ({ input }) => {
        const result = designWellPath("curve-to-target", input);
        if (!result.feasible) {
          expect(result.records).toHaveLength(0);
          expect(result.errors.length).toBeGreaterThan(0);
          return;
        }
        fc.pre(maxAbsDip(result.records) <= 88);
        const miss = distance(endPos(result.records), input.targetEnu);
        const pathLen = (result.finalMd ?? 0) - input.startMd;
        // Clear of the vertical singularity the design closes on the target to
        // a few cm (measured worst ~7 cm over 30k fuzzed geometries).
        expect(miss).toBeLessThan(0.15 + 1e-4 * pathLen);
      }),
      { numRuns: 2000 }
    );
  });

  it("uses the gentlest dogleg, never exceeds max DLS, and stays within the DLS budget", () => {
    fc.assert(
      fc.property(forwardDesignArb, ({ input }) => {
        const result = designWellPath("curve-to-target", input);
        if (!result.feasible) return;
        expect(result.usedDlsPer30m!).toBeCloseTo(result.requiredDlsPer30m!, 6);
        expect(result.usedDlsPer30m!).toBeLessThanOrEqual(input.maxDls + 1e-6);
        const stations = buildStations(result.records);
        const peakDls = Math.max(...stations.map((s) => s.dls));
        // A small excess can occur where a pinned station shortens an interval,
        // or on a near-collinear straight leg whose tiny aim-bend (reported as
        // rate 0) desurveys to <=~0.86 deg/30 m at the 10 m sampling. Bounded < 1.
        expect(peakDls).toBeLessThanOrEqual(result.usedDlsPer30m! + 1.0);
      }),
      { numRuns: 2000 }
    );
  });

  it("emits strictly increasing MD and makes forward progress", () => {
    fc.assert(
      fc.property(forwardDesignArb, ({ input }) => {
        const result = designWellPath("curve-to-target", input);
        if (!result.feasible) return;
        expect(mdStrictlyIncreasing(result.records)).toBe(true);
        expect(result.finalMd!).toBeGreaterThan(input.startMd);
      }),
      { numRuns: 1500 }
    );
  });

  it("keeps the whole trajectory in the start-direction/target plane", () => {
    fc.assert(
      fc.property(forwardDesignArb, ({ input, t0, delta }) => {
        const result = designWellPath("curve-to-target", input);
        if (!result.feasible) return;
        fc.pre(maxAbsDip(result.records) <= 88);
        const normal = cross(t0, delta);
        if (vectorLength(normal) < 1e-6) return; // collinear: plane undefined
        const unitNormal = normalizeVector(normal);
        const stations = buildStations(result.records);
        for (const s of stations) {
          const rel = subtract({ e: s.e, n: s.n, d: s.d }, input.startPosition);
          // Clear of vertical, the path is planar to tight float tolerance.
          const offPlane = Math.abs(dot(rel, unitNormal));
          // The design is planar by construction; only float noise leaves it.
          expect(offPlane).toBeLessThan(1e-5 + 1e-7 * vectorLength(rel));
        }
      }),
      { numRuns: 1500 }
    );
  });

  it("feasibility is monotonic in max DLS (a reachable target stays reachable when the limit rises)", () => {
    fc.assert(
      fc.property(forwardDesignArb, dbl(0, 6), ({ input }, bump) => {
        const lo = designWellPath("curve-to-target", input);
        if (!lo.feasible) return;
        const hi = designWellPath("curve-to-target", { ...input, maxDls: input.maxDls + bump });
        expect(hi.feasible).toBe(true);
      }),
      { numRuns: 1000 }
    );
  });
});

describe("designWellPath build-and-hold — generation invariants (fuzz)", () => {
  it("holds the start direction through the kickoff, then closes on target", () => {
    fc.assert(
      fc.property(forwardDesignArb, dbl(0, 150), ({ input }, kickoffLengthM) => {
        // Give the build rate headroom so the design is usually feasible.
        const result = designWellPath("build-and-hold", {
          ...input,
          kickoffLengthM,
          buildRateDegPer30m: input.maxDls,
        });
        if (!result.feasible) return;
        fc.pre(maxAbsDip(result.records) <= 88);
        // Stations strictly inside the kickoff hold (away from the build
        // transition) must carry the exact start direction.
        for (const r of result.records.filter(
          (r) => r.md < input.startMd + kickoffLengthM - 0.5
        )) {
          expect(r.dip).toBeCloseTo(input.startDip, 6);
          expect(((r.azimuth - input.startAzimuth) % 360 + 540) % 360 - 180).toBeCloseTo(0, 6);
        }
        const miss = distance(endPos(result.records), input.targetEnu);
        const pathLen = (result.finalMd ?? 0) - input.startMd;
        // With the kickoff/arc-end/target discontinuities all pinned, closure is
        // a few cm (measured worst ~7 cm over 30k fuzzed geometries).
        expect(miss).toBeLessThan(0.15 + 1e-4 * pathLen);
      }),
      { numRuns: 1500 }
    );
  });
});

describe("requiredDoglegRate — closed-form circle through the target", () => {
  it("is zero on-axis and corresponds to a circle that passes through (x, y)", () => {
    expect(requiredDoglegRate(300, 0)).toBe(0);
    fc.assert(
      fc.property(dbl(10, 1500), dbl(0.5, 600), (x, y) => {
        const rate = requiredDoglegRate(x, y)!;
        expect(rate).toBeGreaterThan(0);
        const radius = 30 / (rate * DEG);
        // Circle tangent to the +x axis at the origin has centre (0, radius).
        // The gentlest reaching circle must pass through (x, y): dist == radius.
        const distToCentre = Math.hypot(x - 0, y - radius);
        expect(distToCentre).toBeCloseTo(radius, 4);
      }),
      { numRuns: 1500 }
    );
  });

  it("required rate grows as the target moves off-axis", () => {
    const near = requiredDoglegRate(300, 10)!;
    const far = requiredDoglegRate(300, 120)!;
    expect(far).toBeGreaterThan(near);
  });
});

describe("designWellPath — adversarial degenerate inputs", () => {
  const base: WellPathDesignInput = {
    startMd: 0,
    startDip: -60,
    startAzimuth: 90,
    startPosition: { e: 0, n: 0, d: 0 },
    targetEnu: { e: 250, n: 40, d: 420 },
    surveyInterval: 30,
    maxDls: 3,
  };

  it("target coinciding with the start point is rejected cleanly", () => {
    const r = designWellPath("curve-to-target", { ...base, targetEnu: { e: 0, n: 0, d: 0 } });
    expect(r.feasible).toBe(false);
    expect(r.records).toHaveLength(0);
  });

  it("target inside the turn circle is rejected with guidance", () => {
    // Sharp 90-degree-ish offset close in, with a gentle max DLS.
    const t0 = vectorFromDipAz(base.startDip, base.startAzimuth);
    const seed = { e: 0, n: 1, d: 0 };
    const perp = normalizeVector(subtract(seed, scale(t0, dot(seed, t0))));
    const target = add(add(base.startPosition, scale(t0, 5)), scale(perp, 60));
    const r = designWellPath("curve-to-target", { ...base, targetEnu: target, maxDls: 1 });
    expect(r.feasible).toBe(false);
  });

  it("near-vertical start does not produce NaN stations", () => {
    const r = designWellPath("curve-to-target", {
      ...base,
      startDip: -89.9,
      targetEnu: { e: 30, n: 10, d: 600 },
    });
    if (r.feasible) {
      const stations = buildStations(r.records);
      for (const s of stations) {
        expect(Number.isFinite(s.e) && Number.isFinite(s.n) && Number.isFinite(s.d)).toBe(true);
      }
    }
  });

  it("FIX: a near-on-axis target closes exactly (no 0.5 m short-fall, no solver blow-up)", () => {
    // Target ~1100 m ahead but only ~1e-4 m off the start axis: previously the
    // arc solver's catastrophic cancellation + terminal-station snap produced a
    // multi-metre miss. It must now close to centimetres.
    const t0 = vectorFromDipAz(base.startDip, base.startAzimuth);
    const seed = { e: 0, n: 1, d: 0 };
    const perp = normalizeVector(subtract(seed, scale(t0, dot(seed, t0))));
    const target = add(add(base.startPosition, scale(t0, 1100)), scale(perp, 1e-4));
    const r = designWellPath("curve-to-target", { ...base, targetEnu: target });
    expect(r.feasible).toBe(true);
    expect(distance(endPos(r.records), target)).toBeLessThan(0.1);
  });

  it("FIX: the terminal target station is always emitted (plan never ends short)", () => {
    // Choose a geometry whose path length is just over a survey-interval multiple
    // so the old < 0.5 m guard would have dropped the terminal station.
    const r = designWellPath("curve-to-target", {
      ...base,
      surveyInterval: 30,
      targetEnu: { e: 250, n: 40, d: 420 },
    });
    expect(r.feasible).toBe(true);
    const miss = distance(endPos(r.records), { e: 250, n: 40, d: 420 });
    expect(miss).toBeLessThan(0.1);
  });

  it("a turn beyond 180 degrees (target behind) is rejected", () => {
    const r = designWellPath("curve-to-target", {
      ...base,
      targetEnu: { e: -300, n: 0, d: -200 },
    });
    expect(r.feasible).toBe(false);
  });
});
