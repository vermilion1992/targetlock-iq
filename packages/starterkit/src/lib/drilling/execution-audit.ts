import { buildActualVsLockedPlanReport } from "./actual-vs-plan";
import { buildPlannerExecutionContext } from "./execution-bridge";
import type { DecisionHistoryEntry, DecisionHistoryType } from "./history";
import type { HoleLibrary } from "./hole-library";
import {
  resolvePlanLockStatusWithApproval,
  truncatePlanHash,
} from "./plan-lock";
import { resolvePlannerApprovalStatus } from "./planner-approval";
import {
  buildPlanRevisionLineage,
  formatRevisionLineageSummary,
} from "./plan-revision";
import { isPlannerCreatedHole, plannerStatus } from "./planner-status";
import type { PlanLockStatusState } from "./planner-types";
import type { SavedHoleProject } from "./storage";

export type ExecutionAuditEventKind =
  | "plan_approved"
  | "plan_locked"
  | "actual_survey_added"
  | "actual_survey_replaced"
  | "actual_survey_removed"
  | "recommendation_snapshot"
  | "supervisor_decision"
  | "report_exported"
  | "completion"
  | "revision_created";

export type ExecutionAuditEventSource = "history" | "derived";

export type ExecutionAuditEvent = {
  id: string;
  timestamp: string;
  kind: ExecutionAuditEventKind;
  summary: string;
  detail?: string;
  source: ExecutionAuditEventSource;
};

export type ExecutionAuditReport = {
  holeId: string;
  holeName: string;
  programName?: string;
  planRevision?: number;
  status: string;
  lockedPlanHash?: string;
  approvalHash?: string;
  approvedBy?: string;
  approvedAt?: string;
  lockStatus: PlanLockStatusState;
  executionState: string;
  latestActualMd: number | null;
  actualSurveyCount: number;
  latestTrackingStatus?: string;
  finalTrackingStatus?: string;
  completedAt?: string;
  completedBy?: string;
  revisionLineage?: string;
  events: ExecutionAuditEvent[];
  warnings: string[];
};

const HISTORY_KIND_MAP: Partial<
  Record<DecisionHistoryType, ExecutionAuditEventKind>
> = {
  survey_added: "actual_survey_added",
  survey_replaced: "actual_survey_replaced",
  survey_removed: "actual_survey_removed",
  recommendation_snapshot: "recommendation_snapshot",
  supervisor_decision: "supervisor_decision",
  report_exported: "report_exported",
};

function mapHistoryEntry(entry: DecisionHistoryEntry): ExecutionAuditEvent {
  let kind: ExecutionAuditEventKind =
    HISTORY_KIND_MAP[entry.type] ?? "supervisor_decision";
  if (
    entry.type === "supervisor_decision" &&
    /plan completed/i.test(entry.summary)
  ) {
    kind = "completion";
  }
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    kind,
    summary: entry.summary,
    detail: entry.detail,
    source: "history",
  };
}

function derivedApprovalEvent(hole: SavedHoleProject): ExecutionAuditEvent | null {
  const snap = hole.plannerMeta?.approvalSnapshot;
  if (!snap) return null;
  return {
    id: `derived-approval-${snap.approvedAt}`,
    timestamp: snap.approvedAt,
    kind: "plan_approved",
    summary: `Plan approved by ${snap.approvedBy}`,
    detail: `Plan hash ${truncatePlanHash(snap.planHash, 12)}`,
    source: "derived",
  };
}

function derivedLockEvent(hole: SavedHoleProject): ExecutionAuditEvent | null {
  const locked = hole.plannerMeta?.lockedPlan;
  if (!locked) return null;
  return {
    id: `derived-lock-${locked.lockedAt}`,
    timestamp: locked.lockedAt,
    kind: "plan_locked",
    summary: "Plan locked for execution",
    detail: `Locked plan hash ${truncatePlanHash(locked.planHash, 12)}`,
    source: "derived",
  };
}

function derivedCompletionEvent(
  hole: SavedHoleProject
): ExecutionAuditEvent | null {
  const snap = hole.plannerMeta?.completionSnapshot;
  if (!snap) return null;
  return {
    id: `derived-completion-${snap.completedAt}`,
    timestamp: snap.completedAt,
    kind: "completion",
    summary: "Hole execution completed",
    detail: snap.reportSummary,
    source: "derived",
  };
}

