import {
  feasibilityEscalationNote,
  nextIntervalAimExplainer,
  NEXT_INTERVAL_AIM_STATION_NOTE,
  recoveryLoopNotes,
} from "./action-plan-copy";
import { round, signed } from "./format";
import { buildQaFlags } from "./qa";
import {
  actionSentence,
  azimuthInstruction,
  buildCorrectionOptions,
  dipInstruction,
} from "./recommendation";
import type { DecisionHistoryEntry } from "./history";
import {
  formatAssumptionsSummary,
  normalizeCapabilityAssumptions,
  type CapabilityAssumptions,
} from "./capability-assumptions";
import {
  assumptionsValidationStatus,
  COORDINATE_CONVENTIONS,
  type AssumptionSignOff,
} from "./validation";
import type { PlanCorridorStatus } from "./plan-corridor";
import {
  formatSurveyProfileSummary,
  type SurveyToolProfile,
  type SurveyUncertaintyAssessment,
} from "./survey-tool-profile";
import type { SteeringFeasibility } from "./steering-types";
import { PDF_APP_VERSION } from "./pdf-brand";
import type { CorrectionOption, QaFlag, Recommendation, SurveyStation } from "./types";

export type HandoverReportOptions = {
  holeName?: string;
  siteName?: string;
  history?: DecisionHistoryEntry[];
  steering?: SteeringFeasibility | null;
  recoveryAssumptions?: Partial<CapabilityAssumptions> | null;
  assumptionSignOff?: AssumptionSignOff | null;
  testScenarioName?: string | null;
  surveyToolProfile?: SurveyToolProfile | null;
  surveyAssessment?: SurveyUncertaintyAssessment | null;
  corridorStatus?: PlanCorridorStatus | null;
  planStations?: SurveyStation[];
  trajectoryImagePng?: string | null;
  logoImagePng?: string | null;
};

export type HandoverReportData = {
  reportType: "Shift Handover";
  appVersion: string;
  holeName: string;
  siteName: string;
  testScenarioName: string | null;
  generatedAt: Date;
  trajectoryImagePng: string | null;
  logoImagePng: string | null;
  dateLabel: string;
  timeLabel: string;
  status: string;
  confidence: string;
  statusClassName: string;
  currentMd: string;
  actualDipAzi: string;
  planOffset: string;
  projectedMiss: string;
  missVector: string;
  aimDip: string;
  aimAzimuth: string;
  dipCorrection: string;
  aziCorrection: string;
  dlsRequired: string;
  dlsLimit: string;
  targetMd: string;
  targetEnu: string;
  tolerance: string;
  nextInterval: string;
  nextIntervalAimNote: string;
  nextIntervalAimExplainer: string;
  recoveryLoopNotes: string[];
  feasibilityEscalationNote: string | null;
  drillerGuidance: string;
  correctionOptions: CorrectionOption[];
  qaFlags: QaFlag[];
  recentHistory: {
    time: string;
    summary: string;
    action?: string;
  }[];
  recoveryGuidance: {
    currentAction: string;
    bestMethod: string;
    nextAim: string;
    confidence: string;
    escalation: string;
    pointOfNoReturn: string;
    methodSummary: string;
  } | null;
  recoveryAssumptionsSummary: string[];
  validationStatus: string;
  validationDetail: string;
  conventions: string[];
  disclaimer: string;
  surveyToolSummary: string[];
  surveyUncertaintyNote: string | null;
  planCorridorSummary: string | null;
};

export const HANDOVER_DISCLAIMER =
  "Decision support only. Steering feasibility depends on site conditions, tool capability, drilling contractor, and geologist/supervisor approval. Verify all recommendations against site procedures, independent desurvey, and operational sign-off.";

