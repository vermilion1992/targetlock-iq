import { describe, expect, it } from "vitest";
import {
  buildActualTooltipLines,
  clampTooltipPosition,
  nearestStationMarker,
} from "@/components/charts/chart-hit";
import { buildStations, planOffsetAtMd } from "../desurvey";

const plan = buildStations([
  { md: 0, dip: -60, azimuth: 125 },
  { md: 30, dip: -61, azimuth: 126 },
]);

const actual = buildStations([
  { md: 0, dip: -60, azimuth: 125 },
  { md: 30, dip: -59, azimuth: 128 },
]);

describe("chart-hit", () => {
  it("computes offset from plan at survey MD", () => {
    const offset = planOffsetAtMd(actual[1], plan);
    expect(offset).not.toBeNull();
    expect(offset!).toBeGreaterThan(0);
    expect(offset!).toBeLessThan(3);
  });

  it("finds nearest marker within radius", () => {
    const markers = [
      { md: 30, x: 50, y: 50, kind: "actual" as const, station: actual[1] },
      { md: 200, x: 200, y: 200, kind: "plan" as const, station: plan[1] },
    ];
    const hit = nearestStationMarker(markers, 52, 48, 10);
    expect(hit?.md).toBe(30);
    const miss = nearestStationMarker(markers, 10, 10, 5);
    expect(miss).toBeNull();
  });

  it("builds actual tooltip with offset line", () => {
    const lines = buildActualTooltipLines(actual[1], plan);
    expect(lines[0]).toMatch(/^MD /);
    expect(lines.some((l) => l.startsWith("Offset from plan"))).toBe(true);
    expect(lines.some((l) => l.startsWith("DLS"))).toBe(true);
  });

  it("clamps tooltip inside container", () => {
    const pos = clampTooltipPosition(300, 20, 160, 80, 320, 240);
    expect(pos.left).toBeLessThanOrEqual(320 - 160 - 8);
    expect(pos.top).toBeGreaterThanOrEqual(8);
  });
});
