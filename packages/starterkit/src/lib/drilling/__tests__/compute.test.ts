import { describe, expect, it } from "vitest";
import { computeHole, DEFAULT_TARGET } from "../compute";
import { sampleActual, samplePlan, sampleTarget } from "./fixtures";

describe("computeHole", () => {
  it("returns stations and recommendation for sample data", () => {
    const result = computeHole(samplePlan, sampleActual, sampleTarget());
    expect(result.planStations.length).toBeGreaterThan(0);
    expect(result.actualStations.length).toBe(sampleActual.length);
    expect(result.recommendation).not.toBeNull();
    expect(result.recommendation!.current.md).toBe(390);
  });

  it("returns null recommendation when actual surveys are empty", () => {
    const result = computeHole(samplePlan, [], DEFAULT_TARGET);
    expect(result.planStations.length).toBeGreaterThan(0);
    expect(result.recommendation).toBeNull();
  });
});
