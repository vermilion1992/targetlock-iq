import { describe, expect, it } from "vitest";
import { computeHole } from "../compute";
import { buildHandoverReportData } from "../report-data";
import {
  changeFromLatestSurveyLabel,
  feasibilityEscalationNote,
  FEASIBILITY_SHORTEN_OR_STEERING,
  FEASIBILITY_WITHIN_ASSUMPTIONS,
  FEASIBILITY_WEDGE_BRANCH,
  formatRecoveryActionDisplay,
  nextCheckDepthMd,
  nextIntervalAimExplainer,
  nextIntervalAimTooltip,
  NEXT_INTERVAL_AIM_STATION_NOTE,
  recoveryLoopNotes,
} from "../action-plan-copy";
import { buildSteeringFeasibility } from "../steering-feasibility";
import { calculateRecommendation, planTargetFromStations } from "../recommendation";
import { findScenario } from "../test-scenarios";
import { parseSurveyCsv } from "../csv";
import { buildStations } from "../desurvey";
import {
  sampleActualStations,
  samplePlanStations,
  sampleTarget,
} from "./fixtures";

function recoForScenario(id: string) {
  const scenario = findScenario(id)!;
  const planStations = buildStations(parseSurveyCsv(scenario.planCsv));
  const actualStations = buildStations(parseSurveyCsv(scenario.actualCsv));
  const finalPlan = planStations[planStations.length - 1]!;
  const baseTarget = planTargetFromStations(planStations, finalPlan.md)!;
  const target = { ...baseTarget, maxDls: 3, nextInterval: 30, ...scenario.target };
  const reco = calculateRecommendation(planStations, actualStations, target)!;
  const steering = buildSteeringFeasibility(reco, planStations, actualStations);
  return { reco, steering, planStations, actualStations, target };
}

describe("action-plan-copy", () => {
  it("explains next interval aim with dynamic interval", () => {
    expect(nextIntervalAimExplainer(30)).toContain("next 30 m");
    expect(nextIntervalAimExplainer(30)).toContain("Re-survey and recalculate");
    expect(nextIntervalAimExplainer(0)).not.toContain("next 0 m");
  });

  it("uses station note constant", () => {
    expect(NEXT_INTERVAL_AIM_STATION_NOTE).toContain("Re-survey and recalculate");
  });

  it("formats recovery action display labels", () => {
    expect(formatRecoveryActionDisplay("Correct now")).toBe("Correction advisable");
    expect(formatRecoveryActionDisplay("Watch", "shorten_interval")).toBe("Shorten interval");
    expect(formatRecoveryActionDisplay("On track")).toBe("On track");
  });

  it("always includes recovery loop base note", () => {
    const { reco } = recoForScenario("on-plan");
    const notes = recoveryLoopNotes(reco);
    expect(notes[0]).toContain("repeated survey-control process");
  });

  it("builds next interval aim tooltip with recovery loop and feasibility", () => {
    const { reco, steering } = recoForScenario("recoverable");
    const tip = nextIntervalAimTooltip(reco, steering);
    expect(tip).toContain("recalculated after every survey");
    expect(tip).toContain("repeated survey-control process");
    expect(tip).toContain("shorten the interval or request steering review");
    expect(tip).toContain("configured capability assumptions");
  });

  it("adds off-plan recovery loop line when not on track", () => {
    const { reco } = recoForScenario("recoverable");
    const notes = recoveryLoopNotes(reco);
    expect(notes.length).toBeGreaterThan(1);
    expect(notes[1]).toContain("shorten the interval");
  });

  it("formats change from latest survey", () => {
    const label = changeFromLatestSurveyLabel(-2.2, -4);
    expect(label).toContain("Change from latest survey");
    expect(label).toMatch(/Drop|Swing left/);
  });

  it("formats next check depth", () => {
    expect(nextCheckDepthMd(390, 30)).toBe("420.0 m");
  });

  it("avoids forbidden rig-command wording in copy constants", () => {
    const blob = [
      NEXT_INTERVAL_AIM_STATION_NOTE,
      nextIntervalAimExplainer(30),
      FEASIBILITY_WITHIN_ASSUMPTIONS,
      FEASIBILITY_SHORTEN_OR_STEERING,
      FEASIBILITY_WEDGE_BRANCH,
    ].join(" ");
    expect(blob.toLowerCase()).not.toContain("pipe bending");
    expect(blob).not.toMatch(/\bmust\b/i);
    expect(blob).not.toMatch(/set rods to/i);
  });

  it("classifies feasibility escalation for on-plan scenario", () => {
    const { reco, steering } = recoForScenario("on-plan");
    expect(feasibilityEscalationNote(reco, steering)).toBe(FEASIBILITY_WITHIN_ASSUMPTIONS);
  });

  it("classifies feasibility escalation for recoverable scenario", () => {
    const { reco, steering } = recoForScenario("recoverable");
    const note = feasibilityEscalationNote(reco, steering);
    expect(note).toBeTruthy();
    expect([FEASIBILITY_WITHIN_ASSUMPTIONS, FEASIBILITY_SHORTEN_OR_STEERING]).toContain(note);
  });

  it("classifies wedge-branch scenario toward wedge review wording", () => {
    const { reco, steering } = recoForScenario("wedge-branch");
    expect(feasibilityEscalationNote(reco, steering)).toBe(FEASIBILITY_WEDGE_BRANCH);
  });

  it("includes recovery loop fields in handover data", () => {
    const target = sampleTarget();
    const reco = calculateRecommendation(
      samplePlanStations,
      sampleActualStations,
      target
    )!;
    const { steering } = computeHole(
      samplePlanStations.map((r) => ({ ...r })),
      sampleActualStations.map((r) => ({ ...r })),
      target
    );
    const data = buildHandoverReportData(reco, sampleActualStations, {
      holeName: "DDH-0247",
      steering,
    });
    expect(data.nextIntervalAimNote).toBe(NEXT_INTERVAL_AIM_STATION_NOTE);
    expect(data.recoveryLoopNotes.length).toBeGreaterThan(0);
  });
});
