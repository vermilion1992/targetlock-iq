import { describe, expect, it } from "vitest";
import { buildQaFlags } from "../qa";
import { calculateRecommendation } from "../recommendation";
import {
  sampleActualStations,
  samplePlanStations,
  sampleTarget,
} from "./fixtures";

describe("qa", () => {
  it("returns flags for each review category", () => {
    const reco = calculateRecommendation(
      samplePlanStations,
      sampleActualStations,
      sampleTarget()
    )!;
    const flags = buildQaFlags(reco, sampleActualStations);
    const labels = flags.map((f) => f.label);
    expect(labels).toContain("Interval");
    expect(labels).toContain("DLS");
    expect(labels).toContain("Plan");
    expect(labels).toContain("Recover");
    expect(labels).toContain("Target");
  });

  it("flags elevated plan offset on sample drift", () => {
    const reco = calculateRecommendation(
      samplePlanStations,
      sampleActualStations,
      sampleTarget()
    )!;
    const planFlag = buildQaFlags(reco, sampleActualStations).find(
      (f) => f.label === "Plan"
    );
    expect(planFlag).toBeDefined();
    expect(["watch", "risk"]).toContain(planFlag!.level);
  });
});
