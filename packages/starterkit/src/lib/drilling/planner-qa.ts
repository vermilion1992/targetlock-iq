import {
  resolveProgramCoordinateSystem,
  type HoleLibrary,
} from "./hole-library";
import { holesInProgram } from "./planner-program";
import { canTransitionStatus, plannerStatus } from "./planner-status";
import {
  buildClearancePairs,
  clearancePairSelection,
} from "./planner-clearance";
import { checkHoleDrillability } from "./planner-drillability";
import type {
  PlannerClearancePair,
  PlannerHoleQaSummary,
  PlannerQaReport,
  PlannerQaSettings,
  PlannerQaSeverity,
} from "./planner-types";
import type { SavedHoleProject } from "./storage";

export { clearancePairSelection };

export const DEFAULT_PLANNER_QA_SETTINGS: PlannerQaSettings = {
  minHoleSeparationM: 5,
  minMotherDaughterSeparationM: 3,
  minSiblingDaughterSeparationM: 5,
  sampleIntervalM: 10,
  motherDaughterKickoffExclusionM: 15,
  maxDls: 3,
  requireCoordinateMetadataBeforeApproval: false,
  separationFactorWarn: 5,
  separationFactorRisk: 2,
  separationFactorBlock: 1.5,
  uncertaintySigmaFactor: 2,
};

export function resolveProgramQaSettings(
  library: HoleLibrary,
  programId: string
): PlannerQaSettings {
  const holes = holesInProgram(library, programId, true);
  const pcs = resolveProgramCoordinateSystem(holes);
  const stored = pcs?.plannerQa;
  return {
    ...DEFAULT_PLANNER_QA_SETTINGS,
    ...stored,
  };
}

function worstSeverity(
  a: PlannerQaSeverity,
  b: PlannerQaSeverity
): PlannerQaSeverity {
  const order = { risk: 0, watch: 1, ok: 2 };
  return order[a] <= order[b] ? a : b;
}

function badgeFromHole(
  holeId: string,
  drillability: ReturnType<typeof checkHoleDrillability>,
  clearancePairs: PlannerClearancePair[]
): PlannerHoleQaSummary["badge"] {
  if (drillability.hasHardErrors) return "blocked";

  const holePairs = clearancePairs.filter(
    (p) =>
      (p.holeAId === holeId || p.holeBId === holeId) &&
      p.severity !== "ok"
  );

  let worst: PlannerQaSeverity = "ok";
  for (const pair of holePairs) {
    worst = worstSeverity(worst, pair.severity);
  }

  if (worst === "risk") return "risk";
  if (worst === "watch") return "watch";

  if (drillability.issues.some((i) => i.level === "warning")) {
    return "watch";
  }

  return "ok";
}

export function buildProgramQaReport(
  library: HoleLibrary,
  programId: string,
  settings?: PlannerQaSettings
): PlannerQaReport | null {
  const holes = holesInProgram(library, programId, false);
  if (!holes.length) return null;

  const resolved = settings ?? resolveProgramQaSettings(library, programId);
  const clearancePairs = buildClearancePairs(library, programId, resolved);

  const holeSummaries: PlannerHoleQaSummary[] = holes.map((hole) => {
    const drillability = checkHoleDrillability(hole, library, resolved);
    const clearanceRiskCount = clearancePairs.filter(
      (p) =>
        (p.holeAId === hole.holeId || p.holeBId === hole.holeId) &&
        p.severity === "risk"
    ).length;

    return {
      holeId: hole.holeId,
      badge: badgeFromHole(hole.holeId, drillability, clearancePairs),
      drillability: {
        ok: drillability.ok,
        issues: drillability.issues,
      },
      clearanceRiskCount,
    };
  });

  const riskPairs = clearancePairs.filter((p) => p.severity === "risk");
  const watchPairs = clearancePairs.filter((p) => p.severity === "watch");
  const closestClearanceM =
    clearancePairs.length > 0
      ? Math.min(...clearancePairs.map((p) => p.minDistanceM))
      : null;

  const drillabilityIssueCount = holeSummaries.reduce(
    (sum, h) => sum + h.drillability.issues.length,
    0
  );

  return {
    programId,
    generatedAt: new Date().toISOString(),
    settings: resolved,
    clearancePairs,
    holeSummaries,
    programSummary: {
      riskCount: riskPairs.length,
      watchCount: watchPairs.length,
      closestClearanceM,
      drillabilityIssueCount,
      blockedHoleCount: holeSummaries.filter((h) => h.badge === "blocked").length,
    },
  };
}

export function buildHoleQaSummary(
  holeId: string,
  report: PlannerQaReport
): PlannerHoleQaSummary | null {
  return report.holeSummaries.find((h) => h.holeId === holeId) ?? null;
}

export type ApprovePlannerResult = {
  allowed: boolean;
  blockers: string[];
  warnings: string[];
  requiresConfirmation: boolean;
};

export function canApprovePlannerHole(
  hole: SavedHoleProject,
  library: HoleLibrary,
  settings?: PlannerQaSettings
): ApprovePlannerResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const status = plannerStatus(hole);
  if (!canTransitionStatus(status, "approved")) {
    blockers.push(`Plan status "${status}" cannot transition to approved.`);
  }

  const programId = hole.plannerMeta?.programId;
  const resolved =
    settings ??
    (programId
      ? resolveProgramQaSettings(library, programId)
      : DEFAULT_PLANNER_QA_SETTINGS);

  const drillability = checkHoleDrillability(hole, library, resolved);
  for (const issue of drillability.issues) {
    if (issue.level === "error") {
      blockers.push(issue.message);
    } else {
      warnings.push(issue.message);
    }
  }

  if (programId) {
    const report = buildProgramQaReport(library, programId, resolved);
    if (report) {
      const holePairs = report.clearancePairs.filter(
        (p) =>
          (p.holeAId === hole.holeId || p.holeBId === hole.holeId) &&
          p.severity !== "ok"
      );
      const sfBlock = resolved.separationFactorBlock ?? 1.5;
      for (const pair of holePairs) {
        if (pair.separationFactor != null && pair.separationFactor < sfBlock) {
          blockers.push(
            `${pair.message} Separation factor ${pair.separationFactor.toFixed(1)} is below the block threshold (${sfBlock}).`
          );
        } else {
          warnings.push(pair.message);
        }
      }
    }
  }

  const allowed = blockers.length === 0;
  const requiresConfirmation = allowed && warnings.length > 0;

  return {
    allowed,
    blockers,
    warnings,
    requiresConfirmation,
  };
}

export function exportProgramClearanceCsv(report: PlannerQaReport): string {
  const header =
    "hole_a,hole_b,relationship,min_distance_m,md_a,md_b,separation_factor,combined_uncertainty_radius_m,severity,message";
  const rows = report.clearancePairs
    .filter((p) => p.severity !== "ok")
    .map((p) =>
      [
        p.holeAName,
        p.holeBName,
        p.relationship,
        p.minDistanceM.toFixed(2),
        p.mdA.toFixed(1),
        p.mdB.toFixed(1),
        p.separationFactor != null ? p.separationFactor.toFixed(2) : "",
        p.combinedRadiusM != null ? p.combinedRadiusM.toFixed(2) : "",
        p.severity,
        `"${p.message.replace(/"/g, '""')}"`,
      ].join(",")
    );
  return [header, ...rows].join("\n");
}
