import { resolvePlannerApprovalStatus } from "./planner-approval";
import {
  buildProgramQaReport,
  resolveProgramQaSettings,
} from "./planner-qa";
import { evaluatePlanReadiness } from "./planner-readiness";
import {
  derivePlannerPrograms,
  holesInProgram,
  plannerHoleSummary,
} from "./planner-program";
import {
  getAllowedPlannerActions,
  getPlannerStatusDisplay,
  PLANNER_ACTION_LABELS,
  type PlannerActionId,
} from "./planner-status-display";
import { isPlanLocked } from "./plan-lock";
import { isPlannerCreatedHole, plannerStatus } from "./planner-status";
import type { PlannerPlanStatus } from "./planner-types";
import type { HoleLibrary } from "./hole-library";
import type { SavedHoleProject } from "./storage";

export type PlannerStatusCounts = Record<PlannerPlanStatus, number> & {
  staleApprovals: number;
  qaRisks: number;
  qaBlocked: number;
  revised: number;
};

export type PlannerNeedsAttentionItem = {
  holeId: string;
  holeName: string;
  reason: string;
  suggestedAction: string;
  actionId: PlannerActionId;
  priority: number;
};

export type PlannerRecentEvent = {
  id: string;
  holeId: string;
  holeName: string;
  label: string;
  timestamp: string;
  kind:
    | "approved"
    | "activated"
    | "completed"
    | "revision"
    | "published"
    | "qa-risk";
};

export type ProgramReadinessGate = {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
};

export type ProgramReadiness = {
  score: number;
  state: "blocked" | "needs-review" | "ready" | "active" | "completed";
  gates: ProgramReadinessGate[];
  blockers: string[];
  warnings: string[];
};

function emptyCounts(): PlannerStatusCounts {
  return {
    draft: 0,
    planned: 0,
    approved: 0,
    active: 0,
    completed: 0,
    archived: 0,
    staleApprovals: 0,
    qaRisks: 0,
    qaBlocked: 0,
    revised: 0,
  };
}

export function buildProgramStatusCounts(
  library: HoleLibrary,
  programId: string,
  includeArchived = false
): PlannerStatusCounts {
  const holes = holesInProgram(library, programId, includeArchived);
  const counts = emptyCounts();

  for (const hole of holes) {
    const status = plannerStatus(hole);
    counts[status] += 1;

    const display = getPlannerStatusDisplay(hole, library);
    if (display.status === "stale") counts.staleApprovals += 1;
    if (hole.plannerMeta?.executionStatus?.state === "revised") {
      counts.revised += 1;
    }
  }

  const report = buildProgramQaReport(
    library,
    programId,
    resolveProgramQaSettings(library, programId)
  );
  if (report) {
    counts.qaRisks = report.programSummary.riskCount;
    counts.qaBlocked = report.programSummary.blockedHoleCount;
  }

  return counts;
}

export function buildNeedsAttentionList(
  library: HoleLibrary,
  programId: string
): PlannerNeedsAttentionItem[] {
  const holes = holesInProgram(library, programId, false);
  const items: PlannerNeedsAttentionItem[] = [];

  for (const hole of holes) {
    const readiness = evaluatePlanReadiness(hole, library);
    const display = getPlannerStatusDisplay(hole, library);
    const summary = plannerHoleSummary(hole, library);

    if (readiness.state === "blocked" && readiness.blockers.length) {
      items.push({
        holeId: hole.holeId,
        holeName: hole.holeName,
        reason: readiness.blockers[0]!,
        suggestedAction: readiness.nextAction,
        actionId: "review",
        priority: 0,
      });
      continue;
    }

    if (display.status === "stale") {
      items.push({
        holeId: hole.holeId,
        holeName: hole.holeName,
        reason: "Approval stale — plan or QA changed since sign-off.",
        suggestedAction: "Re-approve or create revision.",
        actionId: "approve",
        priority: 1,
      });
    }

    if (readiness.state === "needs-review" && readiness.warnings.length) {
      items.push({
        holeId: hole.holeId,
        holeName: hole.holeName,
        reason: readiness.warnings[0]!,
        suggestedAction: readiness.nextAction,
        actionId: "review",
        priority: 2,
      });
    }

    if (
      summary.status === "active" &&
      hole.actualRecords.length <= 1
    ) {
      items.push({
        holeId: hole.holeId,
        holeName: hole.holeName,
        reason: "Active plan — no actual surveys yet.",
        suggestedAction: "Open in TargetLock to record surveys.",
        actionId: "open",
        priority: 3,
      });
    }
  }

  return items.sort((a, b) => a.priority - b.priority);
}

