import { findHole, type HoleLibrary } from "./hole-library";
import { round } from "./format";
import { truncatePlanHash } from "./plan-lock";
import { resolvePlannerApprovalStatus } from "./planner-approval";
import {
  buildExecutionAuditReport,
  isExecutionAuditSupported,
  type ExecutionAuditEvent,
} from "./execution-audit";
import { buildActualVsLockedPlanReport } from "./actual-vs-plan";
import { formatRevisionLineageSummary } from "./plan-revision";
import { plannerStatus } from "./planner-status";
import type { SavedHoleProject } from "./storage";

export const EXECUTION_EVIDENCE_DISCLAIMER =
  "Execution evidence generated from local TargetLock data. Verify against official survey database and site records.";

export type ExecutionReportData = {
  holeId: string;
  holeName: string;
  programName: string;
  siteName: string;
  status: string;
  planRevision: string;
  dateLabel: string;
  timeLabel: string;
  lockStatusLabel: string;
  lockDetail: string;
  lockedPlanHash?: string;
  lockedAt?: string;
  approvalLabel: string;
  approvalDetail: string;
  approvedBy?: string;
  approvedAt?: string;
  executionState: string;
  actualSurveyCount: number;
  latestActualMd: string;
  latestTrackingStatus: string;
  finalTrackingStatus?: string;
  actualVsPlanSummary: string;
  actualVsPlanWarnings: string[];
  completionSummary: string[];
  decisionHistorySummary: string[];
  revisionLineage?: string;
  auditEventCount: number;
  events: ExecutionAuditEvent[];
  warnings: string[];
  disclaimer: string;
};

function formatTrackingStatus(status: string): string {
  if (status === "on-plan") return "On plan";
  if (status === "off-plan") return "Off plan";
  if (status === "watch") return "Watch";
  if (status === "review-plan") return "Review plan";
  if (status === "not-started") return "Not started";
  return status;
}

export function executionReportFilename(
  holeName: string,
  ext: "txt" | "pdf"
): string {
  const slug = holeName.replace(/[^\w.-]+/g, "-").toLowerCase();
  return `${slug}-execution-evidence.${ext}`;
}

export function buildExecutionReportData(
  hole: SavedHoleProject,
  library: HoleLibrary
): ExecutionReportData | null {
  if (!isExecutionAuditSupported(hole)) return null;

  const audit = buildExecutionAuditReport(hole, library);
  if (!audit) return null;

  const approval = resolvePlannerApprovalStatus(hole, library);
  const avp = buildActualVsLockedPlanReport(hole, { library });
  const now = new Date();
  const locked = hole.plannerMeta!.lockedPlan!;
  const completion = hole.plannerMeta?.completionSnapshot;

  const decisionHistorySummary = audit.events
    .filter((e) =>
      [
        "supervisor_decision",
        "recommendation_snapshot",
        "report_exported",
        "completion",
      ].includes(e.kind)
    )
    .slice(-12)
    .map((e) => `${e.timestamp.slice(0, 16).replace("T", " ")} — ${e.summary}`);

  const completionSummary: string[] = [];
  if (completion) {
    completionSummary.push(
      `Completed at: ${completion.completedAt}`,
      completion.completedBy
        ? `Completed by: ${completion.completedBy}`
        : "Completed by: (not recorded)",
      completion.finalActualMd !== null
        ? `Final actual MD: ${round(completion.finalActualMd, 0)} m`
        : "Final actual MD: —",
      completion.finalPlanOffsetM !== null
        ? `Final plan offset: ${round(completion.finalPlanOffsetM, 2)} m`
        : "Final plan offset: —",
      completion.finalTrackingStatus
        ? `Final tracking: ${formatTrackingStatus(completion.finalTrackingStatus)}`
        : "Final tracking: —",
      completion.reportSummary
        ? `Summary: ${completion.reportSummary}`
        : ""
    );
  }

  return {
    holeId: hole.holeId,
    holeName: hole.holeName,
    programName: hole.plannerMeta?.programName ?? "—",
    siteName: hole.siteName ?? "—",
    status: plannerStatus(hole),
    planRevision: `R${hole.plannerMeta?.planRevision ?? 1}`,
    dateLabel: now.toLocaleDateString("en-AU"),
    timeLabel: now.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    lockStatusLabel: audit.lockStatus,
    lockDetail: `Locked ${locked.lockedAt.slice(0, 10)}`,
    lockedPlanHash: truncatePlanHash(locked.planHash, 16),
    lockedAt: locked.lockedAt,
    approvalLabel: approval.label,
    approvalDetail: approval.detail,
    approvedBy: audit.approvedBy,
    approvedAt: audit.approvedAt,
    executionState: audit.executionState,
    actualSurveyCount: audit.actualSurveyCount,
    latestActualMd:
      audit.latestActualMd !== null
        ? `${round(audit.latestActualMd, 0)} m`
        : "—",
    latestTrackingStatus: formatTrackingStatus(
      audit.latestTrackingStatus ?? avp.status
    ),
    finalTrackingStatus: audit.finalTrackingStatus
      ? formatTrackingStatus(audit.finalTrackingStatus)
      : undefined,
    actualVsPlanSummary: avp.summary,
    actualVsPlanWarnings: avp.warnings,
    completionSummary: completionSummary.filter(Boolean),
    decisionHistorySummary,
    revisionLineage:
      audit.revisionLineage ??
      formatRevisionLineageSummary(library, hole.holeId),
    auditEventCount: audit.events.length,
    events: audit.events,
    warnings: audit.warnings,
    disclaimer: EXECUTION_EVIDENCE_DISCLAIMER,
  };
}

export function buildExecutionReportDataForHole(
  library: HoleLibrary,
  holeId: string
): ExecutionReportData | null {
  const hole = findHole(library, holeId);
  if (!hole) return null;
  return buildExecutionReportData(hole, library);
}
