import { DEG } from "./geometry";
import type { SurveyToolProfile } from "./survey-tool-profile";
import type { SurveyStation } from "./types";

/**
 * ISCWSA-inspired simplified positional uncertainty model.
 *
 * This is NOT a certified ISCWSA / OWSG implementation. It propagates a
 * reduced set of error terms along the minimum-curvature path:
 * - depth (proportional + constant) — along-hole axis
 * - inclination sensor error — highside axis (random per survey leg)
 * - azimuth sensor error — lateral axis (random per survey leg)
 * - declination / north-reference error — lateral axis (systematic,
 *   fully correlated across the hole)
 *
 * Random terms accumulate in quadrature; the systematic declination term
 * accumulates linearly. Axes are expressed in the borehole frame at each
 * station (along / highside / lateral) rather than as a full 3x3 ENU
 * covariance — adequate for decision support, not survey certification.
 */

export type ToolErrorClassId =
  | "magnetic-multishot"
  | "north-seeking-gyro"
  | "camera-singleshot"
  | "custom";

export type ToolErrorModel = {
  classId: ToolErrorClassId;
  label: string;
  /** 1-sigma along-hole depth error, proportional (m per m of MD). */
  depthProportional: number;
  /** 1-sigma constant depth error in metres. */
  depthConstantM: number;
  /** 1-sigma inclination sensor error in degrees. */
  inclinationDeg: number;
  /** 1-sigma azimuth sensor error in degrees. */
  azimuthSensorDeg: number;
  /** 1-sigma declination / north-reference error in degrees (systematic). */
  declinationDeg: number;
};

export const TOOL_ERROR_CLASSES: Record<
  Exclude<ToolErrorClassId, "custom">,
  ToolErrorModel
> = {
  "magnetic-multishot": {
    classId: "magnetic-multishot",
    label: "Magnetic multishot (EZ-TRAC class)",
    depthProportional: 0.0005,
    depthConstantM: 0.3,
    inclinationDeg: 0.25,
    azimuthSensorDeg: 0.35,
    declinationDeg: 0.5,
  },
  "north-seeking-gyro": {
    classId: "north-seeking-gyro",
    label: "North-seeking gyro (DeviGyro class)",
    depthProportional: 0.0005,
    depthConstantM: 0.3,
    inclinationDeg: 0.1,
    azimuthSensorDeg: 0.1,
    declinationDeg: 0.05,
  },
  "camera-singleshot": {
    classId: "camera-singleshot",
    label: "Camera / single-shot",
    depthProportional: 0.001,
    depthConstantM: 0.5,
    inclinationDeg: 0.5,
    azimuthSensorDeg: 1.0,
    declinationDeg: 0.75,
  },
};

export const DEFAULT_TOOL_ERROR_MODEL: ToolErrorModel =
  TOOL_ERROR_CLASSES["magnetic-multishot"];

/** Default sigma multiplier — 2-sigma is roughly 95% confidence. */
export const DEFAULT_SIGMA_FACTOR = 2;

const MAGNETIC_RISK_FACTOR: Record<SurveyToolProfile["magneticRisk"], number> =
  {
    low: 1,
    medium: 1.25,
    high: 1.6,
  };

/**
 * Derive an error model from the existing survey tool profile so the
 * dashboard uncertainty reflects the configured tool.
 */
export function errorModelFromSurveyToolProfile(
  profile: SurveyToolProfile
): ToolErrorModel {
  const base =
    profile.presetId === "devigyro"
      ? TOOL_ERROR_CLASSES["north-seeking-gyro"]
      : TOOL_ERROR_CLASSES["magnetic-multishot"];
  const magneticFactor =
    base.classId === "north-seeking-gyro"
      ? 1
      : MAGNETIC_RISK_FACTOR[profile.magneticRisk];
  return {
    ...base,
    classId: profile.presetId === "custom" ? "custom" : base.classId,
    label:
      profile.presetId === "custom"
        ? `Custom (${profile.toolName})`
        : base.label,
    inclinationDeg: profile.dipUncertaintyDeg,
    azimuthSensorDeg: profile.azimuthUncertaintyDeg * magneticFactor,
    declinationDeg: base.declinationDeg * magneticFactor,
  };
}

export type StationUncertainty = {
  md: number;
  /** Semi-axis along the borehole axis (m, scaled by sigma factor). */
  semiAlongM: number;
  /** Semi-axis in the vertical plane, perpendicular to the axis (m). */
  semiHighsideM: number;
  /** Semi-axis horizontal-lateral, perpendicular to the axis (m). */
  semiLateralM: number;
  /** Largest semi-axis — conservative combined radius for clearance. */
  radiusM: number;
};

export type HoleUncertainty = {
  model: ToolErrorModel;
  sigmaFactor: number;
  stations: StationUncertainty[];
};

/**
 * Propagate positional uncertainty station-by-station along a desurveyed
 * path. Stations must be ordered by MD (as produced by buildStations).
 */
