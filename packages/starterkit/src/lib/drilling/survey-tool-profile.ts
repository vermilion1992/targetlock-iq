import { round } from "./format";
import type { Recommendation } from "./types";

export type NorthReference = "grid" | "true" | "magnetic";
export type MagneticRisk = "low" | "medium" | "high";
export type SurveyToolPresetId =
  | "reflex-ez-trac"
  | "omnix42"
  | "devigyro"
  | "custom";

export type SurveyConfidenceLevel =
  | "normal"
  | "caution"
  | "repeat_survey_recommended";

export type SurveyToolProfile = {
  presetId: SurveyToolPresetId;
  toolName: string;
  azimuthUncertaintyDeg: number;
  dipUncertaintyDeg: number;
  northReference: NorthReference;
  magneticRisk: MagneticRisk;
  /** Projected miss within this distance of tolerance triggers caution. */
  repeatSurveyThresholdM: number;
};

export const SURVEY_TOOL_PRESETS: Record<
  Exclude<SurveyToolPresetId, "custom">,
  Omit<SurveyToolProfile, "presetId">
> = {
  "reflex-ez-trac": {
    toolName: "REFLEX EZ-TRAC",
    azimuthUncertaintyDeg: 0.35,
    dipUncertaintyDeg: 0.25,
    northReference: "grid",
    magneticRisk: "low",
    repeatSurveyThresholdM: 1.5,
  },
  omnix42: {
    toolName: "IMDEX OMNIx42",
    azimuthUncertaintyDeg: 0.4,
    dipUncertaintyDeg: 0.25,
    northReference: "grid",
    magneticRisk: "low",
    repeatSurveyThresholdM: 1.5,
  },
  devigyro: {
    toolName: "DeviGyro",
    azimuthUncertaintyDeg: 0.1,
    dipUncertaintyDeg: 0.1,
    northReference: "true",
    magneticRisk: "low",
    repeatSurveyThresholdM: 1.0,
  },
};

export const DEFAULT_SURVEY_TOOL_PROFILE: SurveyToolProfile = {
  presetId: "reflex-ez-trac",
  ...SURVEY_TOOL_PRESETS["reflex-ez-trac"],
};

export function profileFromPreset(
  presetId: SurveyToolPresetId,
  overrides?: Partial<SurveyToolProfile>
): SurveyToolProfile {
  const base =
    presetId === "custom"
      ? { ...DEFAULT_SURVEY_TOOL_PROFILE, presetId: "custom" as const, toolName: "Custom tool" }
      : { presetId, ...SURVEY_TOOL_PRESETS[presetId] };
  return normalizeSurveyToolProfile({ ...base, ...overrides });
}

export function normalizeSurveyToolProfile(
  partial?: Partial<SurveyToolProfile> | null
): SurveyToolProfile {
  const presetId = partial?.presetId ?? DEFAULT_SURVEY_TOOL_PROFILE.presetId;
  const presetBase =
    presetId === "custom"
      ? { ...DEFAULT_SURVEY_TOOL_PROFILE, presetId: "custom" as const }
      : { presetId, ...SURVEY_TOOL_PRESETS[presetId] };
  const merged = { ...presetBase, ...partial, presetId };
  return {
    ...merged,
    azimuthUncertaintyDeg: Math.max(0.01, merged.azimuthUncertaintyDeg),
    dipUncertaintyDeg: Math.max(0.01, merged.dipUncertaintyDeg),
    repeatSurveyThresholdM: Math.max(0.1, merged.repeatSurveyThresholdM),
  };
}

export type SurveyUncertaintyAssessment = {
  confidenceLevel: SurveyConfidenceLevel;
  uncertaintyBandM: number;
  recommendationNote: string;
  summaryLabel: string;
};

/** Conservative scalar — not a full error ellipse. */
export function estimateUncertaintyBandM(
  reco: Recommendation,
  profile: SurveyToolProfile
): number {
  const md = Math.max(reco.current.md, 1);
  const aziRad = (profile.azimuthUncertaintyDeg * Math.PI) / 180;
  const dipRad = (profile.dipUncertaintyDeg * Math.PI) / 180;
  const angular = md * Math.tan(aziRad) + md * Math.tan(dipRad);
  const magneticFactor =
    profile.magneticRisk === "high" ? 1.4 : profile.magneticRisk === "medium" ? 1.15 : 1;
  return Math.min(reco.tolerance * 1.5, angular * magneticFactor);
}

export function assessSurveyUncertainty(
  reco: Recommendation | null,
  profile: SurveyToolProfile | null | undefined
): SurveyUncertaintyAssessment | null {
  if (!reco || !profile) return null;

  const uncertaintyBandM = estimateUncertaintyBandM(reco, profile);
  const miss = reco.miss;
  const tolerance = reco.tolerance;
  const margin = tolerance - miss;
  const effectiveMargin = margin - uncertaintyBandM;

  let confidenceLevel: SurveyConfidenceLevel = "normal";
  let recommendationNote =
    "Projected position is inside target tolerance for this tool.";

  if (miss > tolerance) {
    confidenceLevel = "repeat_survey_recommended";
    recommendationNote = `Projected miss ${round(miss, 1)} m exceeds ${round(tolerance, 1)} m tolerance — confirm surveys and steering plan.`;
  } else if (margin <= profile.repeatSurveyThresholdM) {
    confidenceLevel = "repeat_survey_recommended";
    recommendationNote = `Within ${round(profile.repeatSurveyThresholdM, 1)} m of tolerance — confirm at next survey.`;
  } else if (effectiveMargin <= 0) {
    confidenceLevel = "caution";
    recommendationNote = `${round(miss, 1)} m miss with ~${round(uncertaintyBandM, 1)} m uncertainty — confirm next survey.`;
  } else if (effectiveMargin < profile.repeatSurveyThresholdM) {
    confidenceLevel = "caution";
    recommendationNote = `Inside target but near tolerance for ${profile.toolName} — confirm next survey.`;
  }

  const summaryLabel =
    confidenceLevel === "normal"
      ? "Low uncertainty"
      : confidenceLevel === "caution"
        ? "Medium uncertainty"
        : "High uncertainty";

  return {
    confidenceLevel,
    uncertaintyBandM,
    recommendationNote,
    summaryLabel,
  };
}

export function formatSurveyProfileSummary(profile: SurveyToolProfile): string[] {
  return [
    `${profile.toolName} (±${profile.azimuthUncertaintyDeg}° az, ±${profile.dipUncertaintyDeg}° dip)`,
    `North reference: ${profile.northReference}`,
    `Magnetic interference risk: ${profile.magneticRisk}`,
  ];
}
