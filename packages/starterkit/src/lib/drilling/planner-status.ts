import { setActiveDaughter } from "./branch-program-library";
import {
  findHole,
  setActiveHole,
  upsertHole,
  type HoleLibrary,
} from "./hole-library";
import type { PlannerApprovalSnapshot } from "./planner-approval";
import type {
  PlannerPlanStatus,
  PlannerProjectMetadata,
} from "./planner-types";
import type { SavedHoleProject } from "./storage";

export function isPlannerCreatedHole(hole: SavedHoleProject): boolean {
  return hole.plannerMeta?.createdFromPlanner === true;
}

export function plannerStatus(hole: SavedHoleProject): PlannerPlanStatus {
  return hole.plannerMeta?.status ?? "draft";
}

const FORWARD_TRANSITIONS: Record<PlannerPlanStatus, PlannerPlanStatus[]> = {
  draft: ["planned", "archived"],
  planned: ["approved", "archived"],
  approved: ["active", "archived", "draft"],
  active: ["completed", "archived", "planned"],
  completed: ["archived"],
  archived: [],
};

export function canTransitionStatus(
  from: PlannerPlanStatus,
  to: PlannerPlanStatus
): boolean {
  if (from === to) return true;
  return FORWARD_TRANSITIONS[from]?.includes(to) ?? false;
}

export function requiresBackwardConfirmation(
  from: PlannerPlanStatus,
  to: PlannerPlanStatus
): boolean {
  return (
    (from === "approved" && to === "draft") ||
    (from === "active" && to === "planned")
  );
}

export type TransitionOpts = {
  approvedBy?: string;
  now?: string;
};

export function transitionPlannerStatus(
  hole: SavedHoleProject,
  to: PlannerPlanStatus,
  opts: TransitionOpts = {}
): SavedHoleProject | null {
  const meta = hole.plannerMeta;
  if (!meta) return null;
  const from = meta.status;
  if (!canTransitionStatus(from, to)) return null;

  const now = opts.now ?? new Date().toISOString();
  const nextMeta: PlannerProjectMetadata = { ...meta, status: to };

  if (to === "approved") {
    nextMeta.approvedBy = opts.approvedBy ?? "Planner";
    nextMeta.approvedAt = now;
  }
  if (to === "active") {
    nextMeta.activatedAt = now;
  }
  if (to === "completed") {
    nextMeta.completedAt = now;
  }
  if (to === "draft" && from === "approved") {
    nextMeta.approvedBy = undefined;
    nextMeta.approvedAt = undefined;
    nextMeta.approvalSnapshot = undefined;
  }
  if (to === "planned" && from === "active") {
    nextMeta.activatedAt = undefined;
  }

  return {
    ...hole,
    plannerMeta: nextMeta,
    updatedAt: now,
  };
}

export function guardApprovedEdit(hole: SavedHoleProject): string | null {
  const status = plannerStatus(hole);
  if (status === "approved" || status === "active" || status === "completed") {
    return `Plan "${hole.holeName}" is ${status}. Create a revision instead of editing in place.`;
  }
  return null;
}

export type ApprovePlannerPlanOpts = {
  approvedBy?: string;
  role?: string;
  snapshot?: PlannerApprovalSnapshot;
};

export function approvePlannerPlan(
  library: HoleLibrary,
  holeId: string,
  opts: ApprovePlannerPlanOpts | string = {}
): HoleLibrary | null {
  const resolved =
    typeof opts === "string" ? { approvedBy: opts } : opts;
  const hole = findHole(library, holeId);
  if (!hole?.plannerMeta) return null;
  const updated = transitionPlannerStatus(hole, "approved", {
    approvedBy: resolved.approvedBy,
  });
  if (!updated) return null;
  const withSnapshot: SavedHoleProject = resolved.snapshot
    ? {
        ...updated,
        plannerMeta: {
          ...updated.plannerMeta!,
          approvalSnapshot: resolved.snapshot,
        },
      }
    : updated;
  return upsertHole(library, withSnapshot);
}

export function archivePlannerPlan(
  library: HoleLibrary,
  holeId: string
): HoleLibrary | null {
  const hole = findHole(library, holeId);
  if (!hole?.plannerMeta) return null;
  const updated = transitionPlannerStatus(hole, "archived");
  if (!updated) return null;
  return upsertHole(library, updated);
}

export function completePlannerPlan(
  library: HoleLibrary,
  holeId: string
): HoleLibrary | null {
  const hole = findHole(library, holeId);
  if (!hole?.plannerMeta) return null;
  const updated = transitionPlannerStatus(hole, "completed");
  if (!updated) return null;
  return upsertHole(library, updated);
}

export function activatePlannerPlan(
  library: HoleLibrary,
  holeId: string
): HoleLibrary | null {
  const hole = findHole(library, holeId);
  if (!hole?.plannerMeta) return null;
  if (!canTransitionStatus(hole.plannerMeta.status, "active")) return null;

  const updated = transitionPlannerStatus(hole, "active");
  if (!updated) return null;

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

export function openPlannerPlanInTargetLock(
  library: HoleLibrary,
  holeId: string
): HoleLibrary | null {
  const hole = findHole(library, holeId);
  if (!hole) return null;

  if (hole.holeRole === "daughter" && hole.parentHoleId) {
    return setActiveDaughter(library, hole.parentHoleId, holeId);
  }
  return setActiveHole(library, holeId);
}

export function migratePlannerMeta(hole: SavedHoleProject): SavedHoleProject {
  if (!hole.plannerMeta) return hole;
  const meta = hole.plannerMeta;
  let nextMeta = meta;

  if (!(meta.createdFromPlanner === true && meta.status)) {
    const planType =
      meta.planType ??
      (hole.holeRole === "daughter" ? "daughter" : ("standard" as const));

    nextMeta = {
      ...meta,
      createdFromPlanner: true,
      status: meta.status ?? "planned",
      planRevision: meta.planRevision ?? 1,
      planType,
      programId: meta.programId ?? hole.programId,
      programName: meta.programName ?? hole.siteName,
    };
  }

  if (
    nextMeta.status === "active" &&
    !nextMeta.executionStatus
  ) {
    nextMeta = {
      ...nextMeta,
      executionStatus: {
        state: hasMeaningfulActualsForMigration(hole) ? "drilling" : "not-started",
      },
    };
  }

  if (nextMeta === meta) return hole;
  return { ...hole, plannerMeta: nextMeta };
}

function hasMeaningfulActualsForMigration(hole: SavedHoleProject): boolean {
  return hole.actualRecords.length > 1;
}
