import { describe, expect, it } from "vitest";
import {
  actionSentence,
  azimuthInstruction,
  buildCorrectionOptions,
  calculateRecommendation,
  dipInstruction,
  planTargetFromStations,
} from "../recommendation";
import {
  sampleActualStations,
  samplePlanStations,
  sampleTarget,
} from "./fixtures";

describe("recommendation", () => {
  const target = sampleTarget();
  const reco = calculateRecommendation(
    samplePlanStations,
    sampleActualStations,
    target
  );

  it("produces recommendation for sample data", () => {
    expect(reco).not.toBeNull();
    expect(reco!.current.md).toBe(390);
  });

  it("classifies hole status", () => {
    expect(reco!.classification.label).toBeTruthy();
    expect(reco!.classification.confidence).toBeTruthy();
  });

  it("projects positive miss when drifting off target", () => {
    expect(reco!.miss).toBeGreaterThan(0);
    expect(reco!.planOffset).toBeGreaterThan(0);
  });

  it("limits aim by max DLS over next interval", () => {
    expect(reco!.aimDip).toBeLessThan(0);
    expect(Number.isFinite(reco!.aimAzimuth)).toBe(true);
  });

  it("builds correction options including interval to target", () => {
    const options = buildCorrectionOptions(reco!);
    expect(options.length).toBeGreaterThan(0);
    expect(options.some((o) => o.label.includes("target"))).toBe(true);
  });

  it("formats driller dip instruction", () => {
    expect(dipInstruction(-2.5)).toContain("Drop");
    expect(dipInstruction(2.5)).toContain("Lift");
    expect(dipInstruction(0)).toBe("Hold dip");
  });

  it("formats driller azimuth instruction", () => {
    expect(azimuthInstruction(-3)).toContain("Swing left");
    expect(azimuthInstruction(3)).toContain("Swing right");
  });

  it("returns null when plan or actual is empty", () => {
    expect(calculateRecommendation([], sampleActualStations, target)).toBeNull();
    expect(calculateRecommendation(samplePlanStations, [], target)).toBeNull();
  });

  it("derives target from plan at requested MD", () => {
    const fromPlan = planTargetFromStations(samplePlanStations, 600);
    expect(fromPlan).not.toBeNull();
    expect(fromPlan!.md).toBe(600);
    expect(fromPlan!.tolerance).toBe(6);
  });

  it("classifies past-target depth", () => {
    const pastTarget = {
      ...target,
      md: sampleActualStations[sampleActualStations.length - 1].md,
    };
    const pastReco = calculateRecommendation(
      samplePlanStations,
      sampleActualStations,
      pastTarget
    )!;
    expect(pastReco.remaining).toBeLessThanOrEqual(0);
    expect(pastReco.classification.label).toBe("Target depth passed");
    expect(buildCorrectionOptions(pastReco)).toEqual([]);
  });

  it("builds action sentences for each status label", () => {
    const onTrack = {
      ...reco!,
      classification: {
        label: "On track",
        className: "on-track",
        confidence: "High",
      },
    };
    expect(actionSentence(onTrack)).toContain("target envelope");
    expect(actionSentence(reco!)).toBeTruthy();
  });
});
