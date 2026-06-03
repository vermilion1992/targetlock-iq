import { describe, expect, it } from "vitest";
import { TEST_SCENARIOS, findScenario } from "../test-scenarios";
import { parseSurveyCsv } from "../csv";
import { buildStations } from "../desurvey";
import { calculateRecommendation, planTargetFromStations } from "../recommendation";
import { buildQaFlags } from "../qa";
import { computeSteeringFeasibility } from "../steering-feasibility";

function runHoleScenario(id: string) {
  const scenario = findScenario(id)!;
  const planStations = buildStations(parseSurveyCsv(scenario.planCsv));
  const actualStations = buildStations(parseSurveyCsv(scenario.actualCsv));
  const finalPlan = planStations[planStations.length - 1]!;
  const baseTarget = planTargetFromStations(planStations, finalPlan.md)!;
  const target = { ...baseTarget, maxDls: 3, nextInterval: 30, ...scenario.target };
  const reco = calculateRecommendation(planStations, actualStations, target)!;
  const steering = computeSteeringFeasibility(reco, planStations, actualStations);
  return { reco, steering, actualStations };
}

describe("test scenarios — classification", () => {
  it("On plan → On track", () => {
    const { reco } = runHoleScenario("on-plan");
    expect(reco.classification.label).toBe("On track");
  });

  it("Gradual drift → Watch", () => {
    const { reco } = runHoleScenario("gradual-drift");
    expect(reco.classification.label).toBe("Watch");
  });

  it("Recoverable → Correction needed (DLS within limit)", () => {
    const { reco } = runHoleScenario("recoverable");
    expect(reco.classification.label).toBe("Correction needed");
    expect(reco.dlsRequired).toBeLessThanOrEqual(reco.maxDls + 1e-6);
  });

  it("Motor / Navi → Steering recommended", () => {
    const { reco } = runHoleScenario("steering-review");
    expect(reco.classification.label).toBe("Steering recommended");
    expect(reco.dlsRequired).toBeGreaterThan(reco.maxDls);
  });

  it("Wedge / branch → Target at risk", () => {
    const { reco, steering } = runHoleScenario("wedge-branch");
    expect(reco.classification.label).toBe("Target at risk");
    expect(steering?.currentAction).toBe("Wedge or branch review");
  });

  it("QA jump → raises a DLS or trend flag", () => {
    const { reco, actualStations } = runHoleScenario("qa-jump");
    const flags = buildQaFlags(reco, actualStations);
    const hasRisk = flags.some(
      (f) => f.level !== "ok" && (f.label === "DLS" || f.label === "Trend")
    );
    expect(hasRisk).toBe(true);
  });

  it("invalid import scenario parses to zero records", () => {
    const scenario = findScenario("invalid-import")!;
    expect(parseSurveyCsv(scenario.invalidCsv ?? "").length).toBe(0);
  });

  it("every scenario has docs metadata", () => {
    for (const s of TEST_SCENARIOS) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
      expect(s.expectedStatus.length).toBeGreaterThan(0);
    }
  });
});
