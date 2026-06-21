import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  buildDaughterPlanFromKickoff,
  doglegMotherToDaughter,
  feasibilityClass,
  kickoffStationFromMother,
  methodSuitabilityForDls,
  requiredDaughterHeading,
  separationMotherDaughter,
} from "../branch-program";
import { buildStations, interpolateAtMd } from "../desurvey";
import {
  add,
  distance,
  dot,
  doglegDeg,
  normalizeVector,
  scale,
  subtract,
  vectorFromDipAz,
} from "../geometry";
import { surveyPathArb, dbl } from "./arbitraries";

const interval = fc.constantFrom(10, 15, 30);

describe("kickoffStationFromMother — continuity with the actual mother path", () => {
  it("returns the desurveyed mother station (position + heading) at the kickoff MD", () => {
    fc.assert(
      fc.property(surveyPathArb, dbl(0, 1), (records, frac) => {
        const stations = buildStations(records);
        const mdMin = stations[0]!.md;
        const mdMax = stations[stations.length - 1]!.md;
        const kickoffMd = mdMin + frac * (mdMax - mdMin);
        const kickoff = kickoffStationFromMother(records, kickoffMd);
        const at = interpolateAtMd(stations, kickoffMd);
        expect(kickoff).not.toBeNull();
        expect(at).not.toBeNull();
        expect(kickoff!.e).toBeCloseTo(at!.e, 9);
        expect(kickoff!.n).toBeCloseTo(at!.n, 9);
        expect(kickoff!.d).toBeCloseTo(at!.d, 9);
        // The "mother heading" snapshot must equal the station heading.
        expect(kickoff!.motherDip).toBe(kickoff!.dip);
        expect(kickoff!.motherAzimuth).toBe(kickoff!.azimuth);
      }),
      { numRuns: 1000 }
    );
  });

  it("returns null for empty actual records", () => {
    expect(kickoffStationFromMother([], 100)).toBeNull();
  });
});

describe("requiredDaughterHeading — points straight at the branch target", () => {
  it("the heading vector is parallel to (target - kickoff)", () => {
    fc.assert(
      fc.property(
        fc.record({ e: dbl(-500, 500), n: dbl(-500, 500), d: dbl(-500, 500) }),
        fc.record({ e: dbl(-500, 500), n: dbl(-500, 500), d: dbl(-500, 500) }),
        (kickoff, target) => {
          const delta = subtract(target, kickoff);
          fc.pre(Math.hypot(delta.e, delta.n, delta.d) > 1); // well-defined direction
          const heading = requiredDaughterHeading(kickoff, target);
          const headingVec = vectorFromDipAz(heading.dip, heading.azimuth);
          const unitDelta = normalizeVector(delta);
          // Parallel => dot of unit vectors is +1 (clear of the vertical azimuth
          // singularity, where azimuth is undefined).
          fc.pre(Math.abs(heading.dip) <= 88);
          expect(dot(headingVec, unitDelta)).toBeCloseTo(1, 6);
        }
      ),
      { numRuns: 2000 }
    );
  });
});

describe("doglegMotherToDaughter — closed form", () => {
  it("equals the unit-vector dogleg scaled by the 30 m interval", () => {
    fc.assert(
      fc.property(dbl(-88, 88), dbl(0, 360), dbl(-88, 88), dbl(0, 360), interval, (md, ma, dd, da, iv) => {
        const expected = doglegDeg(vectorFromDipAz(md, ma), vectorFromDipAz(dd, da)) / (iv / 30);
        expect(doglegMotherToDaughter(md, ma, dd, da, iv)).toBeCloseTo(expected, 9);
      }),
      { numRuns: 2000 }
    );
  });

  it("is zero for a non-positive interval", () => {
    expect(doglegMotherToDaughter(-45, 0, -30, 90, 0)).toBe(0);
  });
});

