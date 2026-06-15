import { normalizeAngle } from "./geometry";
import type { SurveyRecord } from "./types";
import type { NorthReference } from "./survey-tool-profile";

export type { NorthReference };

export type ReferenceSystemConfig = {
  planReference: NorthReference;
  surveyReference: NorthReference;
  outputReference: NorthReference;
  /** Degrees added to grid azimuth to obtain true azimuth. */
  gridRotationDeg: number;
  /** East-positive declination added to magnetic azimuth to obtain true azimuth. */
  magneticDeclinationDeg: number;
};

export type ReferenceWarning = {
  id: string;
  severity: "info" | "warning";
  message: string;
};

export const DEFAULT_REFERENCE_SYSTEM: ReferenceSystemConfig = {
  planReference: "grid",
  surveyReference: "grid",
  outputReference: "grid",
  gridRotationDeg: 0,
  magneticDeclinationDeg: 0,
};

const NORTH_REFS: NorthReference[] = ["grid", "true", "magnetic"];

export function normalizeAzimuth(angle: number): number {
  return normalizeAngle(angle);
}

export function normalizeReferenceSystem(
  raw?: Partial<ReferenceSystemConfig> | null
): ReferenceSystemConfig {
  const base = { ...DEFAULT_REFERENCE_SYSTEM, ...raw };
  return {
    planReference: NORTH_REFS.includes(base.planReference) ? base.planReference : "grid",
    surveyReference: NORTH_REFS.includes(base.surveyReference)
      ? base.surveyReference
      : "grid",
    outputReference: NORTH_REFS.includes(base.outputReference)
      ? base.outputReference
      : "grid",
    gridRotationDeg: Number.isFinite(base.gridRotationDeg) ? base.gridRotationDeg : 0,
    magneticDeclinationDeg: Number.isFinite(base.magneticDeclinationDeg)
      ? base.magneticDeclinationDeg
      : 0,
  };
}

/** Convert an azimuth from the given reference into true north. */
export function toTrueAzimuth(
  azimuth: number,
  fromReference: NorthReference,
  config: ReferenceSystemConfig
): number {
  if (fromReference === "true") return normalizeAzimuth(azimuth);
  if (fromReference === "grid") {
    return normalizeAzimuth(azimuth + config.gridRotationDeg);
  }
  return normalizeAzimuth(azimuth + config.magneticDeclinationDeg);
}

/** Convert a true-north azimuth into the given reference for display. */
export function fromTrueAzimuth(
  trueAzimuth: number,
  toReference: NorthReference,
  config: ReferenceSystemConfig
): number {
  if (toReference === "true") return normalizeAzimuth(trueAzimuth);
  if (toReference === "grid") {
    return normalizeAzimuth(trueAzimuth - config.gridRotationDeg);
  }
  return normalizeAzimuth(trueAzimuth - config.magneticDeclinationDeg);
}

export function convertTargetBearingReference(
  azimuth: number,
  fromReference: NorthReference,
  toReference: NorthReference,
  config: ReferenceSystemConfig
): number {
  const trueAz = toTrueAzimuth(azimuth, fromReference, config);
  return fromTrueAzimuth(trueAz, toReference, config);
}

export function convertSurveyRecordsReference(
  records: SurveyRecord[],
  fromReference: NorthReference,
  config: ReferenceSystemConfig
): SurveyRecord[] {
  if (fromReference === "true") return records;
  return records.map((record) => ({
    ...record,
    azimuth: toTrueAzimuth(record.azimuth, fromReference, config),
  }));
}

export function buildReferenceWarnings(config: ReferenceSystemConfig): ReferenceWarning[] {
  const warnings: ReferenceWarning[] = [];

  if (config.planReference !== config.surveyReference) {
    warnings.push({
      id: "mixed-reference",
      severity: "warning",
      message:
        "Plan azimuths and survey azimuths are using different north references. TargetLock has converted them internally, but confirm grid rotation and declination before using guidance.",
    });
  }

  const usesMagnetic =
    config.planReference === "magnetic" || config.surveyReference === "magnetic";
  if (usesMagnetic && config.magneticDeclinationDeg === 0) {
    warnings.push({
      id: "missing-declination",
      severity: "warning",
      message:
        "Magnetic North selected but no declination entered. Calculations may be incorrect.",
    });
  }

  const usesGrid =
    config.planReference === "grid" || config.surveyReference === "grid";
  if (usesGrid && config.gridRotationDeg === 0) {
    warnings.push({
      id: "grid-rotation-zero",
      severity: "info",
      message:
        "Grid North selected but grid rotation is 0°. Confirm this is correct for the site.",
    });
  }

  return warnings;
}
