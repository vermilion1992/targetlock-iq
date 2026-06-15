import { describe, expect, it } from "vitest";
import { computeHole, DEFAULT_TARGET } from "../compute";
import { DEFAULT_REFERENCE_SYSTEM } from "../reference-system";
import { sampleActual, samplePlan, sampleTarget } from "./fixtures";

describe("computeHole", () => {
  it("returns stations and recommendation for sample data", () => {
    const result = computeHole(samplePlan, sampleActual, sampleTarget());
    expect(result.planStations.length).toBeGreaterThan(0);
    expect(result.actualStations.length).toBe(sampleActual.length);
    expect(result.recommendation).not.toBeNull();
    expect(result.recommendation!.current.md).toBe(390);
    expect(result.referenceWarnings.length).toBeGreaterThan(0);
    expect(result.holeModeAssessment?.mode).toBe("angle");
  });

  it("returns null recommendation when actual surveys are empty", () => {
    const result = computeHole(samplePlan, [], DEFAULT_TARGET);
    expect(result.planStations.length).toBeGreaterThan(0);
    expect(result.recommendation).toBeNull();
    expect(result.holeModeAssessment).toBeNull();
  });

  it("aligns plan and survey when references differ but conversion is applied", () => {
    const plan = [{ md: 0, dip: -60, azimuth: 90 }];
    const actual = [
      { md: 0, dip: -60, azimuth: 100 },
      { md: 30, dip: -60, azimuth: 100 },
    ];
    const target = { ...DEFAULT_TARGET, md: 30, tolerance: 50 };

    const converted = computeHole(plan, actual, target, null, null, {
      ...DEFAULT_REFERENCE_SYSTEM,
      planReference: "grid",
      surveyReference: "true",
      gridRotationDeg: 10,
    });

    const directTrue = computeHole(
      [{ md: 0, dip: -60, azimuth: 100 }],
      actual,
      target,
      null,
      null,
      {
        ...DEFAULT_REFERENCE_SYSTEM,
        planReference: "true",
        surveyReference: "true",
      }
    );

    const convertedLast =
      converted.actualStations[converted.actualStations.length - 1];
    const directLast = directTrue.actualStations[directTrue.actualStations.length - 1];

    expect(convertedLast.e).toBeCloseTo(directLast.e, 3);
    expect(convertedLast.n).toBeCloseTo(directLast.n, 3);
    expect(converted.referenceWarnings.some((w) => w.id === "mixed-reference")).toBe(true);
  });
});
