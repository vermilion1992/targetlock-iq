import { describe, expect, it, vi } from "vitest";
import { applyGuideStepUi } from "../use-guide-mode";
import { STANDARD_HOLE_STEPS } from "@/lib/drilling/guide-flows";
import {
  describeGuideDemoExitConfirm,
  describeGuideDemoRestartConfirm,
} from "@/lib/drilling/workspace-action-contract";
import type { GuideUiDeps } from "../use-guide-mode";

describe("applyGuideStepUi", () => {
  it("only updates mode and tab — never survey setters", () => {
    const setMode = vi.fn();
    const setAdvancedTab = vi.fn();
    const setPlanRecords = vi.fn();
    const setActualRecords = vi.fn();
    const setTarget = vi.fn();

    const deps: GuideUiDeps = { setMode, setAdvancedTab };

    const step = STANDARD_HOLE_STEPS.find((s) => s.id === "action-plan")!;
    applyGuideStepUi(step, deps);

    expect(setMode).toHaveBeenCalledWith("simple");
    expect(setAdvancedTab).not.toHaveBeenCalled();
    expect(setPlanRecords).not.toHaveBeenCalled();
    expect(setActualRecords).not.toHaveBeenCalled();
    expect(setTarget).not.toHaveBeenCalled();
  });

  it("resolves explicit advancedTab on quick orientation advanced step", () => {
    const setMode = vi.fn();
    const setAdvancedTab = vi.fn();
    applyGuideStepUi(
      { ...STANDARD_HOLE_STEPS[0], mode: "advanced", advancedTab: "trajectory" },
      { setMode, setAdvancedTab }
    );
    expect(setAdvancedTab).toHaveBeenCalledWith("trajectory");
  });
});

describe("guide demo confirm copy", () => {
  it("promises restore on exit and restart when demo loaded", () => {
    expect(describeGuideDemoExitConfirm()).toMatch(/restore/i);
    expect(describeGuideDemoRestartConfirm()).toMatch(/restore/i);
  });
});
