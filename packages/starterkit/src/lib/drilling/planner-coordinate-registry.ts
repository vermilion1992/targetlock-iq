import {
  gridTargetDisplay,
  normalizePlannerCollar,
  validateProjectCoordinateInputs,
} from "./coordinate-system";
import { findHole, type HoleLibrary } from "./hole-library";
import { kickoffStationFromMother } from "./branch-program";
import {
  collectPlannerWarnings,
  holesInProgram,
  plannerPlanType,
} from "./planner-program";
import { plannerStatus } from "./planner-status";
import type {
  PlannerCollarSource,
  PlannerCoordinateStatus,
  PlannerCoordinateMode,
} from "./planner-types";
import type { SavedHoleProject } from "./storage";

export const GPS_COORDINATE_HONESTY_WARNING =
  "GPS metadata stored. Grid/local planning requires verified project coordinates.";

export type PlannerCollarRow = {
  holeId: string;
  holeName: string;
  program: string;
  planType: string;
  status: string;
  easting: number | null;
  northing: number | null;
  elevation: number | null;
  latitude: number | null;
  longitude: number | null;
  coordinateMode: PlannerCoordinateMode;
  northReference: string;
  coordinateStatus: PlannerCoordinateStatus;
  collarSource: PlannerCollarSource;
};

export type PlannerTargetRow = {
  holeId: string;
  holeName: string;
  targetMd: number | null;
  targetEasting: number | null;
  targetNorthing: number | null;
  targetElevation: number | null;
  localE: number;
  localN: number;
  localD: number;
  tolerance: number;
  coordinateStatus: PlannerCoordinateStatus;
};

export type PlannerDaughterKickoffRow = {
  holeId: string;
  holeName: string;
  motherHoleId: string;
  motherHoleName: string;
  kickoffMd: number | null;
  kickoffE: number | null;
  kickoffN: number | null;
  kickoffD: number | null;
  kickoffGridE: number | null;
  kickoffGridN: number | null;
  kickoffGridElevation: number | null;
  kickoffDip: number | null;
  kickoffAzimuth: number | null;
  motherSurveyMissing: boolean;
  warning?: string;
};

export function inferCollarSource(hole: SavedHoleProject): PlannerCollarSource {
  const stored = hole.plannerMeta?.collarSource;
  if (stored) return stored;

  const planType = plannerPlanType(hole);
  if (planType === "import") return "imported";
  if (planType === "daughter" && !normalizePlannerCollar(hole.plannerMeta?.collar)) {
    return "daughter_kickoff";
  }
  if (normalizePlannerCollar(hole.plannerMeta?.collar)) return "manual";
  return "generated";
}

export function evaluateCollarCoordinateStatus(
  hole: SavedHoleProject
): PlannerCoordinateStatus {
  const meta = hole.plannerMeta;
  const mode = meta?.coordinateMode ?? "collar-relative";
  const collar = normalizePlannerCollar(meta?.collar);
  const planType = plannerPlanType(hole);

  if (mode === "collar-relative") {
    return "complete";
  }

  if (collar) {
    const hasGps =
      collar.latitude !== undefined && collar.longitude !== undefined;
    const hasGrid =
      Number.isFinite(collar.easting) &&
      Number.isFinite(collar.northing) &&
      Number.isFinite(collar.elevation);

    if (mode === "grid" && hasGrid) return "complete";
    if (mode === "gps" && hasGps && hasGrid) return "complete";
    if (mode === "gps" && hasGps) return "partial";
    if (hasGrid) return "complete";
    return "partial";
  }

  if (planType === "daughter" && hole.kickoffMd !== undefined) {
    return "partial";
  }

  if (mode === "grid" || mode === "gps") return "missing";
  return "missing";
}

export function evaluateTargetCoordinateStatus(
  hole: SavedHoleProject
): PlannerCoordinateStatus {
  if (!hole.target) return "missing";

  const hasLocal =
    Number.isFinite(hole.target.e) &&
    Number.isFinite(hole.target.n) &&
    Number.isFinite(hole.target.d);

  if (!hasLocal) return "missing";

  const mode = hole.plannerMeta?.coordinateMode ?? "collar-relative";
  const inputMode = hole.plannerMeta?.targetInputMode;

  if (mode === "collar-relative" || inputMode === "collar-relative") {
    return "complete";
  }

  if (inputMode === "md-offset" && hole.target.md !== undefined) {
    return "complete";
  }

  const grid = gridTargetDisplay(hole);
  if (grid) return "complete";

  if (mode === "grid" || inputMode === "grid") return "partial";

  return hasLocal ? "complete" : "partial";
}

export function shouldShowGpsHonestyWarning(
  hole: SavedHoleProject,
  library: HoleLibrary
): boolean {
  const meta = hole.plannerMeta;
  const pcs = meta?.projectCoordinateSystem;
  const collar = meta?.collar;

  const hasGpsCollar =
    collar?.latitude !== undefined && collar?.longitude !== undefined;
  const pcsGps = pcs?.mode === "gps";
  const hasEpsg = Boolean(pcs?.epsgCode?.trim());

  return (hasGpsCollar || pcsGps) && !hasEpsg;
}

