import { setActiveDaughter } from "./branch-program-library";
import {
  findHole,
  setActiveHole,
  upsertHole,
  type HoleLibrary,
} from "./hole-library";
import {
  buildLockedPlanSnapshot,
  getPlanLockStatus,
  hasPlanDriftedSinceLock,
  isPlanLocked,
  resolvePlanLockStatusWithApproval,
  summarizePlanLockStatus,
  truncatePlanHash,
  type PlanLockStatus,
} from "./plan-lock";
import {
  resolvePlannerApprovalStatus,
} from "./planner-approval";
import {
  canTransitionStatus,
  isPlannerCreatedHole,
  openPlannerPlanInTargetLock as openInTargetLock,
  plannerStatus,
  transitionPlannerStatus,
} from "./planner-status";
import { formatRevisionLineageSummary } from "./plan-revision";
import type {
  PlannerCompletionSnapshot,
  PlannerExecutionState,
  PlannerExecutionStatus,
  PlannerProjectMetadata,
  PlanLockStatusState,
} from "./planner-types";
import type { SavedHoleProject } from "./storage";

export type ActivatePlannerPlanForExecutionOpts = {
  allowUnapproved?: boolean;
  now?: string;
};

export type {
  CompletePlannerExecutionOpts,
  CompletePlannerExecutionResult,
} from "./plan-completion";
export { completePlannerExecution } from "./plan-completion";

export type PlannerExecutionContext = {
  holeId: string;
  holeName: string;
  programName?: string;
  planRevision: number;
  status: ReturnType<typeof plannerStatus>;
  executionState: PlannerExecutionState;
  lockStatus: PlanLockStatusState;
  lockLabel: string;
  lockDetail: string;
  approvalState: "none" | "current" | "stale";
  approvalLabel: string;
  approvalDetail: string;
  approvedBy?: string;
  approvedAt?: string;
  planDrifted: boolean;
  hasLock: boolean;
  hasApproval: boolean;
  qaWarningCount: number;
  qaHardErrorCount: number;
  qaClearanceRiskCount: number;
  specStatusLabel: string;
  lockedPlanHash?: string;
  lockedAt?: string;
  bannerVariant:
    | "approved-active"
    | "stale-approval"
    | "no-approval"
    | "plan-changed"
    | "drilling-locked"
    | "no-lock"
    | "completed";
};

function hasMeaningfulActuals(hole: SavedHoleProject): boolean {
  return hole.actualRecords.length > 1;
}

function initialExecutionState(hole: SavedHoleProject): PlannerExecutionState {
  if (hasMeaningfulActuals(hole)) return "drilling";
  return "not-started";
}

