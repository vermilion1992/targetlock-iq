import { resolvePlannerApprovalStatus } from "./planner-approval";
import { buildHoleQaSummary, buildProgramQaReport, resolveProgramQaSettings } from "./planner-qa";
import { resolvePlanLockStatusWithApproval } from "./plan-lock";
import { isPlannerCreatedHole, plannerStatus } from "./planner-status";
import type { PlannerPlanStatus } from "./planner-types";
import type { HoleLibrary } from "./hole-library";
import type { SavedHoleProject } from "./storage";

export type PlannerDisplayStatus =
  | PlannerPlanStatus
  | "stale"
  | "revised"
  | "blocked";

export type PlannerActionId =
  | "open"
  | "review"
  | "duplicate"
  | "create-revision"
  | "approve"
  | "activate"
  | "complete"
  | "archive"
  | "export";

export type PlannerStatusDisplay = {
  status: PlannerDisplayStatus;
  label: string;
  description: string;
  cssClass: string;
  lifecycleStatus: PlannerPlanStatus;
};

const LIFECYCLE_LABELS: Record<PlannerPlanStatus, string> = {
  draft: "Draft",
  planned: "Planned",
  approved: "Approved",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

const LIFECYCLE_DESCRIPTIONS: Record<PlannerPlanStatus, string> = {
  draft: "Plan in progress — not yet published.",
  planned: "Published plan awaiting approval.",
  approved: "Approved for field handoff and activation.",
  active: "Active execution — locked plan in use on rig.",
  completed: "Drilling completed — plan locked for audit.",
  archived: "Archived — read-only reference.",
};

const LIFECYCLE_CSS: Record<PlannerPlanStatus, string> = {
  draft: "planner-status-badge--draft",
  planned: "planner-status-badge--planned",
  approved: "planner-status-badge--approved",
  active: "planner-status-badge--active",
  completed: "planner-status-badge--completed",
  archived: "planner-status-badge--archived",
};

const OVERRIDE_DISPLAY: Record<
  Exclude<PlannerDisplayStatus, PlannerPlanStatus>,
  Omit<PlannerStatusDisplay, "lifecycleStatus">
> = {
  stale: {
    status: "stale",
    label: "Stale approval",
    description: "Plan, QA, or coordinates changed since approval — re-approve required.",
    cssClass: "planner-status-badge--stale",
  },
  revised: {
    status: "revised",
    label: "Revised",
    description: "Superseded by a newer plan revision.",
    cssClass: "planner-status-badge--revised",
  },
  blocked: {
    status: "blocked",
    label: "Blocked",
    description: "QA hard errors prevent approval or handoff.",
    cssClass: "planner-status-badge--blocked",
  },
};

function resolveQaBadge(
  hole: SavedHoleProject,
  library: HoleLibrary
): "ok" | "watch" | "risk" | "blocked" | null {
  const programId = hole.plannerMeta?.programId;
  if (!programId) return null;
  const report = buildProgramQaReport(
    library,
    programId,
    resolveProgramQaSettings(library, programId)
  );
  if (!report) return null;
  return buildHoleQaSummary(hole.holeId, report)?.badge ?? null;
}

export function getPlannerStatusDisplay(
  hole: SavedHoleProject,
  library: HoleLibrary
): PlannerStatusDisplay {
  const lifecycleStatus = plannerStatus(hole);

  if (hole.plannerMeta?.executionStatus?.state === "revised") {
    return { ...OVERRIDE_DISPLAY.revised, lifecycleStatus };
  }

  const qaBadge = resolveQaBadge(hole, library);
  if (
    qaBadge === "blocked" &&
    lifecycleStatus !== "archived" &&
    lifecycleStatus !== "completed"
  ) {
    return { ...OVERRIDE_DISPLAY.blocked, lifecycleStatus };
  }

  if (lifecycleStatus === "approved" || lifecycleStatus === "active") {
    const approval = resolvePlannerApprovalStatus(hole, library);
    if (approval.state === "stale") {
      return { ...OVERRIDE_DISPLAY.stale, lifecycleStatus };
    }
    const lock = resolvePlanLockStatusWithApproval(hole, library);
    if (lock.state === "locked-stale") {
      return { ...OVERRIDE_DISPLAY.stale, lifecycleStatus };
    }
  }

  return {
    status: lifecycleStatus,
    label: LIFECYCLE_LABELS[lifecycleStatus],
    description: LIFECYCLE_DESCRIPTIONS[lifecycleStatus],
    cssClass: LIFECYCLE_CSS[lifecycleStatus],
    lifecycleStatus,
  };
}

export function getAllowedPlannerActions(
  hole: SavedHoleProject,
  library: HoleLibrary
): PlannerActionId[] {
  if (!isPlannerCreatedHole(hole)) return ["open"];

  const status = plannerStatus(hole);
  const actions: PlannerActionId[] = ["open", "review", "export"];

  if (status !== "archived") {
    actions.push("duplicate");
  }

  if (status === "approved" || status === "active" || status === "completed") {
    actions.push("create-revision");
  }

  if (status === "planned") {
    actions.push("approve");
  }

  if (status === "approved") {
    actions.push("activate");
  }

  if (status === "active") {
    actions.push("complete");
  }

  if (status !== "archived") {
    actions.push("archive");
  }

  void library;
  return [...new Set(actions)];
}

export const PLANNER_ACTION_LABELS: Record<PlannerActionId, string> = {
  open: "Open",
  review: "Review",
  duplicate: "Duplicate",
  "create-revision": "Create revision",
  approve: "Approve",
  activate: "Activate",
  complete: "Complete",
  archive: "Archive",
  export: "Export",
};
