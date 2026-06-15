import { resolveProgramCoordinateSystem, type HoleLibrary } from "./hole-library";
import {
  buildProgramQaReport,
  canApprovePlannerHole,
  resolveProgramQaSettings,
} from "./planner-qa";
import {
  hashPlannerPlan,
  resolvePlannerApprovalStatus,
} from "./planner-approval";
import { isPlannerCreatedHole, plannerStatus } from "./planner-status";
import type {
  PlanLockStatusState,
  PlannerLockedPlan,
  PlannerLockedPlanQaSummary,
} from "./planner-types";
import type { SavedHoleProject } from "./storage";

export type PlanLockStatus = {
  state: PlanLockStatusState;
  label: string;
  detail: string;
};

export type BuildLockedPlanSnapshotOpts = {
  now?: string;
};

function deepCopyPlanRecords(hole: SavedHoleProject) {
  return hole.planRecords.map((r) => ({ ...r }));
}

function deepCopyTarget(hole: SavedHoleProject) {
  return { ...hole.target };
}

function buildQaSummary(
  hole: SavedHoleProject,
  library: HoleLibrary
): PlannerLockedPlanQaSummary {
  const approval = canApprovePlannerHole(hole, library);
  let clearanceRiskCount = 0;
  const programId = hole.plannerMeta?.programId;
  if (programId) {
    const settings = resolveProgramQaSettings(library, programId);
    const report = buildProgramQaReport(library, programId, settings);
    if (report) {
      clearanceRiskCount = report.clearancePairs.filter(
        (p) =>
          (p.holeAId === hole.holeId || p.holeBId === hole.holeId) &&
          p.severity === "risk"
      ).length;
    }
  }
  return {
    hardErrorCount: approval.blockers.length,
    warningCount: approval.warnings.length,
    clearanceRiskCount,
  };
}

export function buildLockedPlanSnapshot(
  hole: SavedHoleProject,
  library: HoleLibrary,
  opts: BuildLockedPlanSnapshotOpts = {}
): PlannerLockedPlan | null {
  if (!hole.plannerMeta) return null;
  const now = opts.now ?? new Date().toISOString();
  const planHash = hashPlannerPlan(hole);
  const snapshot = hole.plannerMeta.approvalSnapshot;
  const programId = hole.plannerMeta.programId;
  const holes =
    programId && library.holes.some((h) => h.plannerMeta?.programId === programId)
      ? library.holes.filter((h) => h.plannerMeta?.programId === programId)
      : [hole];
  const pcs = resolveProgramCoordinateSystem(holes);

  return {
    lockedAt: now,
    planHash,
    planRevision: hole.plannerMeta.planRevision ?? 1,
    approvalHash: snapshot?.planHash,
    approvedBy: hole.plannerMeta.approvedBy ?? snapshot?.approvedBy,
    approvedAt: hole.plannerMeta.approvedAt ?? snapshot?.approvedAt,
    planRecords: deepCopyPlanRecords(hole),
    target: deepCopyTarget(hole),
    projectCoordinateSystem: pcs ?? hole.plannerMeta.projectCoordinateSystem,
    qaSummary: buildQaSummary(hole, library),
  };
}

export function isPlanLocked(hole: SavedHoleProject): boolean {
  return !!hole.plannerMeta?.lockedPlan;
}

export function hasPlanDriftedSinceLock(hole: SavedHoleProject): boolean {
  const locked = hole.plannerMeta?.lockedPlan;
  if (!locked) return false;
  return hashPlannerPlan(hole) !== locked.planHash;
}

const SPEC_STATUS_LABELS: Record<PlanLockStatusState, string> = {
  "locked-current": "Approved plan locked",
  "locked-stale": "Approval stale",
  "no-approval": "Active without approval",
  "plan-changed": "Plan changed after lock",
  completed: "Completed",
  "no-lock": "Not locked",
};

export function planHashForLock(hole: SavedHoleProject): string {
  return hashPlannerPlan(hole);
}

export function approvalHashForLock(hole: SavedHoleProject): string | undefined {
  return hole.plannerMeta?.approvalSnapshot?.planHash;
}

export function isPlannerExecutionHole(hole: SavedHoleProject): boolean {
  return (
    isPlannerCreatedHole(hole) &&
    (!!hole.plannerMeta?.lockedPlan || plannerStatus(hole) === "active")
  );
}

export function summarizePlanLockStatus(
  hole: SavedHoleProject,
  library: HoleLibrary
): PlanLockStatus {
  const status = getPlanLockStatus(hole, library);
  return {
    ...status,
    label: SPEC_STATUS_LABELS[status.state] ?? status.label,
  };
}

