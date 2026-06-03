import { describe, expect, it } from "vitest";
import {
  allowedPositionOffsetAtMd,
  buildCorridorStatus,
  DEFAULT_PLAN_CORRIDOR,
  derivePlanCorridorFromPlan,
} from "../plan-corridor";
import { calculateRecommendation } from "../recommendation";
import {
  sampleActualStations,
  samplePlanStations,
  sampleTarget,
} from "./fixtures";

describe("plan-corridor", () => {
  it("widens allowed position offset with depth", () => {
    const at0 = allowedPositionOffsetAtMd(DEFAULT_PLAN_CORRIDOR, 0);
    const at300 = allowedPositionOffsetAtMd(DEFAULT_PLAN_CORRIDOR, 300);
    expect(at300).toBeGreaterThan(at0);
  });

  it("derives corridor from plan records", () => {
    const plan = samplePlanStations.map((s) => ({
      md: s.md,
      dip: s.dip,
      azimuth: s.azimuth,
    }));
    const corridor = derivePlanCorridorFromPlan(plan, 30);
    expect(Number.isFinite(corridor.expectedLiftDropDeg)).toBe(true);
    expect(corridor.allowedDipDevDeg).toBeGreaterThan(0);
  });

  it("detects outside corridor when offset exceeds allowance", () => {
    const target = sampleTarget();
    const reco = calculateRecommendation(
      samplePlanStations,
      sampleActualStations,
      target
    )!;
    const status = buildCorridorStatus(
      samplePlanStations,
      sampleActualStations,
      {
        ...DEFAULT_PLAN_CORRIDOR,
        positionOffsetM: 0.5,
        positionWidenPer100m: 0,
      },
      reco
    );
    expect(status?.outsidePlannedCorridor).toBe(true);
  });

  it("returns null without corridor config", () => {
    const target = sampleTarget();
    const reco = calculateRecommendation(
      samplePlanStations,
      sampleActualStations,
      target
    )!;
    expect(
      buildCorridorStatus(samplePlanStations, sampleActualStations, null, reco)
    ).toBeNull();
  });

  it("seeds dip tolerance from CSV fields", () => {
    const plan = [
      { md: 0, dip: -60, azimuth: 125 },
      { md: 30, dip: -59.5, azimuth: 125.2, dipTolerance: 0.5, aziTolerance: 0.4 },
    ];
    const corridor = derivePlanCorridorFromPlan(plan);
    expect(corridor.allowedDipDevDeg).toBe(0.5);
    expect(corridor.allowedAziDevDeg).toBe(0.4);
  });
});
