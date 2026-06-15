import type { ActualVsLockedPlanReport } from "./actual-vs-plan";
import { buildActualVsLockedPlanReport } from "./actual-vs-plan";
import { surveysToCsv } from "./csv";
import {
  buildExecutionAuditReport,
  isExecutionAuditSupported,
  type ExecutionAuditEvent,
} from "./execution-audit";
import type { HoleLibrary } from "./hole-library";
import { lockedPlanRecords } from "./plan-lock";
import {
  resolvePlannerApprovalStatus,
  type PlannerApprovalSnapshot,
} from "./planner-approval";
import { plannerStatus } from "./planner-status";
import type { PlannerCompletionSnapshot } from "./planner-types";
import type { SavedHoleProject } from "./storage";

export const EXECUTION_MANIFEST_FORMAT = "targetlock-execution-manifest-v1";

export type ExecutionPackageSupport =
  | { supported: true }
  | { supported: false; reason: string };

export type ExecutionManifest = {
  format: typeof EXECUTION_MANIFEST_FORMAT;
  generatedAt: string;
  holeId: string;
  holeName: string;
  programName?: string;
  plannerStatus: string;
  planRevision?: number;
  lockedPlanHash?: string;
  approvalStatus: {
    state: "none" | "current" | "stale";
    label: string;
    detail: string;
  };
  approvalSnapshot?: PlannerApprovalSnapshot | null;
  completionSnapshot?: PlannerCompletionSnapshot;
  actualVsPlanReport: ActualVsLockedPlanReport;
  auditEvents: ExecutionAuditEvent[];
  warnings: string[];
  lockedPlan?: {
    planHash: string;
    planRevision: number;
    lockedAt: string;
    stationCount: number;
    approvalHash?: string;
  };
};

export function resolveExecutionPackageSupport(
  hole: SavedHoleProject
): ExecutionPackageSupport {
  if (!hole.plannerMeta?.createdFromPlanner) {
    return { supported: false, reason: "Hole was not created in Planner." };
  }
  const status = plannerStatus(hole);
  if (status !== "active" && status !== "completed") {
    return {
      supported: false,
      reason: `Execution package requires active or completed status (current: ${status}).`,
    };
  }
  if (!hole.plannerMeta.lockedPlan) {
    return {
      supported: false,
      reason: "No locked plan snapshot — activate the plan for execution first.",
    };
  }
  return { supported: true };
}

export function buildExecutionManifest(
  hole: SavedHoleProject,
  library: HoleLibrary,
  generatedAt?: string
): ExecutionManifest | null {
  if (!isExecutionAuditSupported(hole)) return null;

  const audit = buildExecutionAuditReport(hole, library);
  if (!audit) return null;

  const approval = resolvePlannerApprovalStatus(hole, library);
  const avp = buildActualVsLockedPlanReport(hole, { library });
  const locked = hole.plannerMeta!.lockedPlan!;

  return {
    format: EXECUTION_MANIFEST_FORMAT,
    generatedAt: generatedAt ?? new Date().toISOString(),
    holeId: hole.holeId,
    holeName: hole.holeName,
    programName: hole.plannerMeta?.programName ?? hole.siteName,
    plannerStatus: audit.status,
    planRevision: hole.plannerMeta?.planRevision,
    lockedPlanHash: locked.planHash,
    approvalStatus: {
      state: approval.state,
      label: approval.label,
      detail: approval.detail,
    },
    approvalSnapshot: hole.plannerMeta?.approvalSnapshot ?? null,
    completionSnapshot: hole.plannerMeta?.completionSnapshot,
    actualVsPlanReport: avp,
    auditEvents: audit.events,
    warnings: audit.warnings,
    lockedPlan: {
      planHash: locked.planHash,
      planRevision: locked.planRevision,
      lockedAt: locked.lockedAt,
      stationCount: locked.planRecords.length,
      approvalHash: locked.approvalHash,
    },
  };
}

export function exportExecutionManifestJson(
  hole: SavedHoleProject,
  library: HoleLibrary
): string | null {
  const manifest = buildExecutionManifest(hole, library);
  if (!manifest) return null;
  return JSON.stringify(manifest, null, 2);
}

export function exportLockedPlanCsv(hole: SavedHoleProject): string | null {
  if (!isExecutionAuditSupported(hole)) return null;
  const records = lockedPlanRecords(hole);
  if (!records.length) return null;
  return surveysToCsv(records);
}

export function exportActualSurveysCsv(hole: SavedHoleProject): string | null {
  if (!isExecutionAuditSupported(hole)) return null;
  if (!hole.actualRecords.length) return null;
  return surveysToCsv(hole.actualRecords);
}

export function exportActualVsPlanSummaryCsv(
  hole: SavedHoleProject,
  library: HoleLibrary
): string | null {
  if (!isExecutionAuditSupported(hole)) return null;
  const avp = buildActualVsLockedPlanReport(hole, { library });
  const rows = [
    "field,value",
    `status,${avp.status}`,
    `severity,${avp.severity}`,
    `summary,"${avp.summary.replace(/"/g, '""')}"`,
    `hasLockedPlan,${avp.hasLockedPlan}`,
    `hasActuals,${avp.hasActuals}`,
    `plannedTd,${avp.plannedTd ?? ""}`,
    `latestActualMd,${avp.latestActualMd ?? ""}`,
    `progressPct,${avp.progressPct ?? ""}`,
    `latestPlanOffsetM,${avp.latestPlanOffsetM ?? ""}`,
    `latestActualDls,${avp.latestActualDls ?? ""}`,
    `latestPlannedDls,${avp.latestPlannedDls ?? ""}`,
    `drilledPastPlan,${avp.drilledPastPlan}`,
  ];
  return rows.join("\n");
}

function executionSlug(holeName: string): string {
  return holeName.replace(/[^\w.-]+/g, "-").toLowerCase();
}

function triggerDownload(content: string, filename: string, mime: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function executionPackageFilename(
  holeName: string,
  suffix: string
): string {
  return `${executionSlug(holeName)}-execution-${suffix}`;
}

export function downloadExecutionManifest(
  hole: SavedHoleProject,
  library: HoleLibrary
): boolean {
  const json = exportExecutionManifestJson(hole, library);
  if (!json) return false;
  triggerDownload(
    json,
    executionPackageFilename(hole.holeName, "manifest.json"),
    "application/json"
  );
  return true;
}

export function downloadLockedPlanCsv(
  hole: SavedHoleProject
): boolean {
  const csv = exportLockedPlanCsv(hole);
  if (!csv) return false;
  triggerDownload(
    csv,
    executionPackageFilename(hole.holeName, "locked-plan.csv"),
    "text/csv;charset=utf-8"
  );
  return true;
}

export function downloadActualSurveysCsv(
  hole: SavedHoleProject
): boolean {
  const csv = exportActualSurveysCsv(hole);
  if (!csv) return false;
  triggerDownload(
    csv,
    executionPackageFilename(hole.holeName, "actual-surveys.csv"),
    "text/csv;charset=utf-8"
  );
  return true;
}

export function downloadActualVsPlanSummaryCsv(
  hole: SavedHoleProject,
  library: HoleLibrary
): boolean {
  const csv = exportActualVsPlanSummaryCsv(hole, library);
  if (!csv) return false;
  triggerDownload(
    csv,
    executionPackageFilename(hole.holeName, "actual-vs-plan.csv"),
    "text/csv;charset=utf-8"
  );
  return true;
}
