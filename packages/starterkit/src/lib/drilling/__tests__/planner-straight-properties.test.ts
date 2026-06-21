import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { buildStraightPlan, checkPlanDlsWarnings } from "../planner";
import { requiredDaughterHeading } from "../branch-program";
import { buildStations } from "../desurvey";
import { distance, vectorFromDipAz } from "../geometry";
import type { Vec3 } from "../types";
import { dbl } from "./arbitraries";

function endPos(records: { md: number; dip: number; azimuth: number }[]): Vec3 {
  const s = buildStations(records);
  const last = s[s.length - 1]!;
  return { e: last.e, n: last.n, d: last.d };
}

// Forward target (downward, generally ahead of the collar) for a straight shot.
const targetArb = fc.record({ e: dbl(-600, 600), n: dbl(-600, 600), d: dbl(50, 900) });
const intervalArb = fc.constantFrom(10, 15, 30);

describe("buildStraightPlan — geometry invariants (fuzz)", () => {
  it("lands exactly on the target when aimed straight at it", () => {
    fc.assert(
      fc.property(targetArb, intervalArb, (target, surveyInterval) => {
        const heading = requiredDaughterHeading({ e: 0, n: 0, d: 0 }, target);
        fc.pre(Math.abs(heading.dip) <= 88);
        const rows = buildStraightPlan({
          startMd: 0,
          startDip: heading.dip,
          startAzimuth: heading.azimuth,
          startPosition: { e: 0, n: 0, d: 0 },
          targetEnu: target,
          surveyInterval,
        });
        expect(distance(endPos(rows), target)).toBeLessThan(0.005);
      }),
      { numRuns: 2000 }
    );
  });

  it("keeps every leg on the aiming heading and MD strictly increasing", () => {
    fc.assert(
      fc.property(targetArb, intervalArb, (target, surveyInterval) => {
        const heading = requiredDaughterHeading({ e: 0, n: 0, d: 0 }, target);
        const rows = buildStraightPlan({
          startMd: 0,
          startDip: heading.dip,
          startAzimuth: heading.azimuth,
          startPosition: { e: 0, n: 0, d: 0 },
          targetEnu: target,
          surveyInterval,
        });
        for (let i = 1; i < rows.length; i += 1) {
          expect(rows[i]!.md).toBeGreaterThan(rows[i - 1]!.md);
          expect(rows[i]!.dip).toBeCloseTo(heading.dip, 9);
        }
        // Aligned straight plan has effectively zero dogleg (float noise only).
        const stations = buildStations(rows);
        expect(Math.max(...stations.map((s) => s.dls))).toBeLessThan(1e-3);
      }),
      { numRuns: 1500 }
    );
  });

  it("honours an explicit target MD as the terminal station", () => {
    fc.assert(
      fc.property(targetArb, dbl(100, 1500), intervalArb, (target, targetMd, surveyInterval) => {
        const heading = requiredDaughterHeading({ e: 0, n: 0, d: 0 }, target);
        const rows = buildStraightPlan({
          startMd: 0,
          startDip: heading.dip,
          startAzimuth: heading.azimuth,
          startPosition: { e: 0, n: 0, d: 0 },
          targetEnu: target,
          targetMd,
          surveyInterval,
        });
        expect(rows[rows.length - 1]!.md).toBeCloseTo(targetMd, 6);
      }),
      { numRuns: 1500 }
    );
  });
});

describe("checkPlanDlsWarnings", () => {
  it("is silent for an aligned straight plan", () => {
    const heading = requiredDaughterHeading({ e: 0, n: 0, d: 0 }, { e: 100, n: 0, d: 200 });
    const rows = buildStraightPlan({
      startMd: 0,
      startDip: heading.dip,
      startAzimuth: heading.azimuth,
      startPosition: { e: 0, n: 0, d: 0 },
      targetEnu: { e: 100, n: 0, d: 200 },
    });
    expect(checkPlanDlsWarnings(rows, 3)).toHaveLength(0);
  });

  it("warns when a leg exceeds the max DLS", () => {
    // A 90 deg turn over a single 30 m interval => 90 deg/30 m DLS.
    const rows = [
      { md: 0, dip: 0, azimuth: 0 },
      { md: 30, dip: 0, azimuth: 90 },
      { md: 60, dip: 0, azimuth: 90 },
    ];
    const warnings = checkPlanDlsWarnings(rows, 3);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toMatch(/exceeds max DLS/);
  });

  it("never warns when the limit is comfortably above the peak", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ delta: dbl(20, 40), dip: dbl(-70, -50), azimuth: dbl(80, 100) }), {
          minLength: 2,
          maxLength: 10,
        }),
        (legs) => {
          let md = 0;
          const rows = legs.map((leg, i) => {
            if (i > 0) md += leg.delta;
            return { md, dip: leg.dip, azimuth: leg.azimuth };
          });
          const stations = buildStations(rows);
          const peak = Math.max(...stations.map((s) => s.dls));
          expect(checkPlanDlsWarnings(rows, peak + 1)).toHaveLength(0);
        }
      ),
      { numRuns: 1000 }
    );
  });
});
