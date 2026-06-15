import { describe, expect, it } from "vitest";

import {
  PLANNER_GUIDE_FLOW_META,
  PLANNER_GUIDE_STEPS,
  plannerGuideStepCount,
  type PlannerGuideTab,
} from "../planner-guide-flow";

const VALID_TABS: PlannerGuideTab[] = [
  "create",
  "coordinates",
  "plans",
  "program",
  "map",
  "scene3d",
  "qa",
  "review",
  "package",
];

describe("planner guide flow", () => {
  it("has a stable step count and meta", () => {
    expect(PLANNER_GUIDE_STEPS).toHaveLength(10);
    expect(plannerGuideStepCount()).toBe(PLANNER_GUIDE_STEPS.length);
    expect(PLANNER_GUIDE_FLOW_META.id).toBe("planner");
  });

  it("has unique step ids", () => {
    const ids = PLANNER_GUIDE_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every step targets a valid planner tab", () => {
    for (const step of PLANNER_GUIDE_STEPS) {
      expect(VALID_TABS).toContain(step.tab);
    }
  });

  it("every step carries the full narration fields", () => {
    for (const step of PLANNER_GUIDE_STEPS) {
      expect(step.title.length).toBeGreaterThan(4);
      expect(step.purpose.length).toBeGreaterThan(10);
      expect(step.lookAt.length).toBeGreaterThan(10);
      expect(step.whyItMatters.length).toBeGreaterThan(10);
    }
  });

  it("starts on Plans and offers the demo program there", () => {
    expect(PLANNER_GUIDE_STEPS[0]!.tab).toBe("plans");
    expect(PLANNER_GUIDE_STEPS[0]!.offersDemo).toBe(true);
  });

  it("covers the key planner tabs including the 3D scene", () => {
    const tabs = new Set(PLANNER_GUIDE_STEPS.map((s) => s.tab));
    for (const required of [
      "plans",
      "create",
      "map",
      "scene3d",
      "qa",
      "review",
      "package",
    ] as PlannerGuideTab[]) {
      expect(tabs.has(required)).toBe(true);
    }
  });

  it("ends on the execution handoff", () => {
    const last = PLANNER_GUIDE_STEPS[PLANNER_GUIDE_STEPS.length - 1]!;
    expect(last.id).toBe("handoff-execution");
    expect(last.whyItMatters.toLowerCase()).toContain("audit");
  });
});
