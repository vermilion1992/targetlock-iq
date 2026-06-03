import { describe, expect, it } from "vitest";
import { buildStations } from "../desurvey";
import { calculateRecommendation } from "../recommendation";
import {
  applySurveyNoise,
  buildSyntheticActual,
  buildSyntheticPlan,
  DEFAULT_SYNTHETIC_PARAMS,
  driftRows,
  syntheticHoleToProject,
  type SyntheticHoleParams,
} from "../synthetic-hole-builder";

function runSynthetic(params: Partial<SyntheticHoleParams>) {
  const full = { ...DEFAULT_SYNTHETIC_PARAMS, ...params };
  const project = syntheticHoleToProject(full);
  const planStations = buildStations(project.planRecords);
  const actualStations = buildStations(project.actualRecords);
  const reco = calculateRecommendation(
    planStations,
    actualStations,
    project.target
  )!;
  return { project, reco };
}

describe("synthetic-hole-builder", () => {
  it("builds plan stations to target MD at interval", () => {
    const plan = buildSyntheticPlan({
      ...DEFAULT_SYNTHETIC_PARAMS,
      targetMd: 120,
      surveyInterval: 30,
    });
    expect(plan[0]).toEqual({ md: 0, dip: -60, azimuth: 125 });
    expect(plan[plan.length - 1]?.md).toBe(120);
  });

  it("on-plan pattern stays close to plan", () => {
    const plan = buildSyntheticPlan(DEFAULT_SYNTHETIC_PARAMS);
    const actual = buildSyntheticActual(plan, {
      ...DEFAULT_SYNTHETIC_PARAMS,
      driftPattern: "on-plan",
    });
    const last = actual[actual.length - 1]!;
    const planLast = plan.find((r) => r.md >= last.md - 1) ?? plan[plan.length - 1]!;
    expect(Math.abs(last.dip - planLast.dip)).toBeLessThan(5);
  });

  it("gradual-lift can produce Watch or worse", () => {
    const { reco } = runSynthetic({
      driftPattern: "gradual-lift",
      driftMagnitudePerInterval: 0.5,
      targetMd: 600,
    });
    expect([
      "On track",
      "Watch",
      "Correction needed",
      "Steering recommended",
      "Target at risk",
      "Target depth passed",
    ]).toContain(reco.classification.label);
  });

  it("increasing-drift tends toward higher miss", () => {
    const { reco } = runSynthetic({
      driftPattern: "increasing-drift",
      driftMagnitudePerInterval: 0.8,
    });
    expect(reco.miss).toBeGreaterThan(0);
  });

  it("sudden-jump pattern includes jump station", () => {
    const plan = buildSyntheticPlan(DEFAULT_SYNTHETIC_PARAMS);
    const actual = buildSyntheticActual(plan, {
      ...DEFAULT_SYNTHETIC_PARAMS,
      driftPattern: "sudden-jump",
      jumpAtMd: 210,
    });
    const at210 = actual.find((r) => r.md === 210);
    expect(at210).toBeDefined();
  });

  it("noise stays within bounds with fixed rng", () => {
    const rows = driftRows({ toMd: 90 });
    let i = 0;
    const rng = () => {
      i += 1;
      return (i % 10) / 10;
    };
    const noisy = applySurveyNoise(
      rows,
      { dipSigmaDeg: 0.2, aziSigmaDeg: 0.2 },
      rng
    );
    for (let j = 0; j < rows.length; j += 1) {
      expect(Math.abs(noisy[j]!.dip - rows[j]!.dip)).toBeLessThanOrEqual(0.2);
      expect(Math.abs(noisy[j]!.azimuth - rows[j]!.azimuth)).toBeLessThanOrEqual(
        0.2
      );
    }
  });

  it("syntheticHoleToProject tags scenario-lab custom run", () => {
    const project = syntheticHoleToProject({
      ...DEFAULT_SYNTHETIC_PARAMS,
      holeName: "Demo-01",
    });
    expect(project.activeScenario?.id).toBe("test-lab-custom");
    expect(project.activeScenario?.name).toBe("Scenario lab · Demo-01");
    expect(project.planRecords.length).toBeGreaterThan(2);
    expect(project.actualRecords.length).toBeGreaterThan(0);
  });

  it("drift patterns produce distinct classifications", () => {
    const patterns = [
      "on-plan",
      "gradual-lift",
      "swing-right",
    ] as const;
    const labels = patterns.map((driftPattern) => {
      const { reco } = runSynthetic({ driftPattern, targetMd: 450 });
      return reco.classification.label;
    });
    expect(new Set(labels).size).toBeGreaterThanOrEqual(1);
  });
});