function derivedRevisionEvent(
  hole: SavedHoleProject
): ExecutionAuditEvent | null {
  const nextId = hole.plannerMeta?.nextRevisionHoleId;
  const revisedAt = hole.plannerMeta?.executionStatus?.revisedAt;
  if (!nextId && hole.plannerMeta?.executionStatus?.state !== "revised") {
    return null;
  }
  const timestamp =
    revisedAt ??
    hole.plannerMeta?.executionStatus?.completedAt ??
    hole.updatedAt;
  return {
    id: `derived-revision-${nextId ?? hole.holeId}`,
    timestamp,
    kind: "revision_created",
    summary: nextId
      ? `Revision created (${nextId})`
      : "Plan superseded by revision",
    detail: hole.plannerMeta?.revisionReason,
    source: "derived",
  };
}

function sortEventsChronologically(
  events: ExecutionAuditEvent[]
): ExecutionAuditEvent[] {
  return [...events].sort((a, b) => {
    const ta = Date.parse(a.timestamp);
    const tb = Date.parse(b.timestamp);
    if (ta !== tb) return ta - tb;
    if (a.source !== b.source) return a.source === "derived" ? 1 : -1;
    return a.id.localeCompare(b.id);
  });
}

export function isExecutionAuditSupported(hole: SavedHoleProject): boolean {
  if (!isPlannerCreatedHole(hole) || !hole.plannerMeta) return false;
  const status = plannerStatus(hole);
  if (status !== "active" && status !== "completed") return false;
  return !!hole.plannerMeta.lockedPlan;
}

export function buildExecutionAuditReport(
  hole: SavedHoleProject,
  library: HoleLibrary
): ExecutionAuditReport | null {
  if (!isExecutionAuditSupported(hole)) return null;

  const ctx = buildPlannerExecutionContext(hole, library);
  if (!ctx) return null;

  const lockResolved = resolvePlanLockStatusWithApproval(hole, library);
  const approval = resolvePlannerApprovalStatus(hole, library);
  const avp = buildActualVsLockedPlanReport(hole, { library });
  const locked = hole.plannerMeta!.lockedPlan!;
  const completion = hole.plannerMeta?.completionSnapshot;

  const warnings: string[] = [...avp.warnings];
  if (ctx.planDrifted) {
    warnings.push("Live plan differs from locked execution snapshot.");
  }
  if (approval.state === "stale") {
    warnings.push("Approval snapshot is stale.");
  }

  const historyEvents = (hole.history ?? []).map(mapHistoryEntry);
  const derived = [
    derivedApprovalEvent(hole),
    derivedLockEvent(hole),
    derivedCompletionEvent(hole),
    derivedRevisionEvent(hole),
  ].filter((e): e is ExecutionAuditEvent => e !== null);

  const events = sortEventsChronologically([...historyEvents, ...derived]);

  const latestTracking =
    avp.status !== "no-locked-plan" && avp.status !== "not-started"
      ? avp.status
      : undefined;

  return {
    holeId: hole.holeId,
    holeName: hole.holeName,
    programName: hole.plannerMeta?.programName ?? hole.siteName,
    planRevision: hole.plannerMeta?.planRevision,
    status: ctx.status,
    lockedPlanHash: locked.planHash,
    approvalHash:
      locked.approvalHash ?? hole.plannerMeta?.approvalSnapshot?.planHash,
    approvedBy: ctx.approvedBy,
    approvedAt: ctx.approvedAt,
    lockStatus: lockResolved.state,
    executionState: ctx.executionState,
    latestActualMd: avp.latestActualMd,
    actualSurveyCount: hole.actualRecords.length,
    latestTrackingStatus: latestTracking,
    finalTrackingStatus: completion?.finalTrackingStatus,
    completedAt: completion?.completedAt ?? ctx.executionState === "completed"
      ? hole.plannerMeta?.executionStatus?.completedAt
      : undefined,
    completedBy:
      completion?.completedBy ?? hole.plannerMeta?.executionStatus?.completedBy,
    revisionLineage: formatRevisionLineageSummary(library, hole.holeId),
    events,
    warnings: [...new Set(warnings)],
  };
}

export function buildExecutionAuditWarnings(
  hole: SavedHoleProject,
  library: HoleLibrary
): string[] {
  const report = buildExecutionAuditReport(hole, library);
  return report?.warnings ?? [];
}

export function executionAuditEventKinds(
  report: ExecutionAuditReport
): ExecutionAuditEventKind[] {
  return report.events.map((e) => e.kind);
}

export function revisionLineageInAudit(
  report: ExecutionAuditReport
): string | undefined {
  return report.revisionLineage;
}

export { buildPlanRevisionLineage };
