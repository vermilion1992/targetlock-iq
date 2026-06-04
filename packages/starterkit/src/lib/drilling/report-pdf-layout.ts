import {
  changeFromLatestSurveyLabel,
  feasibilityEscalationNote,
  formatRecoveryActionDisplay,
  nextCheckDepthMd,
  pdfNextIntervalAimLine,
  pdfRecoveryOneLiner,
} from "./action-plan-copy";
import {
  normalizeCapabilityAssumptions,
  type CapabilityAssumptions,
} from "./capability-assumptions";
import type { PlanCorridorStatus } from "./plan-corridor";
import type { HandoverReportData } from "./report-data";
import {
  DEFAULT_SURVEY_TOOL_PROFILE,
  type SurveyToolProfile,
  type SurveyUncertaintyAssessment,
} from "./survey-tool-profile";
import type { SteeringFeasibility } from "./steering-types";
import {
  assumptionsValidationStatus,
  type AssumptionSignOff,
} from "./validation";
import type { QaFlag, Recommendation } from "./types";

const ASSUMPTIONS_WITHIN_LINE =
  "Required DLS is within configured correction assumptions.";

export function sanitizePdfText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\u2022/g, "-")
    .replace(/\u00b7/g, "|")
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u00b0/g, " deg")
    .replace(/\u2212/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type HandoverPdfLayoutContext = {
  reco: Recommendation;
  steering?: SteeringFeasibility | null;
  corridorStatus?: PlanCorridorStatus | null;
  surveyAssessment?: SurveyUncertaintyAssessment | null;
  surveyToolProfile?: SurveyToolProfile | null;
  assumptionSignOff?: AssumptionSignOff | null;
  recoveryAssumptions?: Partial<CapabilityAssumptions> | null;
};

export type HandoverPdfRecoveryGuidanceDisplay = {
  currentAction: string;
  bestMethod: string;
  nextAim: string;
  confidence: string;
  escalation: string;
  pointOfNoReturn: string;
  methodSummary: string;
};

export type HandoverPdfViewModel = {
  page1: {
    projectedMissVsTolerance: string;
    offsetFromPlan: string;
    dlsRequiredVsLimit: string;
    nextIntervalAimLine: string;
    aimDip: string;
    aimAzimuth: string;
    changeFromLatest: string;
    nextCheckDepth: string;
    recoveryOneLiner: string;
    criticalWarnings: string[];
    criticalQaFlags: QaFlag[];
  };
  appendix: {
    includeTechnicalDetail: boolean;
    hasAppendixContent: boolean;
    recoveryGuidanceFull: HandoverPdfRecoveryGuidanceDisplay | null;
    recoveryLoopNotes: string[];
    feasibilityEscalationNote: string | null;
    recoveryAssumptionsLines: string[];
    recoveryAssumptionsOneLiner: string | null;
    validationStatus: string;
    validationDetail: string;
    conventions: string[];
    surveyToolSummary: string[];
    surveyToolOneLiner: string | null;
    surveyUncertaintyNote: string | null;
    planCorridorSummary: string | null;
    correctionOptions: HandoverReportData["correctionOptions"];
    qaFlagsAll: QaFlag[];
    qaFlagsNonOk: QaFlag[];
    recentHistory: HandoverReportData["recentHistory"];
    disclaimer: string;
  };
};

function needsFullRecoveryAssumptions(
  reco: Recommendation,
  steering: SteeringFeasibility | null | undefined,
  validationState: string
): boolean {
  if (validationState !== "validated") return true;
  const escalation = feasibilityEscalationNote(reco, steering);
  if (
    escalation === "Wedge/branch review may be required." ||
    escalation === "Consider shortening survey interval or requesting steering review."
  ) {
    return true;
  }
  const action = steering?.simple.currentAction;
  if (action === "Steering review" || action === "Wedge or branch review") return true;
  if (!Number.isFinite(reco.dlsRequired)) return false;
  return reco.dlsRequired > reco.maxDls * 0.85;
}

function needsFullSurveyTool(
  reco: Recommendation,
  profile: SurveyToolProfile | null | undefined,
  assessment: SurveyUncertaintyAssessment | null | undefined
): boolean {
  if (reco.miss > reco.tolerance) return true;
  if (assessment?.recommendationNote) return true;
  if (assessment?.confidenceLevel && assessment.confidenceLevel !== "normal") return true;
  if (profile && profile.presetId === "custom") return true;
  if (profile && profile.magneticRisk === "high") return true;
  return false;
}

function surveyToolOneLiner(profile: SurveyToolProfile | null | undefined): string | null {
  if (!profile) return null;
  return sanitizePdfText(
    `${profile.toolName} | +/-${profile.azimuthUncertaintyDeg} deg az, +/-${profile.dipUncertaintyDeg} deg dip`
  );
}

function buildRecoveryGuidanceDisplay(
  data: HandoverReportData,
  steering: SteeringFeasibility | null | undefined
): HandoverPdfRecoveryGuidanceDisplay | null {
  if (!data.recoveryGuidance) return null;
  const rg = data.recoveryGuidance;
  const bestMethodId = steering?.bestMethodId ?? null;
  return {
    currentAction: sanitizePdfText(
      formatRecoveryActionDisplay(rg.currentAction, bestMethodId)
    ),
    bestMethod: sanitizePdfText(rg.bestMethod),
    nextAim: sanitizePdfText(rg.nextAim),
    confidence: sanitizePdfText(rg.confidence),
    escalation: sanitizePdfText(formatRecoveryActionDisplay(rg.escalation, bestMethodId)),
    pointOfNoReturn: sanitizePdfText(rg.pointOfNoReturn),
    methodSummary: sanitizePdfText(rg.methodSummary),
  };
}

export function buildHandoverPdfViewModel(
  data: HandoverReportData,
  ctx: HandoverPdfLayoutContext
): HandoverPdfViewModel {
  const { reco, steering, corridorStatus, surveyAssessment, surveyToolProfile } = ctx;
  const normalizedAssumptions = normalizeCapabilityAssumptions(ctx.recoveryAssumptions);
  const validation = assumptionsValidationStatus(ctx.assumptionSignOff ?? null, normalizedAssumptions);

  const criticalQaFlags = data.qaFlags.filter((f) => f.level !== "ok");
  const qaFlagsNonOk = criticalQaFlags;

  const criticalWarnings: string[] = [];
  if (validation.state !== "validated") {
    criticalWarnings.push(sanitizePdfText(`${validation.label}: ${validation.detail}`));
  }
  if (corridorStatus?.outsidePlannedCorridor) {
    criticalWarnings.push(
      sanitizePdfText(
        corridorStatus.detailPhrase ||
          "Latest interval outside planned behaviour tolerance."
      )
    );
  } else if (corridorStatus && !corridorStatus.targetStillRecoverable) {
    criticalWarnings.push(sanitizePdfText("Target recoverability at risk."));
  }
  const feasibility = feasibilityEscalationNote(reco, steering);
  if (
    feasibility &&
    (feasibility.includes("Wedge") ||
      feasibility.includes("steering review") ||
      feasibility.includes("shorten"))
  ) {
    criticalWarnings.push(sanitizePdfText(feasibility));
  }
  if (surveyAssessment?.recommendationNote && reco.miss > reco.tolerance * 0.75) {
    criticalWarnings.push(sanitizePdfText(surveyAssessment.recommendationNote));
  }

  const fullAssumptions = needsFullRecoveryAssumptions(reco, steering, validation.state);
  const fullSurveyTool = needsFullSurveyTool(reco, surveyToolProfile, surveyAssessment ?? null);
  const meaningfulCorrections =
    data.correctionOptions.length > 0 && reco.classification.className !== "on-track";
  const includeTechnicalDetail =
    validation.state !== "validated" ||
    corridorStatus?.outsidePlannedCorridor === true ||
    reco.miss > reco.tolerance ||
    qaFlagsNonOk.length > 0 ||
    meaningfulCorrections ||
    fullSurveyTool ||
    fullAssumptions ||
    data.recentHistory.length > 0;

  const recoveryAssumptionsOneLiner = fullAssumptions
    ? null
    : ASSUMPTIONS_WITHIN_LINE;

  const hasAppendixContent =
    Boolean(data.recoveryGuidance) ||
    fullAssumptions ||
    validation.state !== "validated" ||
    (includeTechnicalDetail && data.conventions.length > 0) ||
    fullSurveyTool ||
    Boolean(corridorStatus?.outsidePlannedCorridor || corridorStatus?.detailPhrase) ||
    meaningfulCorrections ||
    qaFlagsNonOk.length > 0 ||
    data.recentHistory.length > 0;

  return {
    page1: {
      projectedMissVsTolerance: sanitizePdfText(
        `${data.projectedMiss} vs ${data.tolerance} tolerance`
      ),
      offsetFromPlan: sanitizePdfText(data.planOffset),
      dlsRequiredVsLimit: sanitizePdfText(`${data.dlsRequired} | Limit ${data.dlsLimit}`),
      nextIntervalAimLine: sanitizePdfText(pdfNextIntervalAimLine(reco.target.nextInterval)),
      aimDip: sanitizePdfText(data.aimDip),
      aimAzimuth: sanitizePdfText(data.aimAzimuth),
      changeFromLatest: sanitizePdfText(
        changeFromLatestSurveyLabel(reco.dipChange, reco.aziChange)
      ),
      nextCheckDepth: sanitizePdfText(nextCheckDepthMd(reco.current.md, reco.target.nextInterval)),
      recoveryOneLiner: sanitizePdfText(pdfRecoveryOneLiner(reco, steering)),
      criticalWarnings: criticalWarnings.slice(0, 4),
      criticalQaFlags,
    },
    appendix: {
      includeTechnicalDetail,
      hasAppendixContent,
      recoveryGuidanceFull: buildRecoveryGuidanceDisplay(data, steering),
      recoveryLoopNotes: data.recoveryLoopNotes.map(sanitizePdfText),
      feasibilityEscalationNote: data.feasibilityEscalationNote
        ? sanitizePdfText(data.feasibilityEscalationNote)
        : null,
      recoveryAssumptionsLines: fullAssumptions
        ? data.recoveryAssumptionsSummary.map(sanitizePdfText)
        : [],
      recoveryAssumptionsOneLiner,
      validationStatus: sanitizePdfText(data.validationStatus),
      validationDetail: sanitizePdfText(data.validationDetail),
      conventions: includeTechnicalDetail
        ? data.conventions.map(sanitizePdfText)
        : [],
      surveyToolSummary: fullSurveyTool
        ? data.surveyToolSummary.map(sanitizePdfText)
        : [],
      surveyToolOneLiner: fullSurveyTool
        ? null
        : surveyToolOneLiner(surveyToolProfile ?? DEFAULT_SURVEY_TOOL_PROFILE),
      surveyUncertaintyNote: fullSurveyTool && data.surveyUncertaintyNote
        ? sanitizePdfText(data.surveyUncertaintyNote)
        : null,
      planCorridorSummary:
        corridorStatus?.outsidePlannedCorridor || !corridorStatus?.targetStillRecoverable
          ? data.planCorridorSummary
            ? sanitizePdfText(data.planCorridorSummary)
            : null
          : null,
      correctionOptions: meaningfulCorrections ? data.correctionOptions : [],
      qaFlagsAll: data.qaFlags,
      qaFlagsNonOk,
      recentHistory: data.recentHistory,
      disclaimer: sanitizePdfText(data.disclaimer),
    },
  };
}

export type BranchPdfViewModel = {
  page1: {
    daughterId: string;
    title: string;
    summaryTarget: string;
    summaryKickoffMd: string;
    summaryRequiredDls: string;
    summarySeparation: string;
    summaryApproval: string;
    toolfaceOneLiner: string | null;
    criticalWarnings: string[];
  };
  appendix: {
    hasAppendixContent: boolean;
    kickoffLines: string[];
    sections: { title: string; lines: string[] }[];
    disclaimer: string;
  };
};

export function buildBranchPdfViewModel(
  data: import("./branch-report-data").BranchReportData
): BranchPdfViewModel {
  const criticalWarnings: string[] = [];
  if (data.summaryApproval.startsWith("WARNING")) {
    criticalWarnings.push(sanitizePdfText(data.summaryApproval));
  }
  if (
    data.summarySeparation.includes("Warning") ||
    data.summarySeparation.includes("Caution")
  ) {
    criticalWarnings.push(sanitizePdfText(`Separation: ${data.summarySeparation}`));
  }

  return {
    page1: {
      daughterId: sanitizePdfText(data.daughterId),
      title: sanitizePdfText(data.title),
      summaryTarget: sanitizePdfText(data.summaryTarget),
      summaryKickoffMd: sanitizePdfText(data.summaryKickoffMd),
      summaryRequiredDls: sanitizePdfText(data.summaryRequiredDls),
      summarySeparation: sanitizePdfText(data.summarySeparation),
      summaryApproval: sanitizePdfText(data.summaryApproval),
      toolfaceOneLiner: data.summaryToolfaceOneLiner
        ? sanitizePdfText(data.summaryToolfaceOneLiner)
        : null,
      criticalWarnings,
    },
    appendix: {
      hasAppendixContent: data.sections.length > 0 || data.summaryKickoffLines.length > 0,
      kickoffLines: data.summaryKickoffLines.map(sanitizePdfText),
      sections: data.sections.map((s) => ({
        title: sanitizePdfText(s.title),
        lines: s.lines.map(sanitizePdfText),
      })),
      disclaimer: sanitizePdfText(data.disclaimer),
    },
  };
}

/** Collect all PDF-bound strings for encoding / label smoke tests. */
export function collectHandoverPdfStrings(vm: HandoverPdfViewModel): string[] {
  const { page1, appendix } = vm;
  const strings = [
    page1.projectedMissVsTolerance,
    page1.offsetFromPlan,
    page1.dlsRequiredVsLimit,
    page1.nextIntervalAimLine,
    page1.aimDip,
    page1.aimAzimuth,
    page1.changeFromLatest,
    page1.nextCheckDepth,
    page1.recoveryOneLiner,
    ...page1.criticalWarnings,
    ...page1.criticalQaFlags.flatMap((f) => [f.label, f.message]),
    appendix.disclaimer,
    appendix.recoveryAssumptionsOneLiner ?? "",
    appendix.validationStatus,
    appendix.validationDetail,
    ...appendix.conventions,
    ...appendix.recoveryAssumptionsLines,
    ...appendix.surveyToolSummary,
    appendix.surveyToolOneLiner ?? "",
    appendix.surveyUncertaintyNote ?? "",
    appendix.planCorridorSummary ?? "",
    appendix.feasibilityEscalationNote ?? "",
    ...appendix.recoveryLoopNotes,
  ];
  if (appendix.recoveryGuidanceFull) {
    const rg = appendix.recoveryGuidanceFull;
    strings.push(
      rg.currentAction,
      rg.bestMethod,
      rg.nextAim,
      rg.confidence,
      rg.escalation,
      rg.pointOfNoReturn,
      rg.methodSummary
    );
  }
  return strings.filter(Boolean);
}

export function pdfTextLooksCorrupt(text: string): boolean {
  if (/\u2022/.test(text)) return true;
  if (/\bCorrect now\b/.test(text)) return true;
  if (/\b(\w\s){4,}\w\b/.test(text)) return true;
  return false;
}
