import {
  buildStations,
  planOffsetAtMd,
  positionOnPlanAtMd,
} from "./desurvey";
import { shortestAngle } from "./geometry";
import type { HoleLibrary } from "./hole-library";
import { hasPlanChangedSinceLock, lockedPlanRecords } from "./plan-lock";
import { resolvePlannerApprovalStatus } from "./planner-approval";
import { buildCorridorStatus, type PlanCorridorConfig } from "./plan-corridor";
import { buildQaFlags } from "./qa";
import type { SavedHoleProject } from "./storage";
import type {
  Recommendation,
  SurveyRecord,
  SurveyStation,
  TargetConfig,
} from "./types";

export type ActualVsLockedPlanStatus =
  | "no-locked-plan"
  | "not-started"
  | "on-plan"
  | "watch"
  | "off-plan"
  | "review-plan";

export type ActualVsLockedPlanSeverity = "ok" | "watch" | "risk";

export type ActualVsLockedPlanReport = {
  hasLockedPlan: boolean;
  hasActuals: boolean;
  plannedTd: number | null;
  latestActualMd: number | null;
  progressPct: number | null;
  latestPlanOffsetM: number | null;
  latestActualDls: number | null;
  latestPlannedDls: number | null;
  latestDipDeltaDeg: number | null;
  latestAzimuthDeltaDeg: number | null;
  drilledPastPlan: boolean;
  status: ActualVsLockedPlanStatus;
  severity: ActualVsLockedPlanSeverity;
  summary: string;
  warnings: string[];
};

export type ActualVsPlannedStatus = Exclude<
  ActualVsLockedPlanStatus,
  "no-locked-plan" | "not-started"
>;

export type DeviationTrend = "improving" | "stable" | "worsening";

export type ActualVsPlannedResult = ActualVsLockedPlanReport & {
  deviationTrend: DeviationTrend;
  actualSurveyCount: number;
  /** @deprecated use latestPlanOffsetM */
  latestOffset: number | null;
  /** @deprecated use latestActualDls */
  latestDls: number | null;
  /** @deprecated use latestActualDls - latestPlannedDls */
  latestDlsDelta: number | null;
  /** @deprecated use progressPct */
  surveyProgressPct: number;
  /** @deprecated use latestActualMd */
  drilledMd: number | null;
};

export type BuildActualVsLockedPlanReportOpts = {
  library?: HoleLibrary;
  includeLockReview?: boolean;
};

const PAST_PLAN_TOL_M = 1;

function plannedTdFromRecords(records: SurveyRecord[]): number | null {
  if (!records.length) return null;
  return records[records.length - 1]!.md;
}

function hasMeaningfulActuals(actualRecords: SurveyRecord[]): boolean {
  return actualRecords.length > 1;
}

function emptyReport(
  status: ActualVsLockedPlanStatus,
  summary: string,
  severity: ActualVsLockedPlanSeverity = "ok"
): ActualVsLockedPlanReport {
  return {
    hasLockedPlan: status !== "no-locked-plan",
    hasActuals: false,
    plannedTd: null,
    latestActualMd: null,
    progressPct: null,
    latestPlanOffsetM: null,
    latestActualDls: null,
    latestPlannedDls: null,
    latestDipDeltaDeg: null,
    latestAzimuthDeltaDeg: null,
    drilledPastPlan: false,
    status,
    severity,
    summary,
    warnings: [],
  };
}

function resolveThresholds(target: TargetConfig) {
  const tolerance = target.tolerance ?? 6;
  const maxDls = target.maxDls ?? 3;
  return {
    tolerance,
    maxDls,
    warningOffset: Math.max(tolerance, 3),
    riskOffset: Math.max(tolerance * 1.5, 6),
    dlsWarning: maxDls * 0.75,
    dlsRisk: maxDls,
  };
}

function severityForStatus(status: ActualVsLockedPlanStatus): ActualVsLockedPlanSeverity {
  if (status === "off-plan" || status === "review-plan") return "risk";
  if (status === "watch") return "watch";
  return "ok";
}

function offsetTrend(
  actualStations: SurveyStation[],
  planRecords: SurveyRecord[]
): DeviationTrend {
  if (actualStations.length < 2) return "stable";
  const last = actualStations[actualStations.length - 1]!;
  const prev = actualStations[actualStations.length - 2]!;
  const lastOff = planOffsetAtMd(last, planRecords);
  const prevOff = planOffsetAtMd(prev, planRecords);
  if (lastOff === null || prevOff === null) return "stable";
  const delta = lastOff - prevOff;
  if (Math.abs(delta) < 0.2) return "stable";
  return delta < 0 ? "improving" : "worsening";
}

