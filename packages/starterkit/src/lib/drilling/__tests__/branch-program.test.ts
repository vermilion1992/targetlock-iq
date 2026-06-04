import { describe, expect, it } from "vitest";
import {
  analyzeDaughterBranch,
  doglegMotherToDaughter,
  kickoffStationFromMother,
  rankKickoffOptions,
  requiredDaughterHeading,
  separationMotherDaughter,
  topKickoffComparisons,
} from "../branch-program";
import { BRANCH_PROGRAM_SCENARIOS } from "../branch-program-scenarios";
import { buildStations } from "../desurvey";
import { driftRows } from "../synthetic-hole-builder";

describe("kickoffStationFromMother", () => {
  it("interpolates on actual mother at branch MD", () => {
    const actual = driftRows({ toMd: 300, interval: 30, dipPerInterval: 0.1 });
    const kickoff = kickoffStationFromMother(actual, 150);
    expect(kickoff).not.toBeNull();
    expect(kickoff!.md).toBeCloseTo(150, 0);
    expect(Number.isFinite(kickoff!.e)).toBe(true);
    expect(Number.isFinite(kickoff!.n)).toBe(true);
    expect(Number.isFinite(kickoff!.d)).toBe(true);
  });
});

describe("doglegMotherToDaughter", () => {
  it("returns zero when directions match", () => {
    const dls = doglegMotherToDaughter(-60, 125, -60, 125);
    expect(dls).toBeCloseTo(0, 2);
  });

  it("increases with larger turn", () => {
    const low = doglegMotherToDaughter(-60, 125, -62, 130);
    const high = doglegMotherToDaughter(-60, 125, -70, 150);
    expect(high).toBeGreaterThan(low);
  });
});

describe("rankKickoffOptions", () => {
  it("returns sorted options by required DLS", () => {
    const scenario = BRANCH_PROGRAM_SCENARIOS[0]!;
    const target = scenario.targets[0]!;
    const ranked = rankKickoffOptions(
      scenario.mother.actualRecords,
      target,
      390,
      510,
      30
    );
    expect(ranked.length).toBeGreaterThan(2);
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i]!.requiredDls).toBeGreaterThanOrEqual(ranked[i - 1]!.requiredDls - 1e-6);
    }
  });
});

describe("separationMotherDaughter", () => {
  it("warns when daughter converges toward mother", () => {
    const scenario = BRANCH_PROGRAM_SCENARIOS.find(
      (s) => s.id === "branch-daughter-convergence"
    )!;
    const motherStations = buildStations(scenario.mother.actualRecords);
    const daughter = scenario.daughters[0]!;
    const daughterStations = buildStations(daughter.planRecords);
    const sep = separationMotherDaughter(motherStations, daughterStations, 5);
    expect(sep.status).not.toBe("ok");
    expect(sep.minDistanceM).toBeLessThan(8);
  });
});

describe("branch program scenarios", () => {
  it("loads five demos with daughters and targets", () => {
    expect(BRANCH_PROGRAM_SCENARIOS).toHaveLength(5);
    BRANCH_PROGRAM_SCENARIOS.forEach((s) => {
      expect(s.daughters.length).toBeGreaterThan(0);
      expect(s.targets.length).toBeGreaterThan(0);
      s.daughters.forEach((d) => {
        const kickoff = kickoffStationFromMother(s.mother.actualRecords, d.kickoffMd);
        expect(kickoff).not.toBeNull();
        expect(d.planRecords[0]?.md).toBe(d.kickoffMd);
      });
    });
  });

  it("analyzes daughter branches with separation and DLS", () => {
    const scenario = BRANCH_PROGRAM_SCENARIOS[0]!;
    const motherStations = buildStations(scenario.mother.actualRecords);
    const analysis = analyzeDaughterBranch(
      scenario.mother.actualRecords,
      scenario.daughters[1]!,
      scenario.targets,
      motherStations
    );
    expect(analysis.requiredDls).toBeGreaterThan(0);
    expect(analysis.separation).not.toBeNull();
  });
});

describe("requiredDaughterHeading", () => {
  it("points from kickoff toward target", () => {
    const kickoff = { e: 0, n: 0, d: 0, dip: -60, azimuth: 90 } as const;
    const target = { e: 100, n: 0, d: 50 };
    const h = requiredDaughterHeading(kickoff, target);
    expect(Number.isFinite(h.dip)).toBe(true);
    expect(Number.isFinite(h.azimuth)).toBe(true);
    expect(h.azimuth).toBeGreaterThanOrEqual(0);
    expect(h.azimuth).toBeLessThan(360);
  });
});

describe("topKickoffComparisons", () => {
  it("returns three comparison options", () => {
    const scenario = BRANCH_PROGRAM_SCENARIOS[1]!;
    const ranked = rankKickoffOptions(
      scenario.mother.actualRecords,
      scenario.targets[0]!,
      360,
      540,
      30
    );
    const top = topKickoffComparisons(ranked);
    expect(top).not.toBeNull();
    expect(top!.bestControl.kickoffMd).toBeLessThanOrEqual(top!.shortestPath.kickoffMd + 300);
  });
});
