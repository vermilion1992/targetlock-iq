import { describe, expect, it } from "vitest";
import { buildReportText } from "../report";
import {
  assessSurveyUncertainty,
  DEFAULT_SURVEY_TOOL_PROFILE,
  profileFromPreset,
  SURVEY_TOOL_PRESETS,
} from "../survey-tool-profile";
import { calculateRecommendation } from "../recommendation";
import {
  sampleActualStations,
  samplePlanStations,
  sampleTarget,
} from "./fixtures";

describe("survey-tool-profile", () => {
  const reco = calculateRecommendation(
    samplePlanStations,
    sampleActualStations,
    sampleTarget()
  )!;

  it("preset defaults match spec", () => {
    expect(SURVEY_TOOL_PRESETS["reflex-ez-trac"].azimuthUncertaintyDeg).toBe(0.35);
    expect(SURVEY_TOOL_PRESETS.omnix42.azimuthUncertaintyDeg).toBe(0.4);
    expect(SURVEY_TOOL_PRESETS.devigyro.dipUncertaintyDeg).toBe(0.1);
  });

  it("caution when miss is inside tolerance but uncertainty consumes margin", () => {
    const tightReco = {
      ...reco,
      miss: reco.tolerance - 0.2,
      tolerance: reco.tolerance,
    };
    const assessment = assessSurveyUncertainty(tightReco, {
      ...profileFromPreset("reflex-ez-trac"),
      repeatSurveyThresholdM: 0.1,
    });
    expect(assessment?.confidenceLevel).not.toBe("normal");
  });

  it("repeat survey when miss exceeds tolerance", () => {
    const badReco = { ...reco, miss: reco.tolerance + 2 };
    const assessment = assessSurveyUncertainty(badReco, DEFAULT_SURVEY_TOOL_PROFILE);
    expect(assessment?.confidenceLevel).toBe("repeat_survey_recommended");
  });

  it("report includes survey tool profile", () => {
    const assessment = assessSurveyUncertainty(reco, DEFAULT_SURVEY_TOOL_PROFILE);
    const text = buildReportText(reco, sampleActualStations, {
      holeName: "DDH-0247",
      surveyToolProfile: DEFAULT_SURVEY_TOOL_PROFILE,
      surveyAssessment: assessment,
    });
    expect(text).toContain("SURVEY TOOL PROFILE");
    expect(text).toContain("REFLEX EZ-TRAC");
  });
});
