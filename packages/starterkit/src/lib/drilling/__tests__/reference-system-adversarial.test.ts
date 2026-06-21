import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  convertTargetBearingReference,
  fromTrueAzimuth,
  normalizeReferenceSystem,
  toTrueAzimuth,
  type NorthReference,
} from "../reference-system";
import { computeHole } from "../compute";
import { buildStations } from "../desurvey";
import { normalizeAngle, shortestAngle } from "../geometry";
import { aziArb, dbl } from "./arbitraries";
import type { SurveyRecord } from "../types";

const refArb = fc.constantFrom<NorthReference>("grid", "true", "magnetic");

describe("reference conversions — round-trip and wrap (fuzz)", () => {
  it("toTrueAzimuth and fromTrueAzimuth are inverses for any reference", () => {
    fc.assert(
      fc.property(aziArb, refArb, dbl(-45, 45), dbl(-45, 45), (az, ref, rot, dec) => {
        const config = normalizeReferenceSystem({
          gridRotationDeg: rot,
          magneticDeclinationDeg: dec,
        });
        const trueAz = toTrueAzimuth(az, ref, config);
        const back = fromTrueAzimuth(trueAz, ref, config);
        expect(Math.abs(shortestAngle(normalizeAngle(az), back))).toBeLessThan(1e-6);
      }),
      { numRuns: 1500 }
    );
  });

  it("convertTargetBearingReference round-trips across any reference pair", () => {
    fc.assert(
      fc.property(aziArb, refArb, refArb, dbl(-45, 45), dbl(-45, 45), (az, from, to, rot, dec) => {
        const config = normalizeReferenceSystem({
          gridRotationDeg: rot,
          magneticDeclinationDeg: dec,
        });
        const converted = convertTargetBearingReference(az, from, to, config);
        const back = convertTargetBearingReference(converted, to, from, config);
        expect(Math.abs(shortestAngle(normalizeAngle(az), back))).toBeLessThan(1e-6);
      }),
      { numRuns: 1500 }
    );
  });

  it("known-answer wrap: 350 grid + 20 rotation = 10 true", () => {
    const config = normalizeReferenceSystem({ gridRotationDeg: 20 });
    expect(toTrueAzimuth(350, "grid", config)).toBeCloseTo(10, 9);
  });

  it("known-answer wrap: 350 magnetic + 20 declination = 10 true", () => {
    const config = normalizeReferenceSystem({ magneticDeclinationDeg: 20 });
    expect(toTrueAzimuth(350, "magnetic", config)).toBeCloseTo(10, 9);
  });
});

describe("normalizeReferenceSystem — invalid input hardening", () => {
  it("falls back to grid for invalid references and zeroes non-finite rotations", () => {
    const config = normalizeReferenceSystem({
      planReference: "bogus" as NorthReference,
      surveyReference: "MAGNETIC" as NorthReference,
      outputReference: "" as NorthReference,
      gridRotationDeg: NaN,
      magneticDeclinationDeg: Infinity,
    });
    expect(config.planReference).toBe("grid");
    expect(config.surveyReference).toBe("grid");
    expect(config.outputReference).toBe("grid");
    expect(config.gridRotationDeg).toBe(0);
    expect(config.magneticDeclinationDeg).toBe(0);
  });
});

describe("computeHole — magnetic survey path and output display", () => {
  const plan: SurveyRecord[] = [
    { md: 0, dip: -60, azimuth: 90 },
    { md: 100, dip: -60, azimuth: 90 },
    { md: 300, dip: -60, azimuth: 90 },
  ];
  const actualMagnetic: SurveyRecord[] = [
    { md: 0, dip: -60, azimuth: 88 },
    { md: 150, dip: -58, azimuth: 92 },
  ];
  const target = { md: 300, e: 0, n: 0, d: 0, tolerance: 6, maxDls: 3, nextInterval: 30 };

  it("magnetic survey azimuths are converted to true before desurvey", () => {
    const declination = 12;
    const computed = computeHole(plan, actualMagnetic, target, null, null, {
      planReference: "true",
      surveyReference: "magnetic",
      outputReference: "true",
      gridRotationDeg: 0,
      magneticDeclinationDeg: declination,
    });
    // Direct true-frame desurvey of the same survey with declination applied.
    const expectedStations = buildStations(
      actualMagnetic.map((r) => ({ ...r, azimuth: normalizeAngle(r.azimuth + declination) }))
    );
    const last = computed.actualStations[computed.actualStations.length - 1]!;
    const exp = expectedStations[expectedStations.length - 1]!;
    expect(last.e).toBeCloseTo(exp.e, 6);
    expect(last.n).toBeCloseTo(exp.n, 6);
    expect(last.d).toBeCloseTo(exp.d, 6);
  });

  it("missing-declination warning fires when magnetic is used with zero declination", () => {
    const computed = computeHole(plan, actualMagnetic, target, null, null, {
      planReference: "true",
      surveyReference: "magnetic",
      outputReference: "true",
      gridRotationDeg: 0,
      magneticDeclinationDeg: 0,
    });
    expect(computed.referenceWarnings.some((w) => w.id === "missing-declination")).toBe(true);
  });

  it("outputReference rotates only the displayed azimuth back from true", () => {
    const rotation = 15;
    const computed = computeHole(plan, actualMagnetic, target, null, null, {
      planReference: "true",
      surveyReference: "true", // internal azimuths already true
      outputReference: "grid",
      gridRotationDeg: rotation,
      magneticDeclinationDeg: 0,
    });
    const displayed = computed.recommendation!.current.azimuth;
    const lastTrueAzimuth = actualMagnetic[actualMagnetic.length - 1]!.azimuth;
    // Displayed grid azimuth = true - gridRotation.
    expect(Math.abs(shortestAngle(displayed, normalizeAngle(lastTrueAzimuth - rotation)))).toBeLessThan(1e-6);
  });

  it("INVARIANT: positions are identical whether output is shown in true or grid", () => {
    const base = {
      planReference: "true" as NorthReference,
      surveyReference: "true" as NorthReference,
      gridRotationDeg: 15,
      magneticDeclinationDeg: 0,
    };
    const asTrue = computeHole(plan, actualMagnetic, target, null, null, {
      ...base,
      outputReference: "true",
    });
    const asGrid = computeHole(plan, actualMagnetic, target, null, null, {
      ...base,
      outputReference: "grid",
    });
    const a = asTrue.actualStations[asTrue.actualStations.length - 1]!;
    const b = asGrid.actualStations[asGrid.actualStations.length - 1]!;
    expect(b.e).toBeCloseTo(a.e, 9);
    expect(b.n).toBeCloseTo(a.n, 9);
    expect(b.d).toBeCloseTo(a.d, 9);
  });
});
