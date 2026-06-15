import { describe, expect, it } from "vitest";
import {
  buildStations,
  buildStationsWithMethod,
  compareDesurveyMethods,
} from "../desurvey";
import type { SurveyRecord } from "../types";

const STRAIGHT: SurveyRecord[] = [
  { md: 0, dip: -60, azimuth: 90 },
  { md: 100, dip: -60, azimuth: 90 },
  { md: 200, dip: -60, azimuth: 90 },
];

const CURVED: SurveyRecord[] = [
  { md: 0, dip: -60, azimuth: 90 },
  { md: 100, dip: -63, azimuth: 94 },
  { md: 200, dip: -66, azimuth: 98 },
  { md: 300, dip: -69, azimuth: 102 },
];

describe("buildStationsWithMethod", () => {
  it("matches minimum curvature exactly on straight holes", () => {
    const minCurve = buildStations(STRAIGHT);
    const balanced = buildStationsWithMethod(STRAIGHT, "balanced-tangential");
    const roc = buildStationsWithMethod(STRAIGHT, "radius-of-curvature");

    const last = minCurve[minCurve.length - 1]!;
    const lastBalanced = balanced[balanced.length - 1]!;
    const lastRoc = roc[roc.length - 1]!;

    expect(lastBalanced.e).toBeCloseTo(last.e, 6);
    expect(lastBalanced.n).toBeCloseTo(last.n, 6);
    expect(lastBalanced.d).toBeCloseTo(last.d, 6);
    expect(lastRoc.e).toBeCloseTo(last.e, 4);
    expect(lastRoc.n).toBeCloseTo(last.n, 4);
    expect(lastRoc.d).toBeCloseTo(last.d, 4);
  });

  it("returns the identical pipeline for minimum-curvature", () => {
    const direct = buildStations(CURVED);
    const viaMethod = buildStationsWithMethod(CURVED, "minimum-curvature");
    expect(viaMethod).toEqual(direct);
  });

  it("methods stay close but not identical on curved holes", () => {
    const minCurve = buildStations(CURVED);
    const balanced = buildStationsWithMethod(CURVED, "balanced-tangential");
    const roc = buildStationsWithMethod(CURVED, "radius-of-curvature");

    const end = minCurve[minCurve.length - 1]!;
    const endBalanced = balanced[balanced.length - 1]!;
    const endRoc = roc[roc.length - 1]!;

    const deltaBalanced = Math.hypot(
      endBalanced.e - end.e,
      endBalanced.n - end.n,
      endBalanced.d - end.d
    );
    const deltaRoc = Math.hypot(
      endRoc.e - end.e,
      endRoc.n - end.n,
      endRoc.d - end.d
    );

    // Mild curvature at 100 m stations: differences are decimetric at most.
    expect(deltaBalanced).toBeGreaterThan(0);
    expect(deltaBalanced).toBeLessThan(1);
    expect(deltaRoc).toBeLessThan(1);
  });

  it("radius of curvature handles azimuth wraparound", () => {
    const records: SurveyRecord[] = [
      { md: 0, dip: -60, azimuth: 358 },
      { md: 100, dip: -60, azimuth: 2 },
    ];
    const roc = buildStationsWithMethod(records, "radius-of-curvature");
    const end = roc[roc.length - 1]!;
    // Heading is essentially due north; easting stays near zero.
    expect(Math.abs(end.e)).toBeLessThan(1);
    expect(end.n).toBeGreaterThan(40);
  });
});

describe("compareDesurveyMethods", () => {
  it("returns all three methods with min-curvature delta of zero", () => {
    const comparison = compareDesurveyMethods(CURVED);
    expect(comparison).toHaveLength(3);
    const minCurve = comparison.find((c) => c.method === "minimum-curvature")!;
    expect(minCurve.deltaFromMinCurveM).toBe(0);
    for (const entry of comparison) {
      expect(Number.isFinite(entry.end.e)).toBe(true);
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it("returns empty for fewer than two records", () => {
    expect(compareDesurveyMethods([CURVED[0]!])).toHaveLength(0);
  });
});
