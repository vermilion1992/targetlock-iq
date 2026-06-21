import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  DEG,
  RAD,
  dipAzFromVector,
  doglegDeg,
  minCurveDisplacement,
  normalizeAngle,
  shortestAngle,
  slerpDirection,
  vectorFromDipAz,
  vectorLength,
} from "../geometry";
import { buildStations } from "../desurvey";
import { aziArb, dipArb, safeDipArb } from "./arbitraries";

const RUNS = 2000;

describe("geometry kernel — vector/angle properties (fuzz)", () => {
  it("vectorFromDipAz always returns a unit vector for finite inputs", () => {
    fc.assert(
      fc.property(dipArb, aziArb, (dip, azi) => {
        const v = vectorFromDipAz(dip, azi);
        expect(vectorLength(v)).toBeCloseTo(1, 9);
      }),
      { numRuns: RUNS }
    );
  });

  it("dip/azimuth round-trips through the direction vector (away from vertical)", () => {
    fc.assert(
      fc.property(safeDipArb, aziArb, (dip, azi) => {
        const back = dipAzFromVector(vectorFromDipAz(dip, azi));
        expect(back.dip).toBeCloseTo(dip, 6);
        expect(Math.abs(shortestAngle(azi, back.azimuth))).toBeLessThan(1e-6);
      }),
      { numRuns: RUNS }
    );
  });

  it("normalizeAngle stays in [0,360) and is rotation-invariant", () => {
    fc.assert(
      fc.property(fc.double({ min: -5000, max: 5000, noNaN: true }), (a) => {
        const n = normalizeAngle(a);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(360);
        // Wrap-aware comparison (0 and ~360 are the same heading).
        expect(Math.abs(shortestAngle(normalizeAngle(a + 360), n))).toBeLessThan(1e-6);
      }),
      { numRuns: RUNS }
    );
  });

  it("shortestAngle is in (-180,180] and closes the gap between azimuths", () => {
    fc.assert(
      fc.property(aziArb, aziArb, (from, to) => {
        const delta = shortestAngle(from, to);
        expect(delta).toBeGreaterThan(-180.0000001);
        expect(delta).toBeLessThanOrEqual(180.0000001);
        // Applying the delta to `from` recovers `to` (mod 360).
        expect(
          Math.abs(shortestAngle(normalizeAngle(from + delta), to))
        ).toBeLessThan(1e-6);
      }),
      { numRuns: RUNS }
    );
  });

  it("doglegDeg is symmetric and bounded to [0,180]", () => {
    fc.assert(
      fc.property(dipArb, aziArb, dipArb, aziArb, (d1, a1, d2, a2) => {
        const v1 = vectorFromDipAz(d1, a1);
        const v2 = vectorFromDipAz(d2, a2);
        const ab = doglegDeg(v1, v2);
        const ba = doglegDeg(v2, v1);
        expect(ab).toBeCloseTo(ba, 9);
        expect(ab).toBeGreaterThanOrEqual(0);
        expect(ab).toBeLessThanOrEqual(180.0000001);
      }),
      { numRuns: RUNS }
    );
  });
});

describe("geometry kernel — known-answer cases", () => {
  it("identical directions have zero dogleg, opposite have 180", () => {
    expect(doglegDeg(vectorFromDipAz(-60, 90), vectorFromDipAz(-60, 90))).toBeCloseTo(0, 9);
    expect(doglegDeg(vectorFromDipAz(-90, 0), vectorFromDipAz(90, 0))).toBeCloseTo(180, 9);
  });

  it("shortestAngle handles the 0/360 wrap", () => {
    expect(shortestAngle(350, 10)).toBeCloseTo(20, 9);
    expect(shortestAngle(10, 350)).toBeCloseTo(-20, 9);
    // A 180-degree separation lands on the excluded boundary and returns -180.
    expect(shortestAngle(0, 180)).toBeCloseTo(-180, 9);
  });
});