export function buildHandoverReportData(
  reco: Recommendation,
  actualStations: SurveyStation[],
  options?: HandoverReportOptions
): HandoverReportData {
  const steering = options?.steering ?? null;
  const normalizedAssumptions = normalizeCapabilityAssumptions(options?.recoveryAssumptions);
  const recoveryAssumptionsSummary = formatAssumptionsSummary(normalizedAssumptions);
  const validation = assumptionsValidationStatus(
    options?.assumptionSignOff ?? null,
    normalizedAssumptions
  );
  const holeName = options?.holeName ?? "DDH-0247";
  const siteName = options?.siteName?.trim() ?? "";
  const generatedAt = new Date();
  const dateLabel = generatedAt.toLocaleDateString("en-AU", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeLabel = generatedAt.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const recentHistory = (options?.history ?? []).slice(-8).reverse().map((entry) => ({
    time: new Date(entry.timestamp).toLocaleString("en-AU", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    summary: entry.summary,
    action: entry.actionTaken,
  }));

  return {
    reportType: "Shift Handover",
    appVersion: PDF_APP_VERSION,
    holeName,
    siteName,
    testScenarioName: options?.testScenarioName?.trim() || null,
    generatedAt,
    trajectoryImagePng: options?.trajectoryImagePng ?? null,
    logoImagePng: options?.logoImagePng ?? null,
    dateLabel,
    timeLabel,
    status: reco.classification.label,
    confidence: reco.classification.confidence,
    statusClassName: reco.classification.className,
    currentMd: `${round(reco.current.md, 1)} m`,
    actualDipAzi: `${round(reco.current.dip, 2)}° / ${round(reco.current.azimuth, 2)}°`,
    planOffset: `${round(reco.planOffset, 2)} m`,
    projectedMiss: `${round(reco.miss, 2)} m`,
    missVector: `E ${signed(reco.missVector.e, 2)} | N ${signed(reco.missVector.n, 2)} | D ${signed(reco.missVector.d, 2)} m`,
    aimDip: `${round(reco.aimDip, 2)}°`,
    aimAzimuth: `${round(reco.aimAzimuth, 2)}°`,
    dipCorrection: dipInstruction(reco.dipChange),
    aziCorrection: azimuthInstruction(reco.aziChange),
    dlsRequired: Number.isFinite(reco.dlsRequired)
      ? `${round(reco.dlsRequired, 2)}° / 30 m`
      : "—",
    dlsLimit: `${round(reco.maxDls, 2)}° / 30 m`,
    targetMd: `${round(reco.target.md, 1)} m`,
    targetEnu: `E ${round(reco.target.e, 2)} | N ${round(reco.target.n, 2)} | D ${round(reco.target.d, 2)} m`,
    tolerance: `${round(reco.tolerance, 1)} m`,
    nextInterval: `${round(reco.target.nextInterval, 0)} m`,
    nextIntervalAimNote: NEXT_INTERVAL_AIM_STATION_NOTE,
    nextIntervalAimExplainer: nextIntervalAimExplainer(reco.target.nextInterval),
    recoveryLoopNotes: recoveryLoopNotes(reco),
    feasibilityEscalationNote: feasibilityEscalationNote(reco, steering),
    drillerGuidance: actionSentence(reco),
    correctionOptions: buildCorrectionOptions(reco),
    qaFlags: buildQaFlags(reco, actualStations, options?.corridorStatus),
    recentHistory,
    recoveryGuidance: steering
      ? {
          currentAction: steering.simple.currentAction,
          bestMethod: steering.simple.bestMethod,
          nextAim: steering.simple.nextAim,
          confidence: steering.simple.confidence,
          escalation: steering.simple.escalation,
          pointOfNoReturn: steering.pointOfNoReturnMd
            ? `${round(steering.pointOfNoReturnMd, 0)} m (estimate)`
            : "Not estimated in remaining hole",
          methodSummary: steering.methods
            .filter((m) => m.feasible)
            .map((m) => m.label)
            .join(", ") || "None within assumed limits",
        }
      : null,
    recoveryAssumptionsSummary,
    validationStatus: validation.label,
    validationDetail: validation.detail,
    conventions: COORDINATE_CONVENTIONS.map((c) => `${c.label}: ${c.value}`),
    disclaimer: HANDOVER_DISCLAIMER,
    surveyToolSummary: options?.surveyToolProfile
      ? formatSurveyProfileSummary(options.surveyToolProfile)
      : [],
    surveyUncertaintyNote: options?.surveyAssessment?.recommendationNote ?? null,
    planCorridorSummary: options?.corridorStatus?.detailPhrase ?? null,
  };
}

export function handoverFilename(
  holeName: string,
  md: number,
  extension: "txt" | "pdf"
): string {
  const safeHole = holeName.replace(/[^\w.-]+/g, "_");
  return `targetlock-handover-${safeHole}-md-${round(md, 0)}.${extension}`;
}