function classifyTrackingStatus(
  offset: number | null,
  actualDls: number | null,
  thresholds: ReturnType<typeof resolveThresholds>,
  drilledPastPlan: boolean,
  lockReviewRequired: boolean
): ActualVsLockedPlanStatus {
  if (lockReviewRequired || drilledPastPlan) return "review-plan";
  if (
    (offset !== null && offset >= thresholds.riskOffset) ||
    (actualDls !== null && actualDls >= thresholds.dlsRisk)
  ) {
    return "off-plan";
  }
  if (
    (offset !== null && offset >= thresholds.warningOffset) ||
    (actualDls !== null && actualDls >= thresholds.dlsWarning)
  ) {
    return "watch";
  }
  return "on-plan";
}

function buildSummary(
  status: ActualVsLockedPlanStatus,
  offset: number | null,
  progressPct: number | null
): string {
  switch (status) {
    case "no-locked-plan":
      return "No locked planner snapshot — activate from Planner to track against an approved plan.";
    case "not-started":
      return "Locked plan is active; waiting for the first actual survey beyond collar.";
    case "on-plan":
      return offset !== null
        ? `Tracking the locked plan (${offset.toFixed(1)} m offset).`
        : "Tracking the locked plan.";
    case "watch":
      return offset !== null
        ? `Deviation from locked plan is elevated (${offset.toFixed(1)} m) — monitor the next interval.`
        : "Deviation from locked plan is elevated — monitor the next interval.";
    case "off-plan":
      return offset !== null
        ? `Actual path is outside locked plan tolerance (${offset.toFixed(1)} m offset).`
        : "Actual path is outside locked plan tolerance.";
    case "review-plan":
      return progressPct !== null && progressPct >= 100
        ? "Drilled past planned TD or plan lock needs review."
        : "Locked plan changed or approval is stale — review before continuing.";
    default:
      return "Actual vs locked plan tracking.";
  }
}

export function buildActualVsLockedPlanReport(
  hole: SavedHoleProject,
  opts: BuildActualVsLockedPlanReportOpts = {}
): ActualVsLockedPlanReport {
  const locked = hole.plannerMeta?.lockedPlan;
  if (!locked) {
    return emptyReport(
      "no-locked-plan",
      "No locked planner snapshot on this hole."
    );
  }

  const planRecords = locked.planRecords;
  const lockedTarget = locked.target;
  const actualRecords = hole.actualRecords;
  const plannedTd = plannedTdFromRecords(planRecords);
  const thresholds = resolveThresholds(lockedTarget);

  if (!hasMeaningfulActuals(actualRecords)) {
    return {
      ...emptyReport(
        "not-started",
        "Locked plan is active; no actual surveys beyond collar yet."
      ),
      hasLockedPlan: true,
      hasActuals: false,
      plannedTd,
      progressPct: 0,
    };
  }

  const actualStations = buildStations(actualRecords);
  const latestStation = actualStations[actualStations.length - 1]!;
  const latestActualMd = latestStation.md;
  const latestPlanOffsetM = planOffsetAtMd(latestStation, planRecords);
  const planAtMd = positionOnPlanAtMd(planRecords, latestActualMd);

  const latestActualDls = latestStation.dls;
  const latestPlannedDls = planAtMd?.dls ?? null;
  const latestDipDeltaDeg =
    planAtMd !== null ? latestStation.dip - planAtMd.dip : null;
  const latestAzimuthDeltaDeg =
    planAtMd !== null
      ? shortestAngle(planAtMd.azimuth, latestStation.azimuth)
      : null;

  const progressPct =
    plannedTd && plannedTd > 0
      ? Math.min(100, Math.round((latestActualMd / plannedTd) * 100))
      : null;

  const drilledPastPlan =
    plannedTd !== null && latestActualMd > plannedTd + PAST_PLAN_TOL_M;

  let lockReviewRequired = false;
  if (opts.includeLockReview !== false) {
    lockReviewRequired = hasPlanChangedSinceLock(hole);
    if (opts.library && hole.plannerMeta) {
      const approval = resolvePlannerApprovalStatus(hole, opts.library);
      if (approval.state === "stale") lockReviewRequired = true;
    }
  }

  const warnings: string[] = [];
  if (drilledPastPlan && plannedTd !== null) {
    warnings.push(
      `Latest actual MD (${latestActualMd.toFixed(0)} m) is beyond planned TD (${plannedTd.toFixed(0)} m).`
    );
  }
  if (hasPlanChangedSinceLock(hole)) {
    warnings.push(
      "Current plan differs from the locked execution snapshot — create a revision in Planner."
    );
  }
  if (opts.library && hole.plannerMeta) {
    const approval = resolvePlannerApprovalStatus(hole, opts.library);
    if (approval.state === "stale") {
      warnings.push("Approval snapshot is stale — review plan in Planner.");
    }
  }
  if (
    latestPlanOffsetM !== null &&
    latestPlanOffsetM >= thresholds.warningOffset
  ) {
    warnings.push(
      `Offset from locked plan: ${latestPlanOffsetM.toFixed(2)} m (warning ≥ ${thresholds.warningOffset} m).`
    );
  }
  if (latestActualDls !== null && latestActualDls >= thresholds.dlsWarning) {
    warnings.push(
      `Latest actual DLS ${latestActualDls.toFixed(2)}°/30m exceeds watch threshold (${thresholds.dlsWarning.toFixed(2)}°/30m).`
    );
  }

  const status = classifyTrackingStatus(
    latestPlanOffsetM,
    latestActualDls,
    thresholds,
    drilledPastPlan,
    lockReviewRequired
  );
  const severity = severityForStatus(status);
  const summary = buildSummary(status, latestPlanOffsetM, progressPct);

  return {
    hasLockedPlan: true,
    hasActuals: true,
    plannedTd,
    latestActualMd,
    progressPct,
    latestPlanOffsetM,
    latestActualDls,
    latestPlannedDls,
    latestDipDeltaDeg,
    latestAzimuthDeltaDeg,
    drilledPastPlan,
    status,
    severity,
    summary,
    warnings,
  };
}

