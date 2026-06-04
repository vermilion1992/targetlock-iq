import { describe, expect, it } from "vitest";
import { kickoffStationFromMother } from "../branch-program";
import { estimateToolface } from "../branch-toolface";

const MOTHER_ACTUAL = [
  { md: 0, dip: -60, azimuth: 90 },
  { md: 300, dip: -62, azimuth: 92 },
  { md: 600, dip: -64, azimuth: 94 },
];

describe("estimateToolface", () => {
  it("returns stable toolface for moderate turn", () => {
    const kickoff = kickoffStationFromMother(MOTHER_ACTUAL, 300)!;
    const tf = estimateToolface(kickoff, -65, 110);
    expect(tf.toolfaceDeg).toBeGreaterThanOrEqual(0);
    expect(tf.toolfaceDeg).toBeLessThan(360);
    expect(Number.isFinite(tf.buildDropDeg)).toBe(true);
  });

  it("flags near-vertical holes", () => {
    const kickoff = kickoffStationFromMother(
      [{ md: 0, dip: -85, azimuth: 0 }, { md: 200, dip: -86, azimuth: 5 }],
      100
    )!;
    const tf = estimateToolface(kickoff, -88, 15);
    expect(tf.nearVertical).toBe(true);
  });
});
