import { describe, expect, it } from "vitest";
import {
  clamp,
  dipAzFromVector,
  directionLabel,
  doglegDeg,
  minCurveDisplacement,
  normalizeAngle,
  normalizeVector,
  shortestAngle,
  slerpDirection,
  vectorFromDipAz,
  distance,
} from "../geometry";

describe("geometry", () => {
  it("normalizes azimuth to 0–360", () => {
    expect(normalizeAngle(370)).toBe(10);
    expect(normalizeAngle(-10)).toBe(350);
    expect(normalizeAngle(360)).toBe(0);
  });

  it("computes shortest angle delta", () => {
    expect(shortestAngle(350, 10)).toBe(20);
    expect(shortestAngle(10, 350)).toBe(-20);
    expect(shortestAngle(180, -180)).toBe(0);
  });

  it("clamps values to range", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });

  it("returns zero dogleg for identical directions", () => {
    const v = vectorFromDipAz(-60, 125);
    expect(doglegDeg(v, v)).toBeCloseTo(0, 5);
  });

  it("returns 180 deg dogleg for opposite directions", () => {
    const up = vectorFromDipAz(-90, 0);
    const down = vectorFromDipAz(90, 0);
    expect(doglegDeg(up, down)).toBeCloseTo(180, 5);
  });

  it("computes 3D distance", () => {
    expect(distance({ e: 0, n: 0, d: 0 }, { e: 3, n: 4, d: 0 })).toBe(5);
  });

  it("builds unit direction from dip and azimuth", () => {
    const v = vectorFromDipAz(-60, 125);
    expect(v.d).toBeGreaterThan(0);
    expect(Math.hypot(v.e, v.n, v.d)).toBeCloseTo(1, 5);
  });

  it("round-trips dip and azimuth through unit vectors", () => {
    for (const [dip, azimuth] of [
      [-60, 125],
      [-90, 45],
      [0, 270],
    ] as const) {
      const vector = vectorFromDipAz(dip, azimuth);
      const angles = dipAzFromVector(vector);
      expect(angles.dip).toBeCloseTo(dip, 5);
      expect(angles.azimuth).toBeCloseTo(normalizeAngle(azimuth), 5);
    }
  });

  it("uses fallback when normalizing a zero vector", () => {
    const normalized = normalizeVector({ e: 0, n: 0, d: 0 }, { e: 1, n: 0, d: 0 });
    expect(normalized).toEqual({ e: 1, n: 0, d: 0 });
  });

  it("slerp endpoints match input directions", () => {
    const a = vectorFromDipAz(-60, 100);
    const b = vectorFromDipAz(-55, 140);
    expect(slerpDirection(a, b, 0).e).toBeCloseTo(normalizeVector(a).e, 5);
    expect(slerpDirection(a, b, 1).e).toBeCloseTo(normalizeVector(b).e, 5);
  });

  it("returns zero displacement for zero-length interval", () => {
    const from = { dip: -60, azimuth: 125 };
    const displacement = minCurveDisplacement(from, from, 0);
    expect(displacement.e).toBeCloseTo(0, 5);
    expect(displacement.n).toBeCloseTo(0, 5);
    expect(displacement.d).toBeCloseTo(0, 5);
  });

  it("labels direction metrics for offsets", () => {
    expect(directionLabel(Number.NaN, "left", "right")).toBe("--");
    expect(directionLabel(0.02, "left", "right")).toEqual({
      amount: "0.0 m",
      direction: "center",
    });
    expect(directionLabel(2.4, "left", "right")).toEqual({
      amount: "2.4 m",
      direction: "right",
    });
  });
});
