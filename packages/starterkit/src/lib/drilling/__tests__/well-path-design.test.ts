import { describe, expect, it } from "vitest";
import { buildStations } from "../desurvey";
import { distance } from "../geometry";
import {
  designWellPath,
  requiredDoglegRate,
  type WellPathDesignInput,
} from "../well-path-design";

function baseInput(overrides: Partial<WellPathDesignInput> = {}): WellPathDesignInput {
  return {
    startMd: 0,
    startDip: -60,
    startAzimuth: 90,
    startPosition: { e: 0, n: 0, d: 0 },
    targetEnu: { e: 250, n: 40, d: 420 },
    surveyInterval: 30,
    maxDls: 3,
    ...overrides,
  };
}

function endPosition(records: { md: number; dip: number; azimuth: number }[]) {
  const stations = buildStations(records);
  return stations[stations.length - 1];
}

describe("designWellPath — curve-to-target", () => {
  it("reaches the target within a small numeric tolerance", () => {
    const input = baseInput();
    const result = designWellPath("curve-to-target", input);
    expect(result.feasible).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.records.length).toBeGreaterThan(2);

    const end = endPosition(result.records);
    const miss = distance(
      { e: end.e, n: end.n, d: end.d },
      input.targetEnu
    );
    expect(miss).toBeLessThan(0.5);
  });

  it("uses the gentlest dogleg that reaches the target", () => {
    const result = designWellPath("curve-to-target", baseInput());
    expect(result.usedDlsPer30m).not.toBeNull();
    expect(result.requiredDlsPer30m).not.toBeNull();
    expect(result.usedDlsPer30m!).toBeCloseTo(result.requiredDlsPer30m!, 6);
    expect(result.usedDlsPer30m!).toBeLessThanOrEqual(3);

    const stations = buildStations(result.records);
    const peakDls = Math.max(...stations.map((s) => s.dls));
    expect(peakDls).toBeLessThanOrEqual(result.usedDlsPer30m! + 0.05);
  });

  it("reports infeasibility with the required rate when max DLS is too low", () => {
    const result = designWellPath(
      "curve-to-target",
      baseInput({
        // Target far off-axis: requires an aggressive turn.
        targetEnu: { e: 0, n: 200, d: 100 },
        maxDls: 1,
      })
    );
    expect(result.feasible).toBe(false);
    expect(result.records).toHaveLength(0);
    expect(result.errors[0]).toContain("Cannot reach target within max DLS 1.0");
    expect(result.errors[0]).toMatch(/needs \d+(\.\d+)?°\/30 m/);
  });

  it("falls back to a straight path for a collinear target", () => {
    const input = baseInput({
      startDip: -45,
      startAzimuth: 90,
      // Direction (-45, az 90) => unit (0.7071, 0, 0.7071) scaled by 300.
      targetEnu: { e: 212.13, n: 0, d: 212.13 },
    });
    const result = designWellPath("curve-to-target", input);
    expect(result.feasible).toBe(true);
    expect(result.usedDlsPer30m).toBe(0);
    const end = endPosition(result.records);
    expect(
      distance({ e: end.e, n: end.n, d: end.d }, input.targetEnu)
    ).toBeLessThan(0.5);
  });

  it("rejects targets behind the start direction", () => {
    const result = designWellPath(
      "curve-to-target",
      baseInput({
        startDip: -60,
        startAzimuth: 90,
        targetEnu: { e: -200, n: 0, d: -300 },
      })
    );
    expect(result.feasible).toBe(false);
  });
});

describe("designWellPath — build-and-hold", () => {
  it("holds the start direction through the kickoff then builds to target", () => {
    const input = baseInput({
      kickoffLengthM: 90,
      buildRateDegPer30m: 2.5,
    });
    const result = designWellPath("build-and-hold", input);
    expect(result.feasible).toBe(true);

    // All stations within the kickoff keep the collar orientation.
    const kickoffRecords = result.records.filter((r) => r.md <= 90 + 1e-6);
    expect(kickoffRecords.length).toBeGreaterThan(1);
    for (const record of kickoffRecords) {
      expect(record.dip).toBeCloseTo(-60, 4);
      expect(record.azimuth).toBeCloseTo(90, 4);
    }

    const end = endPosition(result.records);
    expect(
      distance({ e: end.e, n: end.n, d: end.d }, input.targetEnu)
    ).toBeLessThan(0.5);
  });

  it("fails with guidance when the build rate cannot reach the target", () => {
    const result = designWellPath(
      "build-and-hold",
      baseInput({
        targetEnu: { e: 100, n: 150, d: 150 },
        kickoffLengthM: 60,
        buildRateDegPer30m: 0.5,
      })
    );
    expect(result.feasible).toBe(false);
    expect(result.errors[0]).toContain("Build rate 0.5");
    expect(result.errors[0]).toContain("needs at least");
  });

  it("warns when the build rate exceeds the configured max DLS", () => {
    const result = designWellPath(
      "build-and-hold",
      baseInput({
        buildRateDegPer30m: 5,
        maxDls: 3,
      })
    );
    expect(result.feasible).toBe(true);
    expect(
      result.warnings.some((w) => w.includes("exceeds the configured max DLS"))
    ).toBe(true);
  });
});

describe("requiredDoglegRate", () => {
  it("is zero for an on-axis target", () => {
    expect(requiredDoglegRate(300, 0)).toBe(0);
  });

  it("grows as the target moves further off-axis", () => {
    const near = requiredDoglegRate(300, 10)!;
    const far = requiredDoglegRate(300, 80)!;
    expect(far).toBeGreaterThan(near);
  });
});
