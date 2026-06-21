import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  buildStations,
  interpolateAtMd,
  positionOnPlanAtMd,
} from "../desurvey";
import { DEG } from "../geometry";
import { surveyPathArb } from "./arbitraries";
import type { SurveyRecord } from "../types";

describe("buildStations — adversarial MD inputs", () => {
  it("does not produce NaN positions for any monotonic path (fuzz)", () => {
    fc.assert(
      fc.property(surveyPathArb, (records) => {
        const stations = buildStations(records);
        for (const s of stations) {
          expect(Number.isFinite(s.e)).toBe(true);
          expect(Number.isFinite(s.n)).toBe(true);
          expect(Number.isFinite(s.d)).toBe(true);
          expect(Number.isFinite(s.dls)).toBe(true);
        }
      }),
      { numRuns: 1500 }
    );
  });

  it("duplicate MD stations do not move the position and report zero DLS", () => {
    const stations = buildStations([
      { md: 0, dip: -60, azimuth: 90 },
      { md: 30, dip: -57, azimuth: 90 },
      { md: 30, dip: -57, azimuth: 90 },
    ]);
    expect(stations).toHaveLength(3);
    expect(stations[2]!.e).toBeCloseTo(stations[1]!.e, 9);
    expect(stations[2]!.n).toBeCloseTo(stations[1]!.n, 9);
    expect(stations[2]!.d).toBeCloseTo(stations[1]!.d, 9);
    expect(stations[2]!.dls).toBe(0);
  });

  it("FIX: non-increasing MD never integrates a reversed (backward) path", () => {
    const stations = buildStations([
      { md: 0, dip: -90, azimuth: 0 },
      { md: 100, dip: -90, azimuth: 0 },
      { md: 60, dip: -90, azimuth: 0 }, // MD goes backwards
    ]);
    // The clamped step adds no displacement, so depth cannot decrease.
    expect(stations[2]!.d).toBeGreaterThanOrEqual(stations[1]!.d - 1e-9);
    expect(stations[2]!.d).toBeCloseTo(stations[1]!.d, 9);
  });

  it("single-record path sits at the collar with zero DLS and dogleg", () => {
    const stations = buildStations([{ md: 0, dip: -60, azimuth: 90 }]);
    expect(stations).toHaveLength(1);
    expect(stations[0]).toMatchObject({ e: 0, n: 0, d: 0, dls: 0, dogleg: 0 });
  });

  it("deep straight hole (10 km at 1 m spacing) stays finite and matches trig depth", () => {
    const records: SurveyRecord[] = [];
    for (let md = 0; md <= 10000; md += 1) {
      records.push({ md, dip: -60, azimuth: 90 });
    }
    const stations = buildStations(records);
    const end = stations[stations.length - 1]!;
    expect(Number.isFinite(end.d)).toBe(true);
    // Straight hole: depth = MD * sin(60), easting = MD * cos(60) along az 90.
    expect(end.d).toBeCloseTo(10000 * Math.sin(60 * DEG), 3);
    expect(end.e).toBeCloseTo(10000 * Math.cos(60 * DEG), 3);
    // Monotonic non-decreasing depth.
    for (let i = 1; i < stations.length; i += 1) {
      expect(stations[i]!.d).toBeGreaterThanOrEqual(stations[i - 1]!.d - 1e-9);
    }
  });
});

describe("interpolateAtMd — boundaries and duplicate spans", () => {
  const stations = buildStations([
    { md: 0, dip: -60, azimuth: 90 },
    { md: 30, dip: -60, azimuth: 90 },
    { md: 60, dip: -50, azimuth: 100 },
  ]);

  it("returns a clone of the first station at or before the first MD", () => {
    const at = interpolateAtMd(stations, -5);
    expect(at).not.toBeNull();
    expect(at!.md).toBe(stations[0]!.md);
    expect(at!.e).toBeCloseTo(0, 9);
  });

  it("extrapolates along the last tangent beyond the last station", () => {
    const beyond = interpolateAtMd(stations, 90)!;
    const last = stations[stations.length - 1]!;
    expect(beyond.md).toBe(90);
    expect(beyond.d).toBeGreaterThan(last.d);
  });

  it("FIX: duplicate-MD stations snap cleanly instead of producing a wrong t", () => {
    const dupe = buildStations([
      { md: 0, dip: -60, azimuth: 90 },
      { md: 30, dip: -60, azimuth: 90 },
      { md: 30, dip: -45, azimuth: 90 },
    ]);
    const at = interpolateAtMd(dupe, 30)!;
    expect(Number.isFinite(at.e)).toBe(true);
    expect(Number.isFinite(at.d)).toBe(true);
    // Snaps to the lower station (same position as the first MD=30 station).
    expect(at.e).toBeCloseTo(dupe[1]!.e, 9);
    expect(at.d).toBeCloseTo(dupe[1]!.d, 9);
  });
});

describe("positionOnPlanAtMd — branch coverage and MC vs linear", () => {
  const plan: SurveyRecord[] = [
    { md: 0, dip: -90, azimuth: 0 },
    { md: 100, dip: -45, azimuth: 0 },
    { md: 200, dip: -45, azimuth: 0 },
  ];
  const planStations = buildStations(plan);

  it("at an exact station MD equals the desurveyed station", () => {
    const at = positionOnPlanAtMd(plan, 100)!;
    expect(at.e).toBeCloseTo(planStations[1]!.e, 6);
    expect(at.n).toBeCloseTo(planStations[1]!.n, 6);
    expect(at.d).toBeCloseTo(planStations[1]!.d, 6);
  });

  it("before the first station returns the collar", () => {
    const at = positionOnPlanAtMd(plan, -10)!;
    expect(at.e).toBeCloseTo(0, 9);
    expect(at.d).toBeCloseTo(0, 9);
  });

  it("after the last station extrapolates downhole", () => {
    const at = positionOnPlanAtMd(plan, 260)!;
    expect(at.md).toBe(260);
    expect(at.d).toBeGreaterThan(planStations[2]!.d);
  });

  it("on the curved build section, the MC plan position differs from linear interpolation", () => {
    const mid = 50; // inside the -90 -> -45 build
    const onPath = positionOnPlanAtMd(plan, mid)!;
    const linear = interpolateAtMd(planStations, mid)!;
    const gap = Math.hypot(onPath.e - linear.e, onPath.n - linear.n, onPath.d - linear.d);
    // Documents that interpolateAtMd (linear E/N/D) is NOT the on-path MC position.
    expect(gap).toBeGreaterThan(0.01);
  });

  it("empty plan returns null", () => {
    expect(positionOnPlanAtMd([], 100)).toBeNull();
  });
});
