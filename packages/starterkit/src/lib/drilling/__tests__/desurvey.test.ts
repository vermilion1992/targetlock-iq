import { describe, expect, it } from "vitest";
import {
  buildDeviationSeries,
  buildStations,
  interpolateAtMd,
  planOffsetAtMd,
  positionOnPlanAtMd,
} from "../desurvey";
import { samplePlanStations, sampleActualStations } from "./fixtures";

describe("desurvey", () => {
  it("returns empty stations for empty input", () => {
    expect(buildStations([])).toEqual([]);
  });
  it("places collar at origin", () => {
    const stations = buildStations([{ md: 0, dip: -60, azimuth: 125 }]);
    expect(stations[0].e).toBeCloseTo(0, 5);
    expect(stations[0].n).toBeCloseTo(0, 5);
    expect(stations[0].d).toBeCloseTo(0, 5);
  });

  it("increases depth along planned sample", () => {
    const last = samplePlanStations[samplePlanStations.length - 1];
    expect(last.md).toBe(600);
    expect(last.d).toBeGreaterThan(0);
  });

  it("interpolates at intermediate MD", () => {
    const at15 = interpolateAtMd(samplePlanStations, 15);
    expect(at15).not.toBeNull();
    expect(at15!.md).toBe(15);
    expect(at15!.dip).toBeLessThan(0);
  });

  it("computes DLS on actual sample at 30 m interval", () => {
    const at30 = sampleActualStations.find((s) => s.md === 30);
    expect(at30).toBeDefined();
    expect(at30!.dls).toBeGreaterThan(0);
  });

  it("builds monotonic MD on actual surveys", () => {
    for (let i = 1; i < sampleActualStations.length; i += 1) {
      expect(sampleActualStations[i].md).toBeGreaterThan(
        sampleActualStations[i - 1].md
      );
    }
  });

  it("extrapolates beyond the last survey along hole direction", () => {
    const stations = buildStations([
      { md: 0, dip: -60, azimuth: 125 },
      { md: 30, dip: -60, azimuth: 125 },
    ]);
    const beyond = interpolateAtMd(stations, 45)!;
    expect(beyond.md).toBe(45);
    expect(beyond.d).toBeGreaterThan(stations[1].d);
  });

  it("uses minimum curvature for plan position between surveys", () => {
    const plan = [
      { md: 0, dip: -90, azimuth: 0 },
      { md: 60, dip: -60, azimuth: 90 },
    ];
    const linear = interpolateAtMd(buildStations(plan), 30)!;
    const onPath = positionOnPlanAtMd(plan, 30)!;
    expect(onPath.md).toBe(30);
    const linearOffset = Math.hypot(
      onPath.e - linear.e,
      onPath.n - linear.n,
      onPath.d - linear.d
    );
    expect(linearOffset).toBeGreaterThan(0.01);
  });

  it("matches deviation series and planOffsetAtMd", () => {
    const plan = buildStations([
      { md: 0, dip: -60, azimuth: 125 },
      { md: 30, dip: -61, azimuth: 126 },
      { md: 60, dip: -62, azimuth: 127 },
    ]);
    const actual = buildStations([
      { md: 0, dip: -60, azimuth: 125 },
      { md: 30, dip: -59, azimuth: 128 },
    ]);
    const series = buildDeviationSeries(plan, actual);
    expect(series[1].offset).toBeCloseTo(planOffsetAtMd(actual[1], plan)!, 5);
  });

  it("builds zero plan offset when actual matches plan", () => {
    const plan = buildStations([
      { md: 0, dip: -60, azimuth: 125 },
      { md: 30, dip: -61, azimuth: 126 },
    ]);
    const series = buildDeviationSeries(plan, plan);
    expect(series[1].offset).toBeCloseTo(0, 5);
    expect(series[1].dls).toBeCloseTo(plan[1].dls, 5);
  });
});