export function buildRecentPlannerEvents(
  library: HoleLibrary,
  programId: string,
  limit = 12
): PlannerRecentEvent[] {
  const holes = holesInProgram(library, programId, true);
  const events: PlannerRecentEvent[] = [];

  for (const hole of holes) {
    const meta = hole.plannerMeta;
    if (!meta) continue;

    if (meta.approvedAt) {
      events.push({
        id: `${hole.holeId}-approved`,
        holeId: hole.holeId,
        holeName: hole.holeName,
        label: `Approved by ${meta.approvedBy ?? "reviewer"}`,
        timestamp: meta.approvedAt,
        kind: "approved",
      });
    }
    if (meta.activatedAt) {
      events.push({
        id: `${hole.holeId}-activated`,
        holeId: hole.holeId,
        holeName: hole.holeName,
        label: "Activated for execution",
        timestamp: meta.activatedAt,
        kind: "activated",
      });
    }
    if (meta.completedAt) {
      events.push({
        id: `${hole.holeId}-completed`,
        holeId: hole.holeId,
        holeName: hole.holeName,
        label: "Marked completed",
        timestamp: meta.completedAt,
        kind: "completed",
      });
    }
    if (meta.plannedAt) {
      events.push({
        id: `${hole.holeId}-published`,
        holeId: hole.holeId,
        holeName: hole.holeName,
        label: "Plan published",
        timestamp: meta.plannedAt,
        kind: "published",
      });
    }
    if (meta.executionStatus?.revisedAt) {
      events.push({
        id: `${hole.holeId}-revision`,
        holeId: hole.holeId,
        holeName: hole.holeName,
        label: "Superseded by revision",
        timestamp: meta.executionStatus.revisedAt,
        kind: "revision",
      });
    }
  }

  const report = buildProgramQaReport(
    library,
    programId,
    resolveProgramQaSettings(library, programId)
  );
  if (report && report.programSummary.riskCount > 0) {
    events.push({
      id: `${programId}-qa-risk`,
      holeId: "",
      holeName: "Program QA",
      label: `${report.programSummary.riskCount} clearance risk(s) detected`,
      timestamp: report.generatedAt,
      kind: "qa-risk",
    });
  }

  return events
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, limit);
}

export function evaluateProgramReadiness(
  library: HoleLibrary,
  programId: string,
  opts: { coordinateMetadataReviewed?: boolean; packageExported?: boolean } = {}
): ProgramReadiness {
  const holes = holesInProgram(library, programId, false);
  const counts = buildProgramStatusCounts(library, programId, false);
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!holes.length) {
    return {
      score: 0,
      state: "blocked",
      gates: [],
      blockers: ["No planner holes in program."],
      warnings: [],
    };
  }

  const readinessScores = holes.map((h) =>
    evaluatePlanReadiness(h, library, opts)
  );
  const avgScore =
    readinessScores.reduce((sum, r) => sum + r.score, 0) /
    readinessScores.length;

  for (const r of readinessScores) {
    blockers.push(...r.blockers.slice(0, 1));
    warnings.push(...r.warnings.slice(0, 1));
  }

  const hasActive = counts.active > 0;
  const activeWithLock = holes.filter(
    (h) => plannerStatus(h) === "active" && isPlanLocked(h)
  );

  const gates: ProgramReadinessGate[] = [
    {
      id: "coordinate_metadata",
      label: "Coordinate metadata reviewed",
      passed: opts.coordinateMetadataReviewed === true,
      detail: opts.coordinateMetadataReviewed
        ? "Program coordinates confirmed"
        : "Review program coordinate panel",
    },
    {
      id: "qa_clear",
      label: "QA clear or acknowledged",
      passed: counts.qaBlocked === 0,
      detail:
        counts.qaBlocked === 0
          ? counts.qaRisks
            ? `${counts.qaRisks} risk(s) — review in QA tab`
            : "No blocked holes"
          : `${counts.qaBlocked} blocked hole(s)`,
    },
    {
      id: "approval_current",
      label: "Approval current",
      passed: counts.staleApprovals === 0,
      detail:
        counts.staleApprovals === 0
          ? "No stale approvals"
          : `${counts.staleApprovals} stale approval(s)`,
    },
    {
      id: "package_export",
      label: "Package export available",
      passed: true,
      detail: opts.packageExported
        ? "Export acknowledged"
        : "Export program package before field handoff",
    },
    {
      id: "execution_lock",
      label: "Active execution lock present if drilling",
      passed: !hasActive || activeWithLock.length === counts.active,
      detail: hasActive
        ? `${activeWithLock.length}/${counts.active} active hole(s) locked`
        : "No active drilling",
    },
  ];

  let state: ProgramReadiness["state"] = "needs-review";
  if (counts.completed === holes.length) state = "completed";
  else if (counts.active > 0) state = "active";
  else if (blockers.length || counts.qaBlocked > 0) state = "blocked";
  else if (
    counts.approved > 0 &&
    counts.staleApprovals === 0 &&
    counts.planned === 0 &&
    counts.draft === 0
  ) {
    state = "ready";
  }

  return {
    score: Math.round(avgScore),
    state,
    gates,
    blockers: [...new Set(blockers)].slice(0, 5),
    warnings: [...new Set(warnings)].slice(0, 5),
  };
}

export function resolveDefaultProgramId(library: HoleLibrary): string | null {
  const programs = derivePlannerPrograms(library).filter(
    (p) => p.holeCount > 0
  );
  if (!programs.length) return null;
  const active = programs.find((p) => p.status === "active");
  if (active) return active.programId;
  return programs.sort((a, b) => b.holeCount - a.holeCount)[0]!.programId;
}

export function formatPlannerAction(actionId: PlannerActionId): string {
  return PLANNER_ACTION_LABELS[actionId];
}

export function listProgramHolesForWorkbench(
  library: HoleLibrary,
  programId: string
): SavedHoleProject[] {
  return holesInProgram(library, programId, false).filter(isPlannerCreatedHole);
}

export { getAllowedPlannerActions, getPlannerStatusDisplay };
