import { describe, expect, it } from "vitest";
import { getTrajectorySnapshot } from "../trajectory-snapshot";
import { isValidImageDataUrl } from "../pdf-brand";
import { calculateRecommendation } from "../recommendation";
import { sampleActualStations, samplePlanStations, sampleTarget } from "./fixtures";

describe("getTrajectorySnapshot", () => {
  it("returns null in Node (no document)", () => {
    const reco = calculateRecommendation(
      samplePlanStations,
      sampleActualStations,
      sampleTarget()
    );
    expect(getTrajectorySnapshot(samplePlanStations, sampleActualStations, reco)).toBeNull();
  });

  it("returns null when stations are insufficient", () => {
    const reco = calculateRecommendation(
      samplePlanStations,
      sampleActualStations,
      sampleTarget()
    );
    expect(getTrajectorySnapshot([], [], reco)).toBeNull();
  });
});

describe("isValidImageDataUrl for trajectory exports", () => {
  it("rejects short placeholder strings", () => {
    expect(isValidImageDataUrl("data:image/jpeg;base64,")).toBe(false);
  });
});
