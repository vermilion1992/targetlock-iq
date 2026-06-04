import type { PlanCorridorConfig } from "./plan-corridor";
import { planTargetFromStations } from "./recommendation";
import type { SurveyRecord, SurveyStation, TargetConfig } from "./types";

export type ManualSurveyValidation = {
  ok: boolean;
  error?: string;
  warning?: string;
  replacingIndex: number;
};

export function findSurveyAtMd(
  actualRecords: SurveyRecord[],
  md: number
): number {
  return actualRecords.findIndex((record) => Math.abs(record.md - md) < 0.001);
}

export function validateManualSurvey(params: {
  md: number;
  dip: number;
  azimuth: number;
  actualRecords: SurveyRecord[];
  targetMd?: number;
  planFinalMd?: number;
}): ManualSurveyValidation {
  const { md, dip, azimuth, actualRecords, targetMd, planFinalMd } = params;

  if (!Number.isFinite(md) || !Number.isFinite(dip) || !Number.isFinite(azimuth)) {
    return { ok: false, error: "Enter MD, dip, and azimuth before adding a survey.", replacingIndex: -1 };
  }
  if (md < 0) {
    return { ok: false, error: "Measured depth must be 0 m or deeper.", replacingIndex: -1 };
  }
  if (dip < -90 || dip > 90) {
    return { ok: false, error: "Dip must be between -90° and 90°.", replacingIndex: -1 };
  }
  if (azimuth < 0 || azimuth > 360) {
    return { ok: false, error: "Azimuth must be between 0° and 360°.", replacingIndex: -1 };
  }

  const replacingIndex = findSurveyAtMd(actualRecords, md);
  const last = actualRecords[actualRecords.length - 1];
  if (replacingIndex === -1 && last && md <= last.md) {
    return {
      ok: false,
      error: `Next survey MD must be greater than the current ${last.md.toFixed(1)} m survey.`,
      replacingIndex: -1,
    };
  }

  let warning: string | undefined;
  const deepRefs = [targetMd, planFinalMd].filter(
    (v): v is number => v != null && Number.isFinite(v)
  );
  const deepest = deepRefs.length ? Math.max(...deepRefs) : undefined;
  if (deepest != null && md > deepest + 0.001) {
    warning = `MD ${md.toFixed(1)} m is deeper than the planned target (${deepest.toFixed(1)} m). You can still add the survey.`;
  }

  return { ok: true, warning, replacingIndex };
}

export function canValidateManualSurveyInput(
  manualMd: string,
  manualDip: string,
  manualAzimuth: string,
  actualRecords: SurveyRecord[],
  targetMd?: number,
  planFinalMd?: number
): boolean {
  if (!manualMd.trim() || !manualDip.trim() || !manualAzimuth.trim()) return false;
  const md = Number(manualMd);
  const dip = Number(manualDip);
  const azimuth = Number(manualAzimuth);
  return validateManualSurvey({
    md,
    dip,
    azimuth,
    actualRecords,
    targetMd,
    planFinalMd,
  }).ok;
}

export function sanitizeTargetField(
  field: keyof TargetConfig,
  raw: number,
  previous: TargetConfig
): number {
  if (!Number.isFinite(raw)) return previous[field];
  switch (field) {
    case "md":
      return Math.max(0, raw);
    case "tolerance":
      return Math.max(0.1, raw);
    case "maxDls":
      return Math.max(0.1, raw);
    case "nextInterval":
      return Math.max(1, raw);
    default:
      return raw;
  }
}

export function sanitizePlanCorridorField(
  field: keyof PlanCorridorConfig,
  raw: number,
  previous: PlanCorridorConfig
): number {
  if (!Number.isFinite(raw)) return previous[field] as number;
  switch (field) {
    case "intervalM":
      return Math.max(1, raw);
    case "allowedDipDevDeg":
    case "allowedAziDevDeg":
      return Math.max(0.05, raw);
    case "positionOffsetM":
      return Math.max(0.1, raw);
    case "positionWidenPer100m":
      return Math.max(0, raw);
    default:
      return raw;
  }
}

export function hasPlanTargetAtMd(planStations: SurveyStation[], md: number): boolean {
  if (planStations.length === 0) return false;
  return planTargetFromStations(planStations, md) != null;
}
