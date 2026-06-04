import { describe, expect, it } from "vitest";
import { buildStations } from "../desurvey";
import { doglegMotherToDaughter, kickoffStationFromMother } from "../branch-program";
import { estimateToolface } from "../branch-toolface";

/** Golden cases documented in docs/targetlock-pitch/math-validation/ */

const STRAIGHT_SURVEYS = [
  { md: 0, dip: -60, azimuth: 90 },
  { md: 30, dip: -60, azimuth: 90 },
  { md: 60, dip: -60, azimuth: 90 },
];

describe("math validation — desurvey", () => {
  it("straight hole: DLS near zero at interior stations", () => {
    const stations = buildStations(STRAIGHT_SURVEYS);
    expect(stations[1]!.dls).toBeCloseTo(0, 1);
  });

  it("straight hole: down increases with depth", () => {
    const stations = buildStations(STRAIGHT_SURVEYS);
    expect(stations[2]!.d).toBeGreaterThan(stations[0]!.d);
  });
});

describe("math validation — DLS", () => {
  it("identical directions yield zero dogleg", () => {
    expect(doglegMotherToDaughter(-60, 90, -60, 90)).toBeCloseTo(0, 2);
  });

  it("3° turn case increases dogleg", () => {
    const low = doglegMotherToDaughter(-60, 90, -61, 90);
    const high = doglegMotherToDaughter(-60, 90, -63, 95);
    expect(high).toBeGreaterThan(low);
  });
});

describe("math validation — kickoff interpolation", () => {
  it("kickoff at 30 m matches station MD on actual path", () => {
    const kickoff = kickoffStationFromMother(STRAIGHT_SURVEYS, 30);
    expect(kickoff).not.toBeNull();
    expect(kickoff!.md).toBeCloseTo(30, 0);
    expect(kickoff!.motherDip).toBeCloseTo(-60, 1);
  });
});

describe("math validation — toolface", () => {
  it("near-vertical flag above 80° dip", () => {
    const kickoff = kickoffStationFromMother(
      [{ md: 0, dip: -85, azimuth: 0 }, { md: 100, dip: -86, azimuth: 0 }],
      50
    )!;
    const tf = estimateToolface(kickoff, -88, 10);
    expect(tf.nearVertical).toBe(true);
  });
});
