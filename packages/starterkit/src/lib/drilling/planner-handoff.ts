import { findHole, type HoleLibrary } from "./hole-library";
import { resolvePlannerApprovalStatus } from "./planner-approval";
import { checkHoleDrillability } from "./planner-drillability";
import { canApprovePlannerHole, resolveProgramQaSettings } from "./planner-qa";
import { plannerHoleSummary } from "./planner-program";
import { evaluateCoordinateWarnings } from "./planner-coordinate-registry";
import { buildCoordinateCardData } from "./planner-spatial";
import { plannerStatus } from "./planner-status";
import type { SavedHoleProject } from "./storage";

export type PlannerHandoffCheckItem = {
  id: string;
  label: string;
  passed: boolean;
  required: boolean;
  detail?: string;
};

export type PlannerHandoffReadiness = {
  ready: boolean;
  items: PlannerHandoffCheckItem[];
  blockers: string[];
};

export type EvaluateHandoffOpts = {
  coordinateMetadataReviewed?: boolean;
  coordinateWarningsReviewed?: boolean;
  packageBackupExported?: boolean;
  handoffBypassApproval?: boolean;
  handoffBypassSignoffNote?: boolean;
};

export function evaluateHandoffReadiness(
  hole: SavedHoleProject,
  library: HoleLibrary,
  opts: EvaluateHandoffOpts = {}
): PlannerHandoffReadiness {
  const programId = hole.plannerMeta?.programId;
  const settings = programId
    ? resolveProgramQaSettings(library, programId)
    : resolveProgramQaSettings(library, "");
  const approval = resolvePlannerApprovalStatus(hole, library);
  const approveGate = canApprovePlannerHole(hole, library, settings);
  const drillability = checkHoleDrillability(hole, library, settings);
  const hasTarget =
    hole.target !== undefined &&
    (hole.target.md !== undefined ||
      hole.planRecords.length > 0 ||
      Number.isFinite(hole.target.e));

  const coordinateWarnings = evaluateCoordinateWarnings(hole, library);

  const items: PlannerHandoffCheckItem[] = [
    {
      id: "survey_stations",
      label: "Plan has survey stations",
      passed: hole.planRecords.length > 1,
      required: true,
      detail:
        hole.planRecords.length > 1
          ? `${hole.planRecords.length} stations`
          : "At least two survey stations required",
    },
    {
      id: "target_exists",
      label: "Target exists",
      passed: hasTarget,
      required: true,
      detail: hasTarget ? "Target configured" : "Missing target definition",
    },
    {
      id: "qa_hard_errors",
      label: "QA hard errors clear",
      passed: approveGate.blockers.length === 0,
      required: true,
      detail:
        approveGate.blockers.length === 0
          ? "No blocking QA errors"
          : approveGate.blockers.join("; "),
    },
    {
      id: "coordinate_metadata",
      label: "Coordinate metadata reviewed",
      passed: opts.coordinateMetadataReviewed === true,
      required: true,
      detail: opts.coordinateMetadataReviewed
        ? "Reviewer confirmed coordinate metadata"
        : "Confirm coordinate metadata before handoff",
    },
    {
      id: "coordinate_warnings",
      label: "Coordinate warnings reviewed",
      passed:
        coordinateWarnings.length === 0 ||
        opts.coordinateWarningsReviewed === true,
      required: coordinateWarnings.length > 0,
      detail:
        coordinateWarnings.length === 0
          ? "No coordinate warnings"
          : opts.coordinateWarningsReviewed
            ? "Coordinate warnings acknowledged"
            : coordinateWarnings.slice(0, 2).join("; "),
    },
    {
      id: "approval_current",
      label: "Approval current or intentionally bypassed",
      passed:
        approval.state === "current" || opts.handoffBypassApproval === true,
      required: true,
      detail:
        approval.state === "current"
          ? approval.detail
          : opts.handoffBypassApproval
            ? "Approval bypass acknowledged"
            : approval.state === "stale"
              ? "Approval stale — re-approve or bypass"
              : "Plan not approved",
    },
    {
      id: "signoff_note",
      label: "Contractor / geologist sign-off note captured",
      passed:
        Boolean(hole.plannerMeta?.plannerNotes?.trim()) ||
        opts.handoffBypassSignoffNote === true,
      required: true,
      detail: hole.plannerMeta?.plannerNotes?.trim()
        ? "Sign-off note recorded"
        : opts.handoffBypassSignoffNote
          ? "Sign-off note bypass acknowledged"
          : "Add a sign-off note in approval panel",
    },
    {
      id: "package_backup",
      label: "Hole package exported (recommended)",
      passed: opts.packageBackupExported === true,
      required: false,
      detail: opts.packageBackupExported
        ? "Export backup acknowledged"
        : "Recommended before field handoff",
    },
  ];

  const blockers = items
    .filter((item) => item.required && !item.passed)
    .map((item) => item.detail ?? item.label);

  return {
    ready: blockers.length === 0,
    items,
    blockers,
  };
}

export function buildOpenInTargetLockSummary(
  hole: SavedHoleProject,
  library: HoleLibrary
): string {
  const summary = plannerHoleSummary(hole, library);
  const approval = resolvePlannerApprovalStatus(hole, library);
  const coord = buildCoordinateCardData(hole, library);

  return [
    "TARGETLOCK IQ — PLAN HANDOFF SUMMARY",
    "─".repeat(40),
    `Hole: ${hole.holeName}`,
    `Program: ${hole.plannerMeta?.programName ?? hole.siteName ?? "—"}`,
    `Status: ${plannerStatus(hole)} (R${hole.plannerMeta?.planRevision ?? 1})`,
    `Plan type: ${summary.planType}`,
    `Collar / kickoff: ${summary.collarOrKickoff}`,
    `Target: ${coord.targetLabel}`,
    `Planned TD: ${summary.plannedTd !== null ? `${summary.plannedTd.toFixed(1)} m` : "—"}`,
    `Approval: ${approval.label} — ${approval.detail}`,
    "",
    "Open in TargetLock: /targetlock",
    "Planning support only. Verify before field execution.",
  ].join("\n");
}

export function resolveHandoffHole(
  library: HoleLibrary,
  holeId: string
): SavedHoleProject | null {
  return findHole(library, holeId) ?? null;
}
