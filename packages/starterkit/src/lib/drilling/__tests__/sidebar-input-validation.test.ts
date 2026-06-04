import { describe, expect, it } from "vitest";
import { DEFAULT_TARGET } from "../compute";
import { DEFAULT_PLAN_CORRIDOR } from "../plan-corridor";
import {
  canValidateManualSurveyInput,
  hasPlanTargetAtMd,
  sanitizePlanCorridorField,
  sanitizeTargetField,
  validateManualSurvey,
} from "../sidebar-input-validation";
import { buildStations } from "../desurvey";
import { SAMPLE_PLAN_CSV } from "@/lib/sample-data";
import { parseSurveyCsv } from "../csv";

describe("validateManualSurvey", () => {
  const collar = [{ md: 0, dip: -60, azimuth: 125 }];

  it("rejects invalid dip and azimuth", () => {
    expect(validateManualSurvey({ md: 30, dip: -95, azimuth: 125, actualRecords: collar }).ok).toBe(
      false
    );
    expect(validateManualSurvey({ md: 30, dip: -60, azimuth: 400, actualRecords: collar }).ok).toBe(
      false
    );
  });

  it("blocks append when md is not deeper than last survey", () => {
    const actuals = [
      ...collar,
      { md: 30, dip: -59, azimuth: 126 },
    ];
    const v = validateManualSurvey({
      md: 25,
      dip: -60,
      azimuth: 125,
      actualRecords: actuals,
    });
    expect(v.ok).toBe(false);
    expect(v.error).toContain("greater than");
  });

  it("allows replace at same md", () => {
    const v = validateManualSurvey({
      md: 0,
      dip: -61,
      azimuth: 126,
      actualRecords: collar,
    });
    expect(v.ok).toBe(true);
    expect(v.replacingIndex).toBe(0);
  });

  it("warns when md is deeper than target", () => {
    const v = validateManualSurvey({
      md: 700,
      dip: -60,
      azimuth: 125,
      actualRecords: collar,
      targetMd: 600,
    });
    expect(v.ok).toBe(true);
    expect(v.warning).toContain("deeper");
  });
});

describe("sanitizeTargetField", () => {
  it("rejects NaN and clamps positive fields", () => {
    expect(sanitizeTargetField("tolerance", Number.NaN, DEFAULT_TARGET)).toBe(
      DEFAULT_TARGET.tolerance
    );
    expect(sanitizeTargetField("tolerance", 0, DEFAULT_TARGET)).toBe(0.1);
    expect(sanitizeTargetField("nextInterval", -5, DEFAULT_TARGET)).toBe(1);
    expect(sanitizeTargetField("md", -10, DEFAULT_TARGET)).toBe(0);
  });
});

describe("sanitizePlanCorridorField", () => {
  it("rejects NaN for expected swing", () => {
    expect(
      sanitizePlanCorridorField("expectedSwingDeg", Number.NaN, DEFAULT_PLAN_CORRIDOR)
    ).toBe(DEFAULT_PLAN_CORRIDOR.expectedSwingDeg);
  });
});

describe("hasPlanTargetAtMd", () => {
  it("is true when plan has station at md", () => {
    const stations = buildStations(parseSurveyCsv(SAMPLE_PLAN_CSV));
    const finalMd = stations[stations.length - 1]!.md;
    expect(hasPlanTargetAtMd(stations, finalMd)).toBe(true);
  });

  it("is false with empty plan", () => {
    expect(hasPlanTargetAtMd([], 600)).toBe(false);
  });
});

describe("canValidateManualSurveyInput", () => {
  it("returns false for empty strings", () => {
    expect(canValidateManualSurveyInput("", "-60", "125", [])).toBe(false);
  });
});
