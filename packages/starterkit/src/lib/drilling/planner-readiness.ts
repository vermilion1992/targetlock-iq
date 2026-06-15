import {
  evaluateCollarCoordinateStatus,
  evaluateCoordinateWarnings,
  evaluateTargetCoordinateStatus,
} from "./planner-coordinate-registry";
import { resolvePlannerApprovalStatus } from "./planner-approval";
import { plannerPlanType } from "./planner-program";
import {
  buildHoleQaSummary,
  buildProgramQaReport,
  canApprovePlannerHole,
  resolveProgramQaSettings,
} from "./planner-qa";
import { collectPlannerWarnings } from "./planner-program";
import { resolvePlanLockStatusWithApproval } from "./plan-lock";
import { plannerPlanEditBlockedReason } from "./plan-revision";
import { isPlannerCreatedHole, plannerStatus } from "./planner-status";
import type { HoleLibrary } from "./hole-library";
import type { SavedHoleProject } from "./storage";

export type PlanReadinessState =
  | "blocked"
  | "needs-review"
  | "ready"
  | "active"
  | "completed";

export type PlanReadiness = {
  state: PlanReadinessState;
  score: number;
  blockers: string[];
  warnings: string[];
  nextAction: string;
};

export type EvaluatePlanReadinessOpts = {
  coordinateMetadataReviewed?: boolean;
  coordinateWarningsReviewed?: boolean;
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function evaluatePlanReadiness(
  hole: SavedHoleProject,
  library: HoleLibrary,
  opts: EvaluatePlanReadinessOpts = {}
): PlanReadiness {
  if (!isPlannerCreatedHole(hole)) {
    return {
      state: "blocked",
      score: 0,
      blockers: ["Not a planner-created hole."],
      warnings: [],
      nextAction: "Open in TargetLock dashboard.",
    };
  }

  const status = plannerStatus(hole);
  const blockers: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  if (status === "completed") {
    return {
      state: "completed",
      score: 100,
      blockers: [],
      warnings: collectPlannerWarnings(hole, library),
      nextAction: "Export execution evidence or archive.",
    };
  }

  if (status === "active") {
    const lock = resolvePlanLockStatusWithApproval(hole, library);
    if (lock.state === "locked-stale" || lock.state === "plan-changed") {
      warnings.push(lock.detail);
      score -= 25;
    }
    if (hole.actualRecords.length <= 1) {
      warnings.push("No actual surveys recorded yet.");
      score -= 10;
    }
    return {
      state: "active",
      score: clampScore(score),
      blockers: [],
      warnings,
      nextAction: "Open in TargetLock to record actual surveys.",
    };
  }

  const programId = hole.plannerMeta?.programId;
  const settings = programId
    ? resolveProgramQaSettings(library, programId)
    : resolveProgramQaSettings(library, "");
  const approveGate = canApprovePlannerHole(hole, library, settings);

  blockers.push(...approveGate.blockers);
  warnings.push(...approveGate.warnings);
  warnings.push(...collectPlannerWarnings(hole, library));

  const coordinateMode = hole.plannerMeta?.coordinateMode ?? "collar-relative";
  const collarStatus = evaluateCollarCoordinateStatus(hole);
  const targetStatus = evaluateTargetCoordinateStatus(hole);
  const coordWarnings = evaluateCoordinateWarnings(hole, library);
  warnings.push(...coordWarnings);

  if (!hole.plannerMeta?.northReference) {
    blockers.push("North reference is not set on this plan.");
  }

  if (coordinateMode === "grid" || coordinateMode === "gps") {
    if (collarStatus === "missing") {
      blockers.push("Collar coordinates required for grid/GPS coordinate mode.");
    } else if (collarStatus === "partial") {
      warnings.push("Collar coordinates are partial for selected coordinate mode.");
      score -= 8;
    }
  }

  if (targetStatus === "missing") {
    blockers.push("Target coordinates are missing.");
  } else if (targetStatus === "partial") {
    warnings.push("Target coordinates are partial.");
    score -= 5;
  }

  const planType = plannerPlanType(hole);
  if (planType === "daughter") {
    if (!hole.parentHoleId) {
      blockers.push("Daughter hole missing mother reference.");
    } else if (hole.kickoffMd === undefined) {
      blockers.push("Daughter kickoff MD is not resolved.");
    } else {
      const mother = library.holes.find((h) => h.holeId === hole.parentHoleId);
      if (!mother?.actualRecords.length) {
        blockers.push("Mother hole has no actual surveys — daughter kickoff cannot be verified.");
      }
    }
  }

  if (coordWarnings.length > 0 && opts.coordinateWarningsReviewed !== true) {
    warnings.push("Coordinate warnings present — review before approval.");
    score -= 5;
  }

  if (hole.planRecords.length <= 1) {
    blockers.push("Plan needs at least two survey stations.");
  }

  if (
    !hole.target &&
    hole.planRecords.length === 0
  ) {
    blockers.push("Missing target definition.");
  }

  if (programId) {
    const report = buildProgramQaReport(library, programId, settings);
    const qa = report ? buildHoleQaSummary(hole.holeId, report) : null;
    if (qa?.badge === "blocked") {
      blockers.push("QA blocked — resolve hard errors.");
    } else if (qa?.badge === "risk") {
      warnings.push("QA clearance risk flagged.");
      score -= 15;
    } else if (qa?.badge === "watch") {
      warnings.push("QA watch items present.");
      score -= 8;
    }
  }

  score -= blockers.length * 20;
  score -= warnings.length * 5;

  const approval = resolvePlannerApprovalStatus(hole, library);
  if (status === "approved") {
    if (approval.state === "stale") {
      blockers.push("Approval stale — re-approve before activation.");
      score -= 30;
    }
    if (opts.coordinateMetadataReviewed !== true) {
      warnings.push("Coordinate metadata not yet reviewed.");
      score -= 5;
    }
    const editBlock = plannerPlanEditBlockedReason(hole);
    if (editBlock) {
      void editBlock;
    }
    if (blockers.length) {
      return {
        state: "blocked",
        score: clampScore(score),
        blockers,
        warnings,
        nextAction: "Resolve blockers before activation.",
      };
    }
    return {
      state: warnings.length ? "needs-review" : "ready",
      score: clampScore(score),
      blockers: [],
      warnings,
      nextAction: warnings.length
        ? "Review warnings, then activate for execution."
        : "Activate plan and open in TargetLock.",
    };
  }

  if (status === "planned") {
    if (blockers.length) {
      return {
        state: "blocked",
        score: clampScore(score),
        blockers,
        warnings,
        nextAction: "Fix QA errors, then approve.",
      };
    }
    return {
      state: approveGate.requiresConfirmation ? "needs-review" : "ready",
      score: clampScore(score),
      blockers: [],
      warnings,
      nextAction: approveGate.requiresConfirmation
        ? "Review QA warnings, then approve."
        : "Approve plan for handoff.",
    };
  }

  if (status === "draft") {
    return {
      state: blockers.length ? "blocked" : "needs-review",
      score: clampScore(Math.max(score, 20)),
      blockers,
      warnings,
      nextAction: "Complete create wizard and publish plan.",
    };
  }

  if (status === "archived") {
    return {
      state: "completed",
      score: 50,
      blockers: [],
      warnings: ["Plan is archived."],
      nextAction: "Duplicate or create revision to reuse.",
    };
  }

  return {
    state: blockers.length ? "blocked" : "needs-review",
    score: clampScore(score),
    blockers,
    warnings,
    nextAction: "Review plan status.",
  };
}
