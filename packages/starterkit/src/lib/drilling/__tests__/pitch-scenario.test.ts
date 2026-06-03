import { describe, expect, it } from "vitest";
import { computeHole } from "../compute";
import {
  getPitchPlanRecords,
  getPitchStep,
  PITCH_STEP_COUNT,
  PITCH_STEPS,
  resolvePitchTarget,
} from "../pitch-scenario";

describe("pitch-scenario", () => {
  it("defines a full walkthrough sequence", () => {
    expect(PITCH_STEP_COUNT).toBe(10);
    expect(PITCH_STEPS[0].id).toBe("intro");
    expect(PITCH_STEPS[1].id).toBe("scenario_lab");
    expect(PITCH_STEPS[1].title).toBe("Scenario Lab");
    expect(PITCH_STEPS[1].highlight).toBe("scenario-lab");
    expect(PITCH_STEPS.find((s) => s.id === "recovery_guidance")?.highlight).toBe(
      "recovery-guidance"
    );
    expect(PITCH_STEPS[PITCH_STEP_COUNT - 1].highlight).toBe("export");
  });

  it("starts on plan with small plan offset", () => {
    const step = getPitchStep(2)!;
    const plan = getPitchPlanRecords();
    const { recommendation } = computeHole(
      plan,
      step.actualRecords,
      resolvePitchTarget(step)
    );
    expect(recommendation).not.toBeNull();
    expect(recommendation!.planOffset).toBeLessThan(2);
  });

  it("shows meaningful miss on full drift step", () => {
    const step = getPitchStep(5)!;
    const { recommendation } = computeHole(
      getPitchPlanRecords(),
      step.actualRecords,
      resolvePitchTarget(step)
    );
    expect(recommendation!.miss).toBeGreaterThan(5);
    expect(recommendation!.classification.label).not.toBe("On track");
  });
});
