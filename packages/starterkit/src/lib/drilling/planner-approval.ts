import {
  resolveProgramCoordinateSystem,
  type HoleLibrary,
} from "./hole-library";
import {
  canApprovePlannerHole,
  resolveProgramQaSettings,
} from "./planner-qa";
import { plannerStatus } from "./planner-status";
import type {
  PlannerProjectCoordinateSystem,
  PlannerQaSettings,
} from "./planner-types";
import type { SavedHoleProject } from "./storage";

export type PlannerApprovalSnapshot = {
  approvedBy: string;
  role?: string;
  approvedAt: string;
  statusAtApproval: "planned" | "approved";
  planHash: string;
  qaHash: string;
  coordinateSystemHash: string;
  planRevision: number;
  warningsAtApproval: string[];
  hardErrorsAtApproval: string[];
};

export type PlannerApprovalState = "none" | "current" | "stale";

export type PlannerApprovalStatus = {
  state: PlannerApprovalState;
  label: string;
  detail: string;
  changedFields: string[];
};

export type PlannerApprovalCurrent = {
  planHash: string;
  qaHash: string;
  coordinateSystemHash: string;
};

export function hashPlannerPlan(hole: SavedHoleProject): string {
  const records = hole.planRecords.map((r) => [r.md, r.dip, r.azimuth]);
  const target = hole.target;
  return JSON.stringify({
    records,
    target: {
      e: target.e,
      n: target.n,
      d: target.d,
      md: target.md ?? null,
      tolerance: target.tolerance,
    },
  });
}

export function hashPlannerQaSettings(settings: PlannerQaSettings): string {
  return JSON.stringify(settings);
}

export function hashPlannerCoordinateSystem(
  pcs: PlannerProjectCoordinateSystem | undefined
): string {
  return JSON.stringify(pcs ?? null);
}

export function buildPlannerApprovalCurrent(
  hole: SavedHoleProject,
  library: HoleLibrary
): PlannerApprovalCurrent {
  const programId = hole.plannerMeta?.programId;
  const qaHash = programId
    ? hashPlannerQaSettings(resolveProgramQaSettings(library, programId))
    : hashPlannerQaSettings(resolveProgramQaSettings(library, ""));

  const holes =
    programId && library.holes.some((h) => h.plannerMeta?.programId === programId)
      ? library.holes.filter((h) => h.plannerMeta?.programId === programId)
      : [hole];
  const pcs = resolveProgramCoordinateSystem(holes);

  return {
    planHash: hashPlannerPlan(hole),
    qaHash,
    coordinateSystemHash: hashPlannerCoordinateSystem(pcs),
  };
}

export function buildPlannerApprovalSnapshot(
  hole: SavedHoleProject,
  library: HoleLibrary,
  opts: {
    approvedBy: string;
    role?: string;
    now?: string;
  }
): PlannerApprovalSnapshot {
  const approval = canApprovePlannerHole(hole, library);
  const current = buildPlannerApprovalCurrent(hole, library);
  const status = plannerStatus(hole);
  const statusAtApproval: PlannerApprovalSnapshot["statusAtApproval"] =
    status === "planned" ? "planned" : "approved";

  return {
    approvedBy: opts.approvedBy.trim(),
    role: opts.role?.trim() || undefined,
    approvedAt: opts.now ?? new Date().toISOString(),
    statusAtApproval,
    planHash: current.planHash,
    qaHash: current.qaHash,
    coordinateSystemHash: current.coordinateSystemHash,
    planRevision: hole.plannerMeta?.planRevision ?? 1,
    warningsAtApproval: [...approval.warnings],
    hardErrorsAtApproval: [...approval.blockers],
  };
}

export function plannerApprovalStatus(
  snapshot: PlannerApprovalSnapshot | null | undefined,
  current: PlannerApprovalCurrent
): PlannerApprovalStatus {
  if (!snapshot?.approvedBy) {
    return {
      state: "none",
      label: "Not approved",
      detail: "Plan has not been formally approved.",
      changedFields: [],
    };
  }

  const changedFields: string[] = [];
  if (snapshot.planHash !== current.planHash) {
    changedFields.push("plan or target");
  }
  if (snapshot.qaHash !== current.qaHash) {
    changedFields.push("QA settings");
  }
  if (snapshot.coordinateSystemHash !== current.coordinateSystemHash) {
    changedFields.push("coordinate system");
  }

  if (changedFields.length > 0) {
    return {
      state: "stale",
      label: "Changed since approval",
      detail: `Current ${changedFields.join(", ")} differ from the approved snapshot. Re-review before handoff.`,
      changedFields,
    };
  }

  const roleSuffix = snapshot.role ? ` (${snapshot.role})` : "";
  return {
    state: "current",
    label: "Approved",
    detail: `Approved by ${snapshot.approvedBy}${roleSuffix} on ${new Date(snapshot.approvedAt).toLocaleString("en-AU")}.`,
    changedFields: [],
  };
}

export function resolvePlannerApprovalStatus(
  hole: SavedHoleProject,
  library: HoleLibrary
): PlannerApprovalStatus {
  const current = buildPlannerApprovalCurrent(hole, library);
  return plannerApprovalStatus(hole.plannerMeta?.approvalSnapshot, current);
}
