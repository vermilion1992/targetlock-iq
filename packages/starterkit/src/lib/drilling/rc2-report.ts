import type { HoleMode, HoleModeAssessment } from "./hole-mode";
import { round } from "./format";
import {
  normalizeReferenceSystem,
  type NorthReference,
  type ReferenceSystemConfig,
  type ReferenceWarning,
} from "./reference-system";
import type { RecoveryConfidence } from "./steering-types";

const NORTH_LABELS: Record<NorthReference, string> = {
  grid: "Grid North",
  true: "True North",
  magnetic: "Magnetic North",
};

export type Rc2ReportContext = {
  planReference: string;
  surveyReference: string;
  outputReference: string;
  gridRotationDeg: string;
  magneticDeclinationDeg: string;
  internalReference: string;
  referenceWarnings: string[];
  holeMode: string | null;
  holeModeAdvisory: string | null;
  baseConfidence: string;
  reportedConfidence: string;
  confidenceDowngradeReason: string | null;
  summaryLines: string[];
  keyValues: { label: string; value: string }[];
};

export function northReferenceLabel(ref: NorthReference): string {
  return NORTH_LABELS[ref];
}

export function formatReferenceSystemLines(config: ReferenceSystemConfig): string[] {
  const normalized = normalizeReferenceSystem(config);
  return [
    `Plan north reference: ${northReferenceLabel(normalized.planReference)}`,
    `Survey camera reference: ${northReferenceLabel(normalized.surveyReference)}`,
    `Display output reference: ${northReferenceLabel(normalized.outputReference)}`,
    `Mine grid rotation: ${round(normalized.gridRotationDeg, 1)}°`,
    `Magnetic declination: ${round(normalized.magneticDeclinationDeg, 1)}°`,
    "Internal calculation reference: True North",
  ];
}

export function formatReferenceWarnings(warnings: ReferenceWarning[]): string[] {
  return warnings.map((warning) => warning.message);
}

export function formatHoleModeLines(assessment: HoleModeAssessment | null | undefined): string[] {
  if (!assessment || assessment.severity === "normal") return [];
  return [assessment.label, assessment.message];
}

export function confidenceDowngradeReason(
  base: RecoveryConfidence,
  adjusted: RecoveryConfidence,
  mode: HoleMode
): string | null {
  if (base === adjusted) return null;
  if (mode === "high-angle") {
    return `High-angle hole watch: reported confidence reduced from ${base} to ${adjusted} because steep holes steer less predictably than conventional angle holes.`;
  }
  if (mode === "near-vertical") {
    return `Near-vertical hole advisory: reported confidence reduced from ${base} to ${adjusted} because small survey changes can produce large lateral movement.`;
  }
  return null;
}

export type BuildRc2ReportContextInput = {
  referenceSystem?: ReferenceSystemConfig | null;
  referenceWarnings?: ReferenceWarning[];
  holeModeAssessment?: HoleModeAssessment | null;
  classificationConfidence?: string;
  recoveryConfidence?: RecoveryConfidence | null;
  baseRecoveryConfidence?: RecoveryConfidence | null;
};

export function buildRc2ReportContext(
  input: BuildRc2ReportContextInput
): Rc2ReportContext {
  const referenceSystem = normalizeReferenceSystem(input.referenceSystem);
  const referenceWarnings = formatReferenceWarnings(input.referenceWarnings ?? []);
  const holeModeLines = formatHoleModeLines(input.holeModeAssessment);
  const base =
    input.baseRecoveryConfidence ??
    (input.classificationConfidence as RecoveryConfidence | undefined) ??
    "Medium";
  const reported = input.recoveryConfidence ?? base;
  const downgradeReason = input.holeModeAssessment
    ? confidenceDowngradeReason(
        base,
        reported,
        input.holeModeAssessment.mode
      )
    : null;

  const summaryLines = [
    ...formatReferenceSystemLines(referenceSystem),
    ...(referenceWarnings.length
      ? ["Reference warnings:", ...referenceWarnings.map((w) => `- ${w}`)]
      : []),
    ...(holeModeLines.length ? ["Hole mode:", ...holeModeLines.map((l) => `- ${l}`)] : []),
    `Base confidence: ${base}`,
    `Reported confidence: ${reported}`,
    ...(downgradeReason ? [`Confidence note: ${downgradeReason}`] : []),
  ];

  const keyValues: { label: string; value: string }[] = [
    { label: "Plan north reference", value: northReferenceLabel(referenceSystem.planReference) },
    {
      label: "Survey north reference",
      value: northReferenceLabel(referenceSystem.surveyReference),
    },
    {
      label: "Display output reference",
      value: northReferenceLabel(referenceSystem.outputReference),
    },
    {
      label: "Grid rotation",
      value: `${round(referenceSystem.gridRotationDeg, 1)}°`,
    },
    {
      label: "Magnetic declination",
      value: `${round(referenceSystem.magneticDeclinationDeg, 1)}°`,
    },
    { label: "Internal calculation reference", value: "True North" },
    { label: "Hole mode", value: input.holeModeAssessment?.label ?? "Angle hole" },
    { label: "Base confidence", value: String(base) },
    { label: "Reported confidence", value: String(reported) },
  ];

  if (downgradeReason) {
    keyValues.push({ label: "Confidence downgrade reason", value: downgradeReason });
  }

  return {
    planReference: northReferenceLabel(referenceSystem.planReference),
    surveyReference: northReferenceLabel(referenceSystem.surveyReference),
    outputReference: northReferenceLabel(referenceSystem.outputReference),
    gridRotationDeg: `${round(referenceSystem.gridRotationDeg, 1)}°`,
    magneticDeclinationDeg: `${round(referenceSystem.magneticDeclinationDeg, 1)}°`,
    internalReference: "True North",
    referenceWarnings,
    holeMode: input.holeModeAssessment?.label ?? null,
    holeModeAdvisory: input.holeModeAssessment?.message || null,
    baseConfidence: String(base),
    reportedConfidence: String(reported),
    confidenceDowngradeReason: downgradeReason,
    summaryLines,
    keyValues,
  };
}
