import type { RecoveryConfidence } from "./steering-types";

export type HoleMode = "angle" | "high-angle" | "near-vertical";

export type HoleModeAssessment = {
  mode: HoleMode;
  label: string;
  severity: "normal" | "watch" | "risk";
  message: string;
};

const NEAR_VERTICAL_MESSAGE =
  "This hole is approaching vertical behaviour. Small azimuth or dip changes can produce unexpected lateral movement. Review survey quality, magnetic interference, and steering assumptions before relying on standard correction guidance.";

const HIGH_ANGLE_MESSAGE =
  "This hole is steep enough that steering behaviour may be less predictable than a conventional angle hole. Confirm survey quality and monitor lateral movement closely.";

export function assessHoleMode(currentDip: number): HoleModeAssessment {
  const absDip = Math.abs(currentDip);

  if (absDip >= 85) {
    return {
      mode: "near-vertical",
      label: "Near-vertical hole",
      severity: "risk",
      message: NEAR_VERTICAL_MESSAGE,
    };
  }

  if (absDip >= 75) {
    return {
      mode: "high-angle",
      label: "High-angle watch",
      severity: "watch",
      message: HIGH_ANGLE_MESSAGE,
    };
  }

  return {
    mode: "angle",
    label: "Angle hole",
    severity: "normal",
    message: "",
  };
}

export function adjustConfidenceForHoleMode(
  confidence: RecoveryConfidence,
  mode: HoleMode
): RecoveryConfidence {
  if (mode === "angle") return confidence;
  if (mode === "high-angle") {
    if (confidence === "High") return "Medium";
    return confidence;
  }
  if (confidence === "High") return "Medium";
  if (confidence === "Medium") return "Low";
  return confidence;
}
