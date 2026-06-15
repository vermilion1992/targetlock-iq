import { describe, expect, it } from "vitest";
import {
  buildReferenceWarnings,
  convertSurveyRecordsReference,
  convertTargetBearingReference,
  DEFAULT_REFERENCE_SYSTEM,
  fromTrueAzimuth,
  normalizeAzimuth,
  toTrueAzimuth,
} from "../reference-system";

describe("reference-system", () => {
  const gridConfig = {
    ...DEFAULT_REFERENCE_SYSTEM,
    gridRotationDeg: 15,
    magneticDeclinationDeg: 12,
  };

  it("normalizes azimuth to 0-360", () => {
    expect(normalizeAzimuth(370)).toBe(10);
    expect(normalizeAzimuth(-10)).toBe(350);
  });

  it("converts magnetic azimuth to true north", () => {
    expect(toTrueAzimuth(90, "magnetic", gridConfig)).toBeCloseTo(102, 5);
  });

  it("converts grid azimuth to true north", () => {
    expect(toTrueAzimuth(90, "grid", gridConfig)).toBeCloseTo(105, 5);
  });

  it("converts true azimuth to grid for display", () => {
    expect(fromTrueAzimuth(105, "grid", gridConfig)).toBeCloseTo(90, 5);
  });

  it("round-trips through convertTargetBearingReference", () => {
    const gridAz = 45;
    const trueAz = convertTargetBearingReference(gridAz, "grid", "true", gridConfig);
    expect(convertTargetBearingReference(trueAz, "true", "grid", gridConfig)).toBeCloseTo(
      gridAz,
      5
    );
  });

  it("converts survey record azimuths before desurvey", () => {
    const records = [{ md: 0, dip: -60, azimuth: 90 }];
    const converted = convertSurveyRecordsReference(records, "grid", gridConfig);
    expect(converted[0].azimuth).toBeCloseTo(105, 5);
  });

  it("warns when plan and survey references differ", () => {
    const warnings = buildReferenceWarnings({
      ...DEFAULT_REFERENCE_SYSTEM,
      planReference: "grid",
      surveyReference: "magnetic",
    });
    expect(warnings.some((w) => w.id === "mixed-reference")).toBe(true);
  });

  it("warns when magnetic north is used without declination", () => {
    const warnings = buildReferenceWarnings({
      ...DEFAULT_REFERENCE_SYSTEM,
      surveyReference: "magnetic",
      magneticDeclinationDeg: 0,
    });
    expect(warnings.some((w) => w.id === "missing-declination")).toBe(true);
  });

  it("notes when grid north is used with zero rotation", () => {
    const warnings = buildReferenceWarnings({
      ...DEFAULT_REFERENCE_SYSTEM,
      planReference: "grid",
      gridRotationDeg: 0,
    });
    expect(warnings.some((w) => w.id === "grid-rotation-zero")).toBe(true);
  });
});