function escalateStatus(
  base: ActualVsLockedPlanStatus,
  escalated: ActualVsPlannedStatus
): ActualVsPlannedStatus {
  const order: ActualVsLockedPlanStatus[] = [
    "on-plan",
    "watch",
    "off-plan",
    "review-plan",
  ];
  const baseIdx = order.indexOf(base as ActualVsPlannedStatus);
  const escIdx = order.indexOf(escalated);
  if (baseIdx < 0) return escalated;
  return order[Math.max(baseIdx, escIdx)] as ActualVsPlannedStatus;
}

export function buildActualVsPlanned(
  hole: SavedHoleProject,
  actualRecords: SurveyRecord[],
  planCorridor: PlanCorridorConfig | null | undefined,
  reco: Recommendation | null,
  library?: HoleLibrary
): ActualVsPlannedResult {
  const holeWithActuals = { ...hole, actualRecords };
  const core = buildActualVsLockedPlanReport(holeWithActuals, { library });

  if (core.status === "no-locked-plan" || core.status === "not-started") {
    return {
      ...core,
      deviationTrend: "stable",
      actualSurveyCount: actualRecords.length,
      latestOffset: core.latestPlanOffsetM,
      latestDls: core.latestActualDls,
      latestDlsDelta:
        core.latestActualDls !== null && core.latestPlannedDls !== null
          ? core.latestActualDls - core.latestPlannedDls
          : null,
      surveyProgressPct: core.progressPct ?? 0,
      drilledMd: core.latestActualMd,
    };
  }

  const planRecords = lockedPlanRecords(hole);
  const planStations = buildStations(planRecords);
  const actualStations = buildStations(actualRecords);

  const corridorStatus = buildCorridorStatus(
    planStations,
    actualStations,
    planCorridor,
    reco
  );
  const corridorBreached =
    corridorStatus?.outsidePlannedCorridor === true ||
    corridorStatus?.latestIntervalInside === false;

  const qaFlags = reco ? buildQaFlags(reco, actualStations, corridorStatus) : [];
  const hasQaOffPlan = qaFlags.some(
    (f) => f.level === "risk" || f.level === "watch"
  );

  let status = core.status as ActualVsPlannedStatus;
  if (corridorBreached || hasQaOffPlan) {
    status = escalateStatus(status, hasQaOffPlan ? "watch" : "off-plan");
    if (corridorBreached) status = escalateStatus(status, "off-plan");
  }

  const severity = severityForStatus(status);
  const warnings = [...core.warnings];
  if (corridorBreached) {
    warnings.push("Latest survey interval is outside the planned corridor.");
  }

  const latestDlsDelta =
    core.latestActualDls !== null && core.latestPlannedDls !== null
      ? core.latestActualDls - core.latestPlannedDls
      : null;

  return {
    ...core,
    status,
    severity,
    summary: buildSummary(status, core.latestPlanOffsetM, core.progressPct),
    warnings,
    deviationTrend: offsetTrend(actualStations, planRecords),
    actualSurveyCount: actualRecords.length,
    latestOffset: core.latestPlanOffsetM,
    latestDls: core.latestActualDls,
    latestDlsDelta,
    surveyProgressPct: core.progressPct ?? 0,
    drilledMd: core.latestActualMd,
  };
}