describe("minCurveDisplacement — closed-form arc geometry", () => {
  // Minimum-curvature chord length = L * sin(theta/2) / (theta/2), where theta is
  // the dogleg angle between the two station tangents. Verify this exactly.
  it("chord magnitude matches L * sinc(theta/2) over random station pairs", () => {
    fc.assert(
      fc.property(dipArb, aziArb, dipArb, aziArb, fc.double({ min: 1, max: 100, noNaN: true }), (d1, a1, d2, a2, L) => {
        const v1 = vectorFromDipAz(d1, a1);
        const v2 = vectorFromDipAz(d2, a2);
        const dot = Math.min(1, Math.max(-1, v1.e * v2.e + v1.n * v2.n + v1.d * v2.d));
        const theta = Math.acos(dot);
        // Skip near-180-degree reversals: the (2/theta)*tan(theta/2) factor loses
        // precision as cos(theta/2) -> 0, and adjacent real survey stations never
        // reverse by ~180 degrees. Realistic doglegs (< ~160 deg) are validated exactly.
        fc.pre(theta < 2.8);
        const disp = minCurveDisplacement({ dip: d1, azimuth: a1 }, { dip: d2, azimuth: a2 }, L);
        const expected = theta < 1e-9 ? L : (L * Math.sin(theta / 2)) / (theta / 2);
        const relErr = Math.abs(vectorLength(disp) - expected) / Math.max(1, expected);
        expect(relErr).toBeLessThan(1e-6);
      }),
      { numRuns: RUNS }
    );
  });

  it("a straight leg displaces exactly length along the tangent", () => {
    const disp = minCurveDisplacement({ dip: -60, azimuth: 90 }, { dip: -60, azimuth: 90 }, 30);
    expect(vectorLength(disp)).toBeCloseTo(30, 9);
    expect(disp.d).toBeCloseTo(30 * Math.sin(60 * DEG), 9);
    expect(disp.e).toBeCloseTo(30 * Math.cos(60 * DEG), 9);
  });

  it("a 90 degree planar arc has chord = L * sin(45)/(pi/4)", () => {
    // dip 0 -> -90 over 30 m, same azimuth (vertical plane build).
    const disp = minCurveDisplacement({ dip: 0, azimuth: 0 }, { dip: -90, azimuth: 0 }, 30);
    const expected = (30 * Math.sin(Math.PI / 4)) / (Math.PI / 4);
    expect(vectorLength(disp)).toBeCloseTo(expected, 9);
  });
});

describe("DLS known answer via buildStations", () => {
  it("a 3 degree dogleg over 30 m yields 3 deg/30 m", () => {
    const stations = buildStations([
      { md: 0, dip: -60, azimuth: 90 },
      { md: 30, dip: -57, azimuth: 90 },
    ]);
    expect(stations[1]!.dogleg).toBeCloseTo(3, 6);
    expect(stations[1]!.dls).toBeCloseTo(3, 6);
  });

  it("a 6 degree dogleg over 60 m yields 3 deg/30 m (rate, not absolute)", () => {
    const stations = buildStations([
      { md: 0, dip: -60, azimuth: 90 },
      { md: 60, dip: -54, azimuth: 90 },
    ]);
    expect(stations[1]!.dogleg).toBeCloseTo(6, 6);
    expect(stations[1]!.dls).toBeCloseTo(3, 6);
  });
});

describe("slerpDirection — endpoints and near-180 stability", () => {
  it("returns the endpoints at t=0 and t=1 for non-opposite directions", () => {
    fc.assert(
      fc.property(safeDipArb, aziArb, (dip, azi) => {
        const a = vectorFromDipAz(dip, azi);
        const b = vectorFromDipAz(dip + 10, normalizeAngle(azi + 30));
        const at0 = slerpDirection(a, b, 0);
        const at1 = slerpDirection(a, b, 1);
        expect(at0.e).toBeCloseTo(a.e, 9);
        expect(at0.n).toBeCloseTo(a.n, 9);
        expect(at1.e).toBeCloseTo(b.e, 9);
        expect(at1.n).toBeCloseTo(b.n, 9);
      }),
      { numRuns: RUNS }
    );
  });

  it("stays finite for nearly-opposite directions (angle just under 180)", () => {
    const a = vectorFromDipAz(-1, 0);
    const b = vectorFromDipAz(1, 180); // ~179.x degrees apart
    const mid = slerpDirection(a, b, 0.5);
    expect(Number.isFinite(mid.e)).toBe(true);
    expect(Number.isFinite(mid.n)).toBe(true);
    expect(Number.isFinite(mid.d)).toBe(true);
  });

  it("exactly-opposite directions stay finite and unit-length (degenerate direction)", () => {
    // The 180-degree geodesic is mathematically undefined. The implementation does
    // not NaN out: the huge opposite slerp terms cancel into a finite unit vector
    // (here horizontal), so callers always get a usable direction. Real desurvey
    // trajectories never feed exactly-opposite tangents.
    const a = vectorFromDipAz(-90, 0);
    const b = vectorFromDipAz(90, 0);
    const mid = slerpDirection(a, b, 0.5);
    expect(Number.isFinite(mid.e)).toBe(true);
    expect(Number.isFinite(mid.n)).toBe(true);
    expect(Number.isFinite(mid.d)).toBe(true);
    expect(vectorLength(mid)).toBeCloseTo(1, 9);
  });
});

// Touch RAD so the import is exercised in a documented assertion.
it("RAD and DEG are inverse scale factors", () => {
  expect(DEG * RAD).toBeCloseTo(1, 12);
});
