import fc from "fast-check";
import type { SurveyRecord } from "../types";

/** Finite double in a closed range, never NaN/Infinity. */
export function dbl(min: number, max: number): fc.Arbitrary<number> {
  return fc.double({ min, max, noNaN: true, noDefaultInfinity: true });
}

/** Full dip range, negative = down. */
export const dipArb = dbl(-90, 90);

/** Dip range that avoids the near-vertical azimuth singularity. */
export const safeDipArb = dbl(-85, 85);

/** Azimuth 0..360 (inclusive of wrap-prone extremes). */
export const aziArb = dbl(0, 360);

/** Latitude / longitude in degrees. */
export const latArb = dbl(-89.9, 89.9);
export const lonArb = dbl(-180, 180);

/** Finite ENU vector within a bounded box (metres). */
export function vec3Arb(span = 1000): fc.Arbitrary<{ e: number; n: number; d: number }> {
  return fc.record({ e: dbl(-span, span), n: dbl(-span, span), d: dbl(-span, span) });
}

/**
 * Monotonically increasing-MD survey path (>= 2 stations) with strictly
 * positive intervals, suitable for buildStations / desurvey property tests.
 */
export const surveyPathArb: fc.Arbitrary<SurveyRecord[]> = fc
  .record({
    startMd: dbl(0, 50),
    legs: fc.array(
      fc.record({ delta: dbl(1, 60), dip: dipArb, azimuth: aziArb }),
      { minLength: 2, maxLength: 25 }
    ),
  })
  .map(({ startMd, legs }) => {
    let md = startMd;
    return legs.map((leg, i) => {
      if (i > 0) md += leg.delta;
      return { md, dip: leg.dip, azimuth: leg.azimuth } as SurveyRecord;
    });
  });