export function evaluateCoordinateWarnings(
  hole: SavedHoleProject,
  library: HoleLibrary
): string[] {
  const warnings = [...collectPlannerWarnings(hole, library)];

  const programId = hole.plannerMeta?.programId;
  if (programId) {
    const programHoles = holesInProgram(library, programId, false);
    const pcs = hole.plannerMeta?.projectCoordinateSystem;
    warnings.push(...validateProjectCoordinateInputs(pcs, programHoles));
  }

  if (shouldShowGpsHonestyWarning(hole, library)) {
    warnings.push(GPS_COORDINATE_HONESTY_WARNING);
  }

  const collarStatus = evaluateCollarCoordinateStatus(hole);
  const targetStatus = evaluateTargetCoordinateStatus(hole);
  if (collarStatus === "missing") {
    warnings.push("Collar coordinates incomplete for selected coordinate mode.");
  }
  if (targetStatus === "missing") {
    warnings.push("Target coordinates incomplete.");
  }

  return [...new Set(warnings)];
}

export function resolveKickoffGridPosition(
  hole: SavedHoleProject,
  library: HoleLibrary
): {
  e: number;
  n: number;
  d: number;
} | null {
  if (plannerPlanType(hole) !== "daughter" || !hole.parentHoleId) return null;

  const mother = findHole(library, hole.parentHoleId);
  if (!mother) return null;

  let kickoffEnu: { e: number; n: number; d: number } | null = null;

  if (hole.kickoffMd !== undefined && mother.actualRecords.length) {
    const kickoff = kickoffStationFromMother(mother.actualRecords, hole.kickoffMd);
    if (kickoff) {
      kickoffEnu = { e: kickoff.e, n: kickoff.n, d: kickoff.d };
    }
  } else if (
    hole.kickoffE !== undefined &&
    hole.kickoffN !== undefined &&
    hole.kickoffD !== undefined
  ) {
    kickoffEnu = { e: hole.kickoffE, n: hole.kickoffN, d: hole.kickoffD };
  }

  if (!kickoffEnu) return null;

  const motherCollar = normalizePlannerCollar(mother.plannerMeta?.collar);
  if (!motherCollar) return null;

  // Grid display position: d is a true elevation / RL (up-positive),
  // i.e. mother collar RL minus kickoff depth below the mother collar.
  return {
    e: kickoffEnu.e + motherCollar.easting,
    n: kickoffEnu.n + motherCollar.northing,
    d: motherCollar.elevation - kickoffEnu.d,
  };
}

export function buildProgramCollarRows(
  library: HoleLibrary,
  programId: string
): PlannerCollarRow[] {
  const holes = holesInProgram(library, programId, false);
  return holes.map((hole) => {
    const meta = hole.plannerMeta!;
    const collar = normalizePlannerCollar(meta.collar);
    return {
      holeId: hole.holeId,
      holeName: hole.holeName,
      program: meta.programName ?? hole.siteName ?? "",
      planType: plannerPlanType(hole),
      status: plannerStatus(hole),
      easting: collar?.easting ?? null,
      northing: collar?.northing ?? null,
      elevation: collar?.elevation ?? null,
      latitude: collar?.latitude ?? null,
      longitude: collar?.longitude ?? null,
      coordinateMode: meta.coordinateMode,
      northReference: meta.northReference,
      coordinateStatus: evaluateCollarCoordinateStatus(hole),
      collarSource: inferCollarSource(hole),
    };
  });
}

export function buildProgramTargetRows(
  library: HoleLibrary,
  programId: string
): PlannerTargetRow[] {
  const holes = holesInProgram(library, programId, false);
  return holes.map((hole) => {
    const grid = gridTargetDisplay(hole);
    return {
      holeId: hole.holeId,
      holeName: hole.holeName,
      targetMd: hole.target.md ?? null,
      targetEasting: grid?.e ?? null,
      targetNorthing: grid?.n ?? null,
      targetElevation: grid?.d ?? null,
      localE: hole.target.e,
      localN: hole.target.n,
      localD: hole.target.d,
      tolerance: hole.target.tolerance,
      coordinateStatus: evaluateTargetCoordinateStatus(hole),
    };
  });
}

export function buildDaughterKickoffRows(
  library: HoleLibrary,
  programId: string
): PlannerDaughterKickoffRow[] {
  const holes = holesInProgram(library, programId, false).filter(
    (h) => plannerPlanType(h) === "daughter"
  );

  return holes.map((hole) => {
    const motherId = hole.parentHoleId ?? "";
    const mother = motherId ? findHole(library, motherId) : null;
    const motherSurveyMissing = !mother?.actualRecords.length;
    const gridKickoff = resolveKickoffGridPosition(hole, library);

    let warning: string | undefined;
    if (motherSurveyMissing) {
      warning = "Mother hole has no actual survey path.";
    } else if (!gridKickoff && mother && normalizePlannerCollar(mother.plannerMeta?.collar)) {
      warning = "Kickoff grid position could not be resolved.";
    }

    return {
      holeId: hole.holeId,
      holeName: hole.holeName,
      motherHoleId: motherId,
      motherHoleName: hole.parentHoleName ?? mother?.holeName ?? motherId,
      kickoffMd: hole.kickoffMd ?? null,
      kickoffE: hole.kickoffE ?? null,
      kickoffN: hole.kickoffN ?? null,
      kickoffD: hole.kickoffD ?? null,
      kickoffGridE: gridKickoff?.e ?? null,
      kickoffGridN: gridKickoff?.n ?? null,
      kickoffGridElevation: gridKickoff?.d ?? null,
      kickoffDip: hole.kickoffDip ?? null,
      kickoffAzimuth: hole.kickoffAzimuth ?? null,
      motherSurveyMissing,
      warning,
    };
  });
}
