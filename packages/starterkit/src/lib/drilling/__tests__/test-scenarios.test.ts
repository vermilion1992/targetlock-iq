import { describe, expect, it } from "vitest";
import { TEST_SCENARIOS, findScenario, scenarioTarget } from "../test-scenarios";
import { parseSurveyCsv } from "../csv";
import { buildQaFlags } from "../qa";
import { computeHole } from "../compute";
import { DEFAULT_REFERENCE_SYSTEM } from "../reference-system";
import { baseRecoveryConfidence } from "../steering-feasibility";

function runHoleScenario(id: string) {
  const scenario = findScenario(id)!;
  const planRecords = parseSurveyCsv(scenario.planCsv);
  const actualRecords = parseSurveyCsv(scenario.actualCsv);
  const target = scenarioTarget(scenario);
  const referenceSystem = scenario.referenceSystem ?? DEFAULT_REFERENCE_SYSTEM;
  return computeHole(planRecords, actualRecords, target, null, null, referenceSystem);
}

describe("test scenarios — classification", () => {
  it("On plan → On track", () => {
    const { recommendation } = runHoleScenario("on-plan");
    expect(recommendation!.classification.label).toBe("On track");
  });

  it("Gradual drift → Watch", () => {
    const { recommendation } = runHoleScenario("gradual-drift");
    expect(recommendation!.classification.label).toBe("Watch");
  });

  it("Recoverable → Correction needed (DLS within limit)", () => {
    const { recommendation } = runHoleScenario("recoverable");
    expect(recommendation!.classification.label).toBe("Correction needed");
    expect(recommendation!.dlsRequired).toBeLessThanOrEqual(recommendation!.maxDls + 1e-6);
  });

  it("Motor / Navi → Steering recommended", () => {
    const { recommendation } = runHoleScenario("steering-review");
    expect(recommendation!.classification.label).toBe("Steering recommended");
    expect(recommendation!.dlsRequired).toBeGreaterThan(recommendation!.maxDls);
  });

  it("Wedge / branch → Target at risk", () => {
    const { recommendation, steering } = runHoleScenario("wedge-branch");
    expect(recommendation!.classification.label).toBe("Target at risk");
    expect(steering?.currentAction).toBe("Wedge or branch review");
  });

  it("QA jump → raises a DLS or trend flag", () => {
    const { recommendation, actualStations } = runHoleScenario("qa-jump");
    const flags = buildQaFlags(recommendation!, actualStations);
    const hasRisk = flags.some(
      (f) => f.level !== "ok" && (f.label === "DLS" || f.label === "Trend")
    );
    expect(hasRisk).toBe(true);
  });

  it("Reference system → On track after mixed-ref conversion", () => {
    const { recommendation, referenceWarnings } = runHoleScenario("reference-system");
    expect(recommendation!.classification.label).toBe("On track");
    expect(referenceWarnings.some((w) => w.id === "mixed-reference")).toBe(true);
  });

  it("Near-vertical → hole mode advisory and confidence downgrade", () => {
    const { recommendation, steering, holeModeAssessment } = runHoleScenario("near-vertical");
    expect(["On track", "Watch", "Correction needed"]).toContain(
      recommendation!.classification.label
    );
    expect(holeModeAssessment?.mode).toBe("near-vertical");
    expect(steering).not.toBeNull();

    const base = baseRecoveryConfidence(recommendation!);
    const reported = steering!.simple.confidence;
    expect(reported).not.toBe(base);
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
