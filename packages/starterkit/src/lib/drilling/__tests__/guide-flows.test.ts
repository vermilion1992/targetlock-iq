import { describe, expect, it } from "vitest";
import {
  BRANCH_HOLE_STEPS,
  getGuideStepCount,
  getGuideSteps,
  GUIDE_FLOWS,
  GUIDE_HIGHLIGHT_TAB,
  QUICK_ORIENTATION_STEPS,
  resolveGuideTab,
  STANDARD_HOLE_STEPS,
} from "../guide-flows";
import type { GuideHighlight, GuideStep } from "../guide-types";

function collectTabs(steps: GuideStep[]) {
  return steps
    .map((s) => resolveGuideTab(s))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
}

function collectHighlights(steps: GuideStep[]): GuideHighlight[] {
  return steps.map((s) => s.highlight).filter((h): h is GuideHighlight => Boolean(h));
}

describe("guide-flows", () => {
  it("defines three flows with expected step counts", () => {
    expect(GUIDE_FLOWS).toHaveLength(3);
    for (const flow of GUIDE_FLOWS) {
      expect(flow.stepCount).toBe(getGuideStepCount(flow.id));
    }
    expect(getGuideStepCount("quick")).toBe(6);
    expect(getGuideStepCount("standard")).toBe(20);
    expect(getGuideStepCount("branch")).toBe(12);
    expect(QUICK_ORIENTATION_STEPS).toHaveLength(6);
    expect(STANDARD_HOLE_STEPS).toHaveLength(20);
    expect(BRANCH_HOLE_STEPS).toHaveLength(12);
  });

  it("uses unique step ids per flow", () => {
    for (const flow of ["quick", "standard", "branch"] as const) {
      const ids = getGuideSteps(flow).map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("maps every step highlight and tab to GUIDE_HIGHLIGHT_TAB", () => {
    for (const flow of ["quick", "standard", "branch"] as const) {
      const steps = getGuideSteps(flow);
      for (const h of collectHighlights(steps)) {
        if (steps.some((s) => s.advancedTab)) {
          /* explicit advancedTab allowed */
        }
        const mapped = GUIDE_HIGHLIGHT_TAB[h];
        const step = steps.find((s) => s.highlight === h)!;
        const tab = resolveGuideTab(step);
        if (tab && !step.advancedTab) {
          expect(mapped).toBe(tab);
        }
      }
      for (const tab of collectTabs(steps)) {
        expect(
          Object.values(GUIDE_HIGHLIGHT_TAB).includes(tab) ||
            steps.some((s) => s.advancedTab === tab)
        ).toBe(true);
      }
    }
  });

  it("branch flow opens branch program tab", () => {
    const step = BRANCH_HOLE_STEPS.find((s) => s.id === "mother-daughter-concept")!;
    expect(resolveGuideTab(step)).toBe("branch-program");
    expect(
      BRANCH_HOLE_STEPS.some(
        (s) => resolveGuideTab(s) === "branch-program" || s.highlight === "branch-program"
      )
    ).toBe(true);
  });

  it("standard flow includes KPI, action plan, and export steps", () => {
    const ids = STANDARD_HOLE_STEPS.map((s) => s.id);
    expect(ids).toContain("kpis");
    expect(ids).toContain("action-plan");
    expect(ids).toContain("export-handover");
    expect(ids).toContain("steering-settings");
  });
});