export function mergePlannerMetaExecution(
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

export function markExecutionDrilling(hole: SavedHoleProject): SavedHoleProject {
  if (!hole.plannerMeta) return hole;
  const current = hole.plannerMeta.executionStatus?.state;
  if (current === "completed" || current === "revised") return hole;
  if (current === "drilling") return hole;

  const now = new Date().toISOString();
  return mergePlannerMetaExecution(hole, {
    executionStatus: {
      state: "drilling",
      startedAt: hole.plannerMeta.executionStatus?.startedAt ?? now,
      completedAt: hole.plannerMeta.executionStatus?.completedAt,
      completedBy: hole.plannerMeta.executionStatus?.completedBy,
      notes: hole.plannerMeta.executionStatus?.notes,
    },
  });
}

function resolveBannerVariant(
  hole: SavedHoleProject,
  library: HoleLibrary
): PlannerExecutionContext["bannerVariant"] {
  const status = plannerStatus(hole);
  if (status === "completed") return "completed";

  const lockStatus = resolvePlanLockStatusWithApproval(hole, library);
  const approval = resolvePlannerApprovalStatus(hole, library);

  if (!isPlanLocked(hole)) return "no-lock";
  if (hasPlanDriftedSinceLock(hole)) return "plan-changed";
  if (approval.state === "stale") return "stale-approval";
  if (approval.state === "none") return "no-approval";
  if (lockStatus.state === "locked-current") return "approved-active";
  return "drilling-locked";
}

export function buildPlannerExecutionContext(
  hole: SavedHoleProject,
  library: HoleLibrary
): PlannerExecutionContext | null {
  if (!isPlannerCreatedHole(hole) || !hole.plannerMeta) return null;

  const status = plannerStatus(hole);
  const lockResolved = resolvePlanLockStatusWithApproval(hole, library);
  const specLock = summarizePlanLockStatus(hole, library);
  const approval = resolvePlannerApprovalStatus(hole, library);
  const locked = hole.plannerMeta.lockedPlan;
  const executionState =
    hole.plannerMeta.executionStatus?.state ??
    (status === "completed" ? "completed" : "not-started");

  return {
    holeId: hole.holeId,
    holeName: hole.holeName,
    programName: hole.plannerMeta.programName ?? hole.siteName,
    planRevision: hole.plannerMeta.planRevision ?? 1,
    status,
    executionState,
    lockStatus: lockResolved.state,
    lockLabel: lockResolved.label,
    lockDetail: lockResolved.detail,
    approvalState: approval.state,
    approvalLabel: approval.label,
    approvalDetail: approval.detail,
    approvedBy: locked?.approvedBy ?? hole.plannerMeta.approvedBy,
    approvedAt: locked?.approvedAt ?? hole.plannerMeta.approvedAt,
    planDrifted: hasPlanDriftedSinceLock(hole),
    hasLock: isPlanLocked(hole),
    hasApproval: approval.state !== "none" || !!locked?.approvalHash,
    qaWarningCount: locked?.qaSummary?.warningCount ?? 0,
    qaHardErrorCount: locked?.qaSummary?.hardErrorCount ?? 0,
    qaClearanceRiskCount: locked?.qaSummary?.clearanceRiskCount ?? 0,
    specStatusLabel: specLock.label,
    lockedPlanHash: locked?.planHash,
    lockedAt: locked?.lockedAt,
    bannerVariant: resolveBannerVariant(hole, library),
  };
}

export function activatePlannerPlanForExecution(
  library: HoleLibrary,
  holeId: string,
  opts: ActivatePlannerPlanForExecutionOpts = {}
): HoleLibrary | null {
  const hole = findHole(library, holeId);
  if (!hole?.plannerMeta) return null;

  const status = hole.plannerMeta.status;
  const canActivate =
    canTransitionStatus(status, "active") ||
    (opts.allowUnapproved && status === "planned");

  if (!canActivate) return null;

  const now = opts.now ?? new Date().toISOString();
  let updated = transitionPlannerStatus(hole, "active", { now });
  if (!updated && opts.allowUnapproved && status === "planned") {
    updated = {
      ...hole,
      plannerMeta: {
        ...hole.plannerMeta,
        status: "active",
        activatedAt: now,
      },
      updatedAt: now,
    };
  }
  if (!updated) return null;

  const lockedPlan = buildLockedPlanSnapshot(updated, library, { now });
  if (!lockedPlan) return null;

  const planHash = lockedPlan.planHash;
  const execState = initialExecutionState(updated);
  const executionStatus: PlannerExecutionStatus = {
    state: execState,
    startedAt: execState === "drilling" ? now : undefined,
  };

  updated = {
    ...updated,
    plannerMeta: {
      ...updated.plannerMeta!,
      activatedAt: now,
      activatedFromPlannerAt: now,
      activePlanHash: planHash,
      lockedPlan,
      executionStatus,
    },
    updatedAt: now,
  };

  let nextLib = upsertHole(library, updated);

  if (updated.holeRole === "daughter" && updated.parentHoleId) {
    const synced = setActiveDaughter(
      nextLib,
      updated.parentHoleId,
      updated.holeId
    );
    if (synced) nextLib = synced;
  } else {
    const activated = setActiveHole(nextLib, holeId);
    if (!activated) return null;
    nextLib = activated;
  }

  return nextLib;
}

export type ActivatePlannerHoleForExecutionResult = {
  library: HoleLibrary;
  activatedHole: SavedHoleProject;
  lockStatus: PlanLockStatus;
  warnings: string[];
};

export function buildActivationWarnings(
  hole: SavedHoleProject,
  library: HoleLibrary
): string[] {
  const warnings: string[] = [];
  const approval = resolvePlannerApprovalStatus(hole, library);
  if (approval.state === "stale") {
    warnings.push(
      "Approval was stale at activation — review the plan before drilling."
    );
  }
  if (!hole.plannerMeta?.lockedPlan?.approvalHash) {
    warnings.push("Plan activated without a formal approval snapshot.");
  }
  return warnings;
}

export function activatePlannerHoleForExecution(
  library: HoleLibrary,
  holeId: string,
  opts: ActivatePlannerPlanForExecutionOpts = {}
): ActivatePlannerHoleForExecutionResult | null {
  const nextLib = activatePlannerPlanForExecution(library, holeId, opts);
  if (!nextLib) return null;

  const activatedHole = findHole(nextLib, holeId);
  if (!activatedHole) return null;

  const lockStatus = getPlanLockStatus(activatedHole, nextLib);
  const warnings = buildActivationWarnings(activatedHole, nextLib);

  return { library: nextLib, activatedHole, lockStatus, warnings };
}

export function openPlannerPlanInTargetLock(
  library: HoleLibrary,
  holeId: string
): HoleLibrary | null {
  return openInTargetLock(library, holeId);
}

export function supersedeActivePlanWithRevision(
  library: HoleLibrary,
  sourceHoleId: string
): HoleLibrary | null {
  const source = findHole(library, sourceHoleId);
  if (!source?.plannerMeta) return null;
  if (plannerStatus(source) !== "active") return library;

  const updated = mergePlannerMetaExecution(source, {
    executionStatus: {
      state: "revised",
      startedAt: source.plannerMeta.executionStatus?.startedAt,
      completedAt: source.plannerMeta.executionStatus?.completedAt,
      completedBy: source.plannerMeta.executionStatus?.completedBy,
      notes: source.plannerMeta.executionStatus?.notes,
    },
  });

  return upsertHole(library, updated);
}

export type PlannerExecutionReportContext = {
  planRevision: number;
  approvalState: "none" | "current" | "stale";
  approvalLabel: string;
  approvedBy?: string;
  approvedAt?: string;
  lockedPlanHash?: string;
  qaWarningCount: number;
  qaHardErrorCount: number;
  lockStatus: import("./planner-types").PlanLockStatusState;
  staleApprovalWarning?: string;
  actualVsPlanStatus?: string;
  actualVsPlanOffset?: number | null;
  actualVsPlanProgressPct?: number | null;
  actualVsPlanWarnings?: string[];
  planChangedWarning?: string;
  drilledPastPlanWarning?: string;
  executionState: PlannerExecutionState;
  completionSnapshot?: PlannerCompletionSnapshot;
  finalActualMd?: number | null;
  revisionLineage?: string;
};

export type BuildPlannerExecutionReportContextOpts = {
  actualVsPlanStatus?: string;
  actualVsPlanOffset?: number | null;
  actualVsPlanProgressPct?: number | null;
  actualVsPlanWarnings?: string[];
  planChangedWarning?: string;
  drilledPastPlanWarning?: string;
  finalActualMd?: number | null;
};

export function buildPlannerExecutionReportContext(
  hole: SavedHoleProject,
  library: HoleLibrary,
  opts: BuildPlannerExecutionReportContextOpts = {}
): PlannerExecutionReportContext | null {
  const ctx = buildPlannerExecutionContext(hole, library);
  if (!ctx) return null;

  return {
    planRevision: ctx.planRevision,
    approvalState: ctx.approvalState,
    approvalLabel: ctx.approvalLabel,
    approvedBy: ctx.approvedBy,
    approvedAt: ctx.approvedAt,
    lockedPlanHash: ctx.lockedPlanHash
      ? truncatePlanHash(ctx.lockedPlanHash)
      : undefined,
    qaWarningCount: ctx.qaWarningCount,
    qaHardErrorCount: ctx.qaHardErrorCount,
    lockStatus: ctx.lockStatus,
    staleApprovalWarning:
      ctx.approvalState === "stale"
        ? "Approval snapshot is stale — plan or settings changed since approval."
        : undefined,
    actualVsPlanStatus: opts.actualVsPlanStatus,
    actualVsPlanOffset: opts.actualVsPlanOffset,
    actualVsPlanProgressPct: opts.actualVsPlanProgressPct,
    actualVsPlanWarnings: opts.actualVsPlanWarnings,
    planChangedWarning: opts.planChangedWarning,
    drilledPastPlanWarning: opts.drilledPastPlanWarning,
    executionState: ctx.executionState,
    completionSnapshot: hole.plannerMeta?.completionSnapshot,
    finalActualMd:
      hole.plannerMeta?.completionSnapshot?.finalActualMd ??
      opts.finalActualMd ??
      null,
    revisionLineage: formatRevisionLineageSummary(library, hole.holeId),
  };
}

export function clearExecutionLockFields(
  meta: PlannerProjectMetadata
): PlannerProjectMetadata {
  return {
    ...meta,
    activePlanHash: undefined,
    activatedFromPlannerAt: undefined,
    lockedPlan: undefined,
    executionStatus: undefined,
    activatedAt: undefined,
    completedAt: undefined,
    completionSnapshot: undefined,
  };
}