export function propagateUncertainty(
  stations: SurveyStation[],
  model: ToolErrorModel = DEFAULT_TOOL_ERROR_MODEL,
  sigmaFactor: number = DEFAULT_SIGMA_FACTOR
): HoleUncertainty {
  const incRad = model.inclinationDeg * DEG;
  const aziRad = model.azimuthSensorDeg * DEG;
  const decRad = model.declinationDeg * DEG;

  const out: StationUncertainty[] = [];
  let varAlong = model.depthConstantM * model.depthConstantM;
  let varHighside = 0;
  let varLateralRandom = 0;
  let lateralSystematic = 0;

  stations.forEach((station, index) => {
    if (index > 0) {
      const previous = stations[index - 1];
      const legLength = Math.max(0, station.md - previous.md);
      // Horizontal scale of the leg — azimuth errors only act on the
      // horizontal component of displacement.
      const meanDip = (previous.dip + station.dip) / 2;
      const horizontal = Math.abs(Math.cos(meanDip * DEG));

      const dDepth = model.depthProportional * legLength;
      varAlong += dDepth * dDepth;

      const dInc = legLength * incRad;
      varHighside += dInc * dInc;

      const dAzi = legLength * horizontal * aziRad;
      varLateralRandom += dAzi * dAzi;

      lateralSystematic += legLength * horizontal * decRad;
    }

    const semiAlongM = sigmaFactor * Math.sqrt(varAlong);
    const semiHighsideM = sigmaFactor * Math.sqrt(varHighside);
    const semiLateralM =
      sigmaFactor *
      Math.sqrt(varLateralRandom + lateralSystematic * lateralSystematic);

    out.push({
      md: station.md,
      semiAlongM,
      semiHighsideM,
      semiLateralM,
      radiusM: Math.max(semiAlongM, semiHighsideM, semiLateralM),
    });
  });

  return { model, sigmaFactor, stations: out };
}

/** Interpolated uncertainty at an arbitrary MD along the hole. */
export function uncertaintyAtMd(
  uncertainty: HoleUncertainty,
  md: number
): StationUncertainty | null {
  const stations = uncertainty.stations;
  if (!stations.length) return null;
  if (md <= stations[0].md) return { ...stations[0], md };

  for (let i = 1; i < stations.length; i += 1) {
    const a = stations[i - 1];
    const b = stations[i];
    if (md <= b.md) {
      const span = b.md - a.md || 1;
      const t = Math.min(1, Math.max(0, (md - a.md) / span));
      const lerp = (x: number, y: number) => x + (y - x) * t;
      const semiAlongM = lerp(a.semiAlongM, b.semiAlongM);
      const semiHighsideM = lerp(a.semiHighsideM, b.semiHighsideM);
      const semiLateralM = lerp(a.semiLateralM, b.semiLateralM);
      return {
        md,
        semiAlongM,
        semiHighsideM,
        semiLateralM,
        radiusM: Math.max(semiAlongM, semiHighsideM, semiLateralM),
      };
    }
  }

  const last = stations[stations.length - 1];
  return { ...last, md };
}

export type TargetUncertaintyStatus = "clear" | "marginal" | "exceeds";

export type TargetUncertaintyAssessment = {
  status: TargetUncertaintyStatus;
  /** Lateral-position uncertainty radius at target MD (m). */
  radiusAtTargetM: number;
  /** tolerance - miss - radius; negative means uncertainty eats the margin. */
  effectiveMarginM: number;
  note: string;
};

/**
 * Compare positional uncertainty at the target MD against the remaining
 * target tolerance margin.
 */
export function assessTargetUncertainty(
  uncertainty: HoleUncertainty,
  targetMd: number,
  missM: number,
  toleranceM: number
): TargetUncertaintyAssessment | null {
  const at = uncertaintyAtMd(uncertainty, targetMd);
  if (!at) return null;

  // Lateral uncertainty (perpendicular to hole) is what threatens the
  // target intercept; along-hole depth error does not change the pierce point.
  const radiusAtTargetM = Math.max(at.semiHighsideM, at.semiLateralM);
  const effectiveMarginM = toleranceM - missM - radiusAtTargetM;

  let status: TargetUncertaintyStatus = "clear";
  let note = `Position uncertainty ±${radiusAtTargetM.toFixed(1)} m at target MD leaves ${effectiveMarginM.toFixed(1)} m margin inside tolerance.`;
  if (missM > toleranceM) {
    status = "exceeds";
    note = `Projected miss ${missM.toFixed(1)} m already exceeds ${toleranceM.toFixed(1)} m tolerance before uncertainty (±${radiusAtTargetM.toFixed(1)} m).`;
  } else if (effectiveMarginM <= 0) {
    status = "marginal";
    note = `Projected miss is inside tolerance, but ±${radiusAtTargetM.toFixed(1)} m position uncertainty could place the hole outside the ${toleranceM.toFixed(1)} m tolerance.`;
  }

  return { status, radiusAtTargetM, effectiveMarginM, note };
}

/**
 * Separation factor between two holes at their closest approach:
 * centre-to-centre distance divided by the sum of the conservative
 * uncertainty radii. SF < 1 means uncertainty envelopes may overlap.
 */
export function separationFactor(
  distanceM: number,
  uncertaintyA: StationUncertainty | null,
  uncertaintyB: StationUncertainty | null
): { factor: number | null; combinedRadiusM: number } {
  const radiusA = uncertaintyA?.radiusM ?? 0;
  const radiusB = uncertaintyB?.radiusM ?? 0;
  const combinedRadiusM = radiusA + radiusB;
  if (combinedRadiusM <= 0) {
    return { factor: null, combinedRadiusM: 0 };
  }
  return { factor: distanceM / combinedRadiusM, combinedRadiusM };
}

export function formatToolErrorModelSummary(model: ToolErrorModel): string {
  return `${model.label} — ±${model.inclinationDeg}° inc, ±${model.azimuthSensorDeg}° az, ±${model.declinationDeg}° dec, depth ${model.depthConstantM} m + ${(model.depthProportional * 1000).toFixed(1)} m/km`;
}
