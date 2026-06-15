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
import { buildRc2ReportContext, type Rc2ReportContext } from "./rc2-report";
import type { PlannerExecutionReportContext } from "./execution-bridge";
import type { HoleModeAssessment } from "./hole-mode";
import {
  normalizeReferenceSystem,
  type ReferenceSystemConfig,
  type ReferenceWarning,
} from "./reference-system";
import { baseRecoveryConfidence } from "./steering-feasibility";
import {
  formatSurveyProfileSummary,
  type SurveyToolProfile,
  type SurveyUncertaintyAssessment,
} from "./survey-tool-profile";
import {
  formatToolErrorModelSummary,
  uncertaintyAtMd,
  type HoleUncertainty,
  type TargetUncertaintyAssessment,
} from "./uncertainty";
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
  referenceSystem?: ReferenceSystemConfig | null;
  referenceWarnings?: ReferenceWarning[];
  holeModeAssessment?: HoleModeAssessment | null;
  plannerExecution?: PlannerExecutionReportContext | null;
  holeUncertainty?: HoleUncertainty | null;
  targetUncertainty?: TargetUncertaintyAssessment | null;
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
  positionUncertaintyLines: string[];
  planCorridorSummary: string | null;
  rc2Context: Rc2ReportContext;
  plannerExecution: PlannerExecutionReportContext | null;
  plannerExecutionLines: string[];
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

  const rc2Context = buildRc2ReportContext({
    referenceSystem: normalizeReferenceSystem(options?.referenceSystem),
    referenceWarnings: options?.referenceWarnings ?? [],
    holeModeAssessment: options?.holeModeAssessment ?? null,
    classificationConfidence: reco.classification.confidence,
    recoveryConfidence: steering?.simple.confidence ?? null,
    baseRecoveryConfidence: baseRecoveryConfidence(reco),
  });

  const positionUncertaintyLines: string[] = [];
  const holeUncertainty = options?.holeUncertainty ?? null;
  if (holeUncertainty && holeUncertainty.stations.length) {
    positionUncertaintyLines.push(
      `Model: ${formatToolErrorModelSummary(holeUncertainty.model)} (${holeUncertainty.sigmaFactor}-sigma, ISCWSA-inspired simplified)`
    );
    const atCurrent = uncertaintyAtMd(holeUncertainty, reco.current.md);
    if (atCurrent) {
      positionUncertaintyLines.push(
        `At current MD ${round(reco.current.md, 0)} m: ±${round(atCurrent.radiusM, 1)} m position radius (lateral ±${round(atCurrent.semiLateralM, 1)} m, highside ±${round(atCurrent.semiHighsideM, 1)} m, along ±${round(atCurrent.semiAlongM, 1)} m)`
      );
    }
    const targetUncertainty = options?.targetUncertainty ?? null;
    if (targetUncertainty) {
      positionUncertaintyLines.push(
        `At target MD ${round(reco.target.md, 0)} m: ±${round(targetUncertainty.radiusAtTargetM, 1)} m lateral uncertainty — ${targetUncertainty.note}`
      );
    }
  }

  const plannerExecution = options?.plannerExecution ?? null;
  const plannerExecutionLines: string[] = [];
  if (plannerExecution) {
    const pad = (label: string, value: string) => `${label.padEnd(28)}${value}`;
    plannerExecutionLines.push(
      pad("Plan revision:", `R${plannerExecution.planRevision}`),
      pad(
        "Approval:",
        plannerExecution.approvedBy && plannerExecution.approvedAt
          ? `${plannerExecution.approvedBy}, ${new Date(plannerExecution.approvedAt).toLocaleDateString("en-AU")} (${plannerExecution.approvalState})`
          : plannerExecution.approvalLabel
      ),
      ...(plannerExecution.lockedPlanHash
        ? [pad("Locked plan hash:", plannerExecution.lockedPlanHash)]
        : []),
      pad(
        "QA at lock:",
        `${plannerExecution.qaHardErrorCount} error(s), ${plannerExecution.qaWarningCount} warning(s)`
      ),
      ...(plannerExecution.actualVsPlanStatus
        ? [
            pad(
              "Actual vs locked plan:",
              `${plannerExecution.actualVsPlanStatus}${
                plannerExecution.actualVsPlanOffset != null
                  ? ` (offset ${round(plannerExecution.actualVsPlanOffset, 2)} m)`
                  : ""
              }`
            ),
          ]
        : []),
      ...(plannerExecution.actualVsPlanProgressPct != null
        ? [
            pad(
              "Drilling progress:",
              `${plannerExecution.actualVsPlanProgressPct}% of locked planned TD`
            ),
          ]
        : []),
      ...(plannerExecution.planChangedWarning
        ? [`  WARNING: ${plannerExecution.planChangedWarning}`]
        : []),
      ...(plannerExecution.drilledPastPlanWarning
        ? [`  WARNING: ${plannerExecution.drilledPastPlanWarning}`]
        : []),
      ...(plannerExecution.actualVsPlanWarnings ?? [])
        .filter(
          (w) =>
            w !== plannerExecution.planChangedWarning &&
            w !== plannerExecution.drilledPastPlanWarning
        )
        .map((w) => `  NOTE: ${w}`),
      ...(plannerExecution.staleApprovalWarning
        ? [`  WARNING: ${plannerExecution.staleApprovalWarning}`]
        : []),
      pad("Execution state:", plannerExecution.executionState),
      ...(plannerExecution.finalActualMd != null
        ? [pad("Final actual MD:", `${round(plannerExecution.finalActualMd, 1)} m`)]
        : []),
      ...(plannerExecution.completionSnapshot
        ? [
            pad(
              "Completed:",
              `${new Date(plannerExecution.completionSnapshot.completedAt).toLocaleString("en-AU")}${
                plannerExecution.completionSnapshot.completedBy
                  ? ` by ${plannerExecution.completionSnapshot.completedBy}`
                  : ""
              }`
            ),
            ...(plannerExecution.completionSnapshot.finalTrackingStatus
              ? [
                  pad(
                    "Final tracking:",
                    plannerExecution.completionSnapshot.finalTrackingStatus
                  ),
                ]
              : []),
          ]
        : []),
      ...(plannerExecution.revisionLineage
        ? [pad("Revision lineage:", plannerExecution.revisionLineage)]
        : [])
    );
  }

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
    positionUncertaintyLines,
    planCorridorSummary: options?.corridorStatus?.detailPhrase ?? null,
    rc2Context,
    plannerExecution,
    plannerExecutionLines,
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
