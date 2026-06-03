import { describe, expect, it } from "vitest";
import { computeHole } from "../compute";
import { buildHandoverReportData } from "../report-data";
import {
  buildActionHeroGuidance,
  buildIntervalBehaviours,
  buildSteeringFeasibility,
  requiredDlsToRejoinPlan,
} from "../steering-feasibility";
import { calculateRecommendation } from "../recommendation";
import { findScenario } from "../test-scenarios";
import { parseSurveyCsv } from "../csv";
import { buildStations } from "../desurvey";
import { planTargetFromStations } from "../recommendation";
import {
  sampleActualStations,
  samplePlanStations,
  sampleTarget,
} from "./fixtures";

describe("steering-feasibility", () => {
  const target = sampleTarget();
  const reco = calculateRecommendation(
    samplePlanStations,
    sampleActualStations,
    target
  )!;

  it("builds planned vs actual interval behaviour rows", () => {
    const rows = buildIntervalBehaviours(
      samplePlanStations,
      sampleActualStations,
      target.maxDls
    );
    expect(rows.length).toBe(sampleActualStations.length - 1);
    expect(rows[0]).toMatchObject({
      mdFrom: expect.any(Number),
      mdTo: expect.any(Number),
      plannedLiftDrop: expect.any(Number),
      actualLiftDrop: expect.any(Number),
    });
  });

  it("calculates required DLS to rejoin plan by depth", () => {
    const dls = requiredDlsToRejoinPlan(
      reco.current,
      samplePlanStations,
      reco.current.md + 30
    );
    expect(Number.isFinite(dls)).toBe(true);
    expect(dls).toBeGreaterThan(0);
  });

  it("classifies method feasibility and recovery action", () => {
    const steering = buildSteeringFeasibility(
      reco,
      samplePlanStations,
      sampleActualStations
    );
    expect(steering.simple.currentAction).toBeTruthy();
    expect(steering.bestMethodLabel).toBeTruthy();
    expect(steering.simple.nextAim).toMatch(/Hold|Lift|Drop|Swing/);
    expect(steering.methods.length).toBeGreaterThan(4);
    expect(steering.rejoinByDepth.length).toBeGreaterThan(0);
    expect(steering.assumptionsNote).toContain("Configurable assumptions");
  });

  it("returns escalation depth at or below target MD", () => {
    const steering = buildSteeringFeasibility(
      reco,
      samplePlanStations,
      sampleActualStations
    );
    if (steering.escalationDepthMd != null) {
      expect(steering.escalationDepthMd).toBeGreaterThan(reco.current.md);
      expect(steering.escalationDepthMd).toBeLessThanOrEqual(reco.target.md + 30);
    }
    expect(steering.escalationPhrase.length).toBeGreaterThan(10);
  });

  it("on-track action hero guidance does not suggest recovery", () => {
    const scenario = findScenario("on-plan")!;
    const planStations = buildStations(parseSurveyCsv(scenario.planCsv));
    const actualStations = buildStations(parseSurveyCsv(scenario.actualCsv));
    const finalPlan = planStations[planStations.length - 1]!;
    const baseTarget = planTargetFromStations(planStations, finalPlan.md)!;
    const target = { ...baseTarget, maxDls: 3, nextInterval: 30, ...scenario.target };
    const reco = calculateRecommendation(planStations, actualStations, target)!;
    expect(reco.classification.label).toBe("On track");
    const steering = buildSteeringFeasibility(reco, planStations, actualStations)!;
    expect(steering.simple.currentAction).toBe("On track");
    expect(steering.simple.bestMethod).not.toMatch(/recover/i);
    expect(steering.simple.bestMethod).toMatch(/continue|planned|resurvey/i);
    expect(
      buildActionHeroGuidance("On track", reco, steering.methods[0])
    ).not.toMatch(/recover/i);
  });

  it("includes recovery guidance in handover report data", () => {
    const { steering } = computeHole(
      samplePlanStations.map((r) => ({ ...r })),
      sampleActualStations.map((r) => ({ ...r })),
      target
    );
    const data = buildHandoverReportData(reco, sampleActualStations, {
      holeName: "DDH-0247",
      steering,
    });
    expect(data.recoveryGuidance).not.toBeNull();
    expect(data.recoveryGuidance!.currentAction).toBe(steering!.simple.currentAction);
    expect(data.disclaimer).toContain("Steering feasibility");
  });
});
