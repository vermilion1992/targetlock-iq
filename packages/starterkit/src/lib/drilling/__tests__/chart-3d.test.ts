import { describe, expect, it } from "vitest";
import {
  clampPitch,
  PITCH_MAX,
  PITCH_MIN,
  projectPoint,
  rotateOrbit,
} from "@/components/charts/chart-3d";

describe("chart-3d", () => {
  it("projects collar to canvas center region", () => {
    const p = projectPoint({ e: 0, n: 0, d: 0 }, { yaw: 0, pitch: 0 }, 200, 150, 2);
    expect(p.x).toBeCloseTo(200, 0);
    expect(p.y).toBeCloseTo(150, 0);
  });

  it("changes screen position when yaw changes", () => {
    const a = projectPoint({ e: 50, n: 10, d: 100 }, { yaw: 0, pitch: 0 }, 200, 150, 1);
    const b = projectPoint({ e: 50, n: 10, d: 100 }, { yaw: 1, pitch: 0 }, 200, 150, 1);
    expect(a.x).not.toBeCloseTo(b.x, 0);
  });

  it("keeps orbit rotation centered on origin", () => {
    const origin = { e: 10, n: 20, d: 30 };
    const centered = rotateOrbit(origin, origin, 0.5, 0.3);
    expect(centered.x).toBeCloseTo(0, 5);
    expect(centered.y).toBeCloseTo(0, 5);
    expect(centered.z).toBeCloseTo(0, 5);
  });

  it("clamps pitch to avoid flip", () => {
    expect(clampPitch(PITCH_MIN - 1)).toBe(PITCH_MIN);
    expect(clampPitch(PITCH_MAX + 1)).toBe(PITCH_MAX);
  });
});