export function resolvePlanLockStatus(hole: SavedHoleProject): PlanLockStatus {
  if (!isPlannerCreatedHole(hole)) {
    return {
      state: "no-lock",
      label: "Not a planner hole",
      detail: "This hole was not created in the Hole Planner.",
    };
  }

  const executionState = hole.plannerMeta?.executionStatus?.state;
  const status = plannerStatus(hole);
  if (executionState === "completed" || status === "completed") {
    return {
      state: "completed",
      label: "Completed",
      detail: "Planner plan execution is marked completed.",
    };
  }

  const locked = hole.plannerMeta?.lockedPlan;
  if (!locked) {
    const status = plannerStatus(hole);
    if (status === "active" || status === "completed") {
      return {
        state: "no-lock",
        label: "Plan not locked",
        detail:
          "Active plan has no execution lock. Re-activate from Planner to create a locked snapshot.",
      };
    }
    return {
      state: "no-lock",
      label: "Not locked",
      detail: "Plan has not been activated for field execution.",
    };
  }

  if (hasPlanDriftedSinceLock(hole)) {
    return {
      state: "plan-changed",
      label: "Plan changed after lock",
      detail:
        "Current plan records or target differ from the locked execution snapshot. Create a revision instead of editing in place.",
    };
  }

  if (!hole.plannerMeta?.approvalSnapshot && !locked.approvalHash) {
    return {
      state: "no-approval",
      label: "No formal approval",
      detail: "Plan was activated without a formal approval snapshot.",
    };
  }

  return {
    state: "locked-current",
    label: "Locked for execution",
    detail: `Revision R${locked.planRevision} locked at ${new Date(locked.lockedAt).toLocaleString("en-AU")}.`,
  };
}

export function resolvePlanLockStatusWithApproval(
  hole: SavedHoleProject,
  library: HoleLibrary
): PlanLockStatus {
  const base = resolvePlanLockStatus(hole);
  if (
    base.state === "plan-changed" ||
    base.state === "no-lock" ||
    base.state === "completed"
  ) {
    return base;
  }

  const approval = resolvePlannerApprovalStatus(hole, library);
  if (approval.state === "stale") {
    return {
      state: "locked-stale",
      label: "Stale approval",
      detail: approval.detail,
    };
  }

  if (approval.state === "none" && !hole.plannerMeta?.lockedPlan?.approvalHash) {
    return {
      state: "no-approval",
      label: "No formal approval",
      detail: approval.detail,
    };
  }

  if (hasPlanDriftedSinceLock(hole)) {
    return {
      state: "plan-changed",
      label: "Plan changed after lock",
      detail:
        "Current plan records or target differ from the locked execution snapshot.",
    };
  }

  return base;
}

export const getPlanLockStatus = resolvePlanLockStatusWithApproval;
export const hasPlanChangedSinceLock = hasPlanDriftedSinceLock;

export type LockedPlanEditField =
  | "planRecords"
  | "target"
  | "plannerMeta"
  | "planCorridor";

export function guardLockedPlanEdit(
  hole: SavedHoleProject,
  field: LockedPlanEditField
): string | null {
  if (!isPlannerCreatedHole(hole)) return null;
  const status = plannerStatus(hole);
  if (status !== "active" && status !== "completed") return null;

  const locked = hole.plannerMeta?.lockedPlan;
  if (!locked && status === "completed") {
    return `Plan "${hole.holeName}" is completed. Create a revision to change ${field}.`;
  }

  if (status === "active" || (status === "completed" && locked)) {
    if (field === "planRecords" || field === "target" || field === "plannerMeta") {
      return `Plan "${hole.holeName}" is ${status} with a locked execution snapshot. Create a revision in Planner instead of editing ${field}.`;
    }
    if (field === "planCorridor" && locked) {
      return `Plan corridor cannot be changed while "${hole.holeName}" is ${status} against a locked plan. Create a revision in Planner.`;
    }
  }

  return null;
}

export function lockedPlanRecords(hole: SavedHoleProject) {
  return hole.plannerMeta?.lockedPlan?.planRecords ?? hole.planRecords;
}

export function lockedPlanTarget(hole: SavedHoleProject) {
  return hole.plannerMeta?.lockedPlan?.target ?? hole.target;
}

export function truncatePlanHash(hash: string, len = 12): string {
  if (hash.length <= len) return hash;
  return `${hash.slice(0, len)}…`;
}