describe("methodSuitabilityForDls / feasibilityClass — decision boundaries", () => {
  it("classifies required DLS into the correct method band", () => {
    expect(methodSuitabilityForDls(0)).toBe("natural");
    expect(methodSuitabilityForDls(1.5)).toBe("natural");
    expect(methodSuitabilityForDls(1.5001)).toBe("parameter");
    expect(methodSuitabilityForDls(2.5)).toBe("parameter");
    expect(methodSuitabilityForDls(2.5001)).toBe("motor-navi");
    expect(methodSuitabilityForDls(5)).toBe("motor-navi");
    expect(methodSuitabilityForDls(5.0001)).toBe("devidrill-dcd");
    expect(methodSuitabilityForDls(9)).toBe("devidrill-dcd");
    expect(methodSuitabilityForDls(9.0001)).toBe("wedge");
  });

  it("monotonically increases band severity with required DLS", () => {
    const rank = { natural: 0, parameter: 1, "motor-navi": 2, "devidrill-dcd": 3, wedge: 4 };
    fc.assert(
      fc.property(dbl(0, 15), dbl(0, 15), (a, b) => {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        expect(rank[methodSuitabilityForDls(lo)]).toBeLessThanOrEqual(rank[methodSuitabilityForDls(hi)]);
      }),
      { numRuns: 1000 }
    );
  });

  it("flags high-DLS branches as review / not-recommended", () => {
    expect(feasibilityClass(1)).toBe("ok");
    expect(feasibilityClass(6)).toBe("review");
    expect(feasibilityClass(10)).toBe("not-recommended");
    expect(feasibilityClass(1, "contractor-review")).toBe("review");
    expect(feasibilityClass(3, "natural")).toBe("not-recommended");
  });
});

describe("buildDaughterPlanFromKickoff — heading blend toward target", () => {
  it("starts on the mother heading, ends on the required heading, with monotonic MD", () => {
    fc.assert(
      fc.property(
        surveyPathArb,
        dbl(0, 1),
        fc.record({ e: dbl(-400, 400), n: dbl(-400, 400), d: dbl(50, 600) }),
        fc.constantFrom(60, 120, 180),
        interval,
        (records, frac, targetOffset, legLengthM, surveyInterval) => {
          const stations = buildStations(records);
          const mdMin = stations[0]!.md;
          const mdMax = stations[stations.length - 1]!.md;
          const kickoffMd = mdMin + frac * (mdMax - mdMin);
          const kickoff = kickoffStationFromMother(records, kickoffMd)!;
          const target = add({ e: kickoff.e, n: kickoff.n, d: kickoff.d }, targetOffset);
          const rows = buildDaughterPlanFromKickoff({
            kickoffMd,
            motherActual: records,
            target,
            legLengthM,
            surveyInterval,
          });
          expect(rows.length).toBeGreaterThanOrEqual(2);
          // First row sits at the kickoff on the mother heading.
          expect(rows[0]!.md).toBeCloseTo(kickoffMd, 9);
          expect(rows[0]!.dip).toBeCloseTo(kickoff.dip, 9);
          // MD strictly increases.
          for (let i = 1; i < rows.length; i += 1) {
            expect(rows[i]!.md).toBeGreaterThan(rows[i - 1]!.md);
          }
          // All finite.
          for (const r of rows) {
            expect(Number.isFinite(r.dip) && Number.isFinite(r.azimuth)).toBe(true);
          }
          // Final row reaches the required heading toward the target.
          const heading = requiredDaughterHeading(kickoff, target);
          fc.pre(Math.abs(heading.dip) <= 88);
          expect(rows[rows.length - 1]!.dip).toBeCloseTo(heading.dip, 6);
        }
      ),
      { numRuns: 1000 }
    );
  });
});

describe("separationMotherDaughter — closest-approach detection", () => {
  it("reports ~zero separation and a warning for coincident paths", () => {
    const records = [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 100, dip: -60, azimuth: 90 },
      { md: 200, dip: -60, azimuth: 90 },
    ];
    const stations = buildStations(records);
    const sep = separationMotherDaughter(stations, stations);
    expect(sep.minDistanceM).toBeLessThan(0.5);
    expect(sep.status).toBe("warning");
  });

  it("reports a healthy separation for a laterally offset daughter", () => {
    const mother = buildStations([
      { md: 0, dip: -60, azimuth: 90 },
      { md: 200, dip: -60, azimuth: 90 },
    ]);
    // Same trajectory shifted a constant 50 m north => 50 m apart everywhere.
    const daughter = mother.map((s) => ({ ...s, n: s.n + 50 }));
    const sep = separationMotherDaughter(mother, daughter);
    expect(sep.minDistanceM).toBeGreaterThan(5);
    expect(sep.status).toBe("ok");
  });
});
