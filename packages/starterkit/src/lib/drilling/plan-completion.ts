import { buildActualVsLockedPlanReport } from "./actual-vs-plan";
import { findHole, upsertHole, type HoleLibrary } from "./hole-library";
import { createHistoryId } from "./history";
import { hasPlanDriftedSinceLock } from "./plan-lock";
import { resolvePlannerApprovalStatus } from "./planner-approval";
import {
  canTransitionStatus,
  isPlannerCreatedHole,
  plannerStatus,
  transitionPlannerStatus,
} from "./planner-status";
import type {
  PlannerCompletionSnapshot,
  PlannerExecutionStatus,
  PlannerProjectMetadata,
} from "./planner-types";
import type { SavedHoleProject } from "./storage";

function mergePlannerMeta(
  hole: SavedHoleProject,
  patch: Partial<PlannerProjectMetadata>
): SavedHoleProject {
  if (!hole.plannerMeta) return hole;
  return {
    ...hole,
    plannerMeta: {
      ...hole.plannerMeta,
      ...patch,
      executionStatus: patch.executionStatus
        ? { ...hole.plannerMeta.executionStatus, ...patch.executionStatus }
        : hole.plannerMeta.executionStatus,
    },
    updatedAt: new Date().toISOString(),
  };
}

export type CompletePlannerExecutionOpts = {
  completedBy?: string;
  completionNotes?: string;
  completedAt?: string;
  /** @deprecated use completionNotes */
  notes?: string;
};

export type CompletePlannerExecutionResult = {
  library: HoleLibrary;
  completedHole: SavedHoleProject;
  warnings: string[];
};

function buildCompletionWarnings(
  hole: SavedHoleProject,
  library: HoleLibrary
): string[] {
  const warnings: string[] = [];
  if (hasPlanDriftedSinceLock(hole)) {
    warnings.push("Live plan differs from locked execution snapshot.");
  }
  const approval = resolvePlannerApprovalStatus(hole, library);
  if (approval.state === "stale") {
    warnings.push("Approval snapshot was stale at completion.");
  }
  if (hole.actualRecords.length <= 1) {
    warnings.push("No meaningful actual surveys recorded at completion.");
  }
  return warnings;
}

function buildCompletionSnapshot(
  hole: SavedHoleProject,
  library: HoleLibrary,
  completedAt: string,
  completedBy?: string
): PlannerCompletionSnapshot {
  const locked = hole.plannerMeta!.lockedPlan!;
  const avp = buildActualVsLockedPlanReport(hole, { library });
  const tracking =
    avp.status !== "no-locked-plan" && avp.status !== "not-started"
      ? avp.status
      : undefined;

  return {
    completedAt,
    completedBy,
    finalActualMd: avp.latestActualMd,
    finalPlanOffsetM: avp.latestPlanOffsetM,
    finalTrackingStatus: tracking,
    actualSurveyCount: hole.actualRecords.length,
    lockedPlanHash: locked.planHash,
    planRevision: hole.plannerMeta?.planRevision ?? 1,
    reportSummary: avp.summary,
  };
}

export function completePlannerExecution(
  library: HoleLibrary,
  holeId: string,
  opts: CompletePlannerExecutionOpts = {}
): CompletePlannerExecutionResult | null {
  const hole = findHole(library, holeId);
  if (!hole?.plannerMeta) return null;
  if (!isPlannerCreatedHole(hole)) return null;
  if (!hole.plannerMeta.lockedPlan) return null;
  if (!canTransitionStatus(hole.plannerMeta.status, "completed")) return null;

  const now = opts.completedAt ?? new Date().toISOString();
  const completedBy = opts.completedBy?.trim() || "Field";
  const completionNotes =
    opts.completionNotes?.trim() || opts.notes?.trim() || undefined;

  let updated = transitionPlannerStatus(hole, "completed", { now });
  if (!updated) return null;

  const warnings = buildCompletionWarnings(updated, library);
  const completionSnapshot = buildCompletionSnapshot(
    updated,
    library,
    now,
    completedBy
  );

  const executionStatus: PlannerExecutionStatus = {
    state: "completed",
    startedAt: hole.plannerMeta.executionStatus?.startedAt,
    completedAt: now,
    completedBy,
    completionNotes,
    notes: completionNotes,
  };

  updated = mergePlannerMeta(updated, {
    completedAt: now,
    completionSnapshot,
    executionStatus,
  });

  const historyEntry = {
    id: createHistoryId(),
    timestamp: now,
    type: "supervisor_decision" as const,
    summary: "Planner plan completed",
    detail: completionNotes,
    actionTaken: `Completed by ${completedBy}`,
  };

  updated = {
    ...updated,
    history: [...updated.history, historyEntry],
    updatedAt: now,
  };

  const nextLib = upsertHole(library, updated);
  const completedHole = findHole(nextLib, holeId);
  if (!completedHole) return null;

  return { library: nextLib, completedHole, warnings };
}
