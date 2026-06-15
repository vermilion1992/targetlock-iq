import { kickoffStationFromMother } from "./branch-program";
import { buildActualVsLockedPlanReport } from "./actual-vs-plan";
import { buildStations } from "./desurvey";
import { findHole, upsertHole, type HoleLibrary } from "./hole-library";
import { resolvePlanLockStatusWithApproval } from "./plan-lock";
import { isPlannerCreatedHole, plannerStatus } from "./planner-status";
import type {
  PlannerHoleSummary,
  PlannerPlanStatus,
  PlannerPlanType,
  PlannerProgram,
  PlannerRelationshipNode,
} from "./planner-types";
import { PLANNER_STATUSES } from "./planner-types";
import type { SavedHoleProject } from "./storage";

export function listPlannerHoles(
  library: HoleLibrary,
  opts: { includeArchived?: boolean } = {}
): SavedHoleProject[] {
  const { includeArchived = false } = opts;
  return library.holes.filter((h) => {
    if (!isPlannerCreatedHole(h)) return false;
    if (!includeArchived && plannerStatus(h) === "archived") return false;
    return true;
  });
}

export function plannerPlanType(hole: SavedHoleProject): PlannerPlanType {
  if (hole.plannerMeta?.planType) return hole.plannerMeta.planType;
  if (hole.holeRole === "daughter") return "daughter";
  return "standard";
}

function emptyStatusCounts(): Record<PlannerPlanStatus, number> {
  return PLANNER_STATUSES.reduce(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    {} as Record<PlannerPlanStatus, number>
  );
}

export function deriveProgramStatus(
  holes: SavedHoleProject[]
): PlannerPlanStatus {
  const nonArchived = holes.filter((h) => plannerStatus(h) !== "archived");
  if (!nonArchived.length) return "archived";
  if (nonArchived.some((h) => plannerStatus(h) === "active")) return "active";
  if (nonArchived.some((h) => plannerStatus(h) === "draft")) return "draft";
  if (nonArchived.every((h) => plannerStatus(h) === "completed")) {
    return "completed";
  }
  if (nonArchived.every((h) => plannerStatus(h) === "approved")) {
    return "approved";
  }
  if (
    nonArchived.some(
      (h) =>
        plannerStatus(h) === "approved" || plannerStatus(h) === "planned"
    )
  ) {
    return "planned";
  }
  return "planned";
}

function programKey(hole: SavedHoleProject): string {
  return (
    hole.plannerMeta?.programId ??
    hole.programId ??
    hole.plannerMeta?.programName ??
    "unassigned"
  );
}

function programName(hole: SavedHoleProject): string {
  return (
    hole.plannerMeta?.programName ??
    hole.siteName ??
    "Unassigned"
  );
}

export function derivePlannerPrograms(library: HoleLibrary): PlannerProgram[] {
  const holes = listPlannerHoles(library, { includeArchived: true });
  const groups = new Map<string, SavedHoleProject[]>();

  for (const hole of holes) {
    const key = programKey(hole);
    const list = groups.get(key) ?? [];
    list.push(hole);
    groups.set(key, list);
  }

  return [...groups.entries()].map(([key, groupHoles]) => {
    const counts = emptyStatusCounts();
    for (const h of groupHoles) {
      counts[plannerStatus(h)] += 1;
    }
    const warnings = collectProgramWarnings(groupHoles, library);
    return {
      programId: groupHoles[0]?.plannerMeta?.programId ?? key,
      name: programName(groupHoles[0]!),
      siteName: groupHoles[0]?.siteName,
      status: deriveProgramStatus(groupHoles),
      holeCount: groupHoles.filter((h) => plannerStatus(h) !== "archived")
        .length,
      countsByStatus: counts,
      warnings,
    };
  });
}

export function holesInProgram(
  library: HoleLibrary,
  programId: string,
  includeArchived = false
): SavedHoleProject[] {
  return listPlannerHoles(library, { includeArchived }).filter(
    (h) =>
      (h.plannerMeta?.programId ?? h.programId ?? "unassigned") === programId
  );
}

export function collectPlannerWarnings(
  hole: SavedHoleProject,
  library: HoleLibrary
): string[] {
  const warnings: string[] = [];
  const meta = hole.plannerMeta;
  const type = plannerPlanType(hole);

  if (type === "standard" || type === "import") {
    if (!meta?.collar && meta?.coordinateMode !== "collar-relative") {
      warnings.push("Missing collar coordinates.");
    }
    if (type === "standard" && !meta?.collar && meta?.coordinateMode === "collar-relative") {
      const first = hole.planRecords[0];
      if (!first) warnings.push("Missing collar / kickoff station.");
    }
  }

  if (type === "daughter") {
    if (!hole.parentHoleId) {
      warnings.push("Daughter plan missing mother hole reference.");
    } else {
      const mother = findHole(library, hole.parentHoleId);
      if (!mother) {
        warnings.push("Missing mother hole in library.");
      } else if (hole.kickoffMd !== undefined) {
        const kickoff = kickoffStationFromMother(
          mother.actualRecords,
          hole.kickoffMd
        );
        if (!kickoff) {
          warnings.push(
            "Daughter kickoff MD is outside mother actual survey range."
          );
        }
      }
    }
    if (hole.kickoffMd === undefined) {
      warnings.push("Missing daughter kickoff MD.");
    }
  }

  if (!hole.planRecords.length) {
    warnings.push("Plan has no planned survey stations.");
  }

  if (!hole.target?.md && hole.planRecords.length === 0) {
    warnings.push("Missing target definition.");
  }

  if (
    meta?.coordinateMode === "grid" &&
    !meta.collar?.easting &&
    meta.collar?.easting !== 0
  ) {
    warnings.push("Grid mode requires collar easting/northing metadata.");
  }

  if (
    meta?.coordinateMode === "gps" &&
    (meta.collar?.latitude === undefined || meta.collar?.longitude === undefined)
  ) {
    warnings.push("GPS mode requires latitude/longitude metadata.");
  }

  if (plannerStatus(hole) === "active" && hole.actualRecords.length <= 1) {
    warnings.push("Active plan has no actual survey records yet.");
  }

  // Mirrors the dashboard's missing-declination reference warning: a magnetic
  // plan without a site declination cannot be rotated correctly on handoff.
  if (
    meta?.northReference === "magnetic" &&
    !Number.isFinite(meta?.projectCoordinateSystem?.magneticDeclinationDeg)
  ) {
    warnings.push(
      "Magnetic North selected but no declination entered. Calculations may be incorrect."
    );
  }

  const programHoles = hole.plannerMeta?.programId
    ? holesInProgram(library, hole.plannerMeta.programId, true)
    : [];
  const dupes = programHoles.filter(
    (h) =>
      h.holeId !== hole.holeId &&
      h.holeName.toLowerCase() === hole.holeName.toLowerCase() &&
      plannerStatus(h) !== "archived"
  );
  if (dupes.length) {
    warnings.push(`Duplicate hole name "${hole.holeName}" in same program.`);
  }

  // Clearance and map comparisons assume one north reference per program;
  // mixing grid/true/magnetic silently misrotates holes relative to each other.
  const northRefs = new Set(
    programHoles
      .filter((h) => plannerStatus(h) !== "archived")
      .map((h) => h.plannerMeta?.northReference)
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
  );
  if (northRefs.size > 1) {
    warnings.push(
      `Program mixes north references (${[...northRefs].sort().join(", ")}) — cross-hole clearance and map comparisons assume a single reference.`
    );
  }

  return warnings;
}

function collectProgramWarnings(
  holes: SavedHoleProject[],
  library: HoleLibrary
): string[] {
  const warnings: string[] = [];
  for (const hole of holes) {
    if (plannerStatus(hole) === "archived") continue;
    warnings.push(...collectPlannerWarnings(hole, library));
  }
  return [...new Set(warnings)];
}

export function plannerHoleSummary(
  hole: SavedHoleProject,
  library: HoleLibrary
): PlannerHoleSummary {
  const type = plannerPlanType(hole);
  const stations = buildStations(hole.planRecords);
  const peakDls = stations.reduce((max, s) => Math.max(max, s.dls), 0);
  const maxDlsLimit = hole.target?.maxDls ?? 3;

  let collarOrKickoff = "—";
  if (type === "daughter" && hole.kickoffMd !== undefined) {
    collarOrKickoff = `KO MD ${hole.kickoffMd.toFixed(0)} m`;
  } else if (hole.plannerMeta?.collar) {
    const c = hole.plannerMeta.collar;
    collarOrKickoff = `E ${c.easting.toFixed(1)} N ${c.northing.toFixed(1)}`;
  } else if (hole.planRecords[0]) {
    collarOrKickoff = `MD ${hole.planRecords[0]!.md.toFixed(0)} m`;
  }

  const plannedTd =
    hole.planRecords.length > 0
      ? hole.planRecords[hole.planRecords.length - 1]!.md
      : null;

  const status = plannerStatus(hole);
  let executionFields: Pick<
    PlannerHoleSummary,
    | "actualSurveyCount"
    | "latestActualMd"
    | "latestOffset"
    | "trackingStatus"
    | "executionState"
    | "lockStatus"
  > = {};

  if (status === "active" || status === "completed") {
    const avp = buildActualVsLockedPlanReport(hole, { library });
    executionFields = {
      actualSurveyCount: hole.actualRecords.length,
      latestActualMd: avp.latestActualMd,
      latestOffset: avp.latestPlanOffsetM,
      trackingStatus: avp.status,
      executionState: hole.plannerMeta?.executionStatus?.state,
      lockStatus: resolvePlanLockStatusWithApproval(hole, library).state,
    };
  }

  return {
    holeId: hole.holeId,
    holeName: hole.holeName,
    planType: type,
    programId: hole.plannerMeta?.programId ?? hole.programId,
    programName: hole.plannerMeta?.programName ?? hole.siteName,
    status,
    collarOrKickoff,
    targetMd: hole.target?.md ?? plannedTd,
    plannedTd,
    stationCount: hole.planRecords.length,
    maxDls: stations.length ? peakDls : null,
    updatedAt: hole.updatedAt,
    warnings: collectPlannerWarnings(hole, library),
    planRevision: hole.plannerMeta?.planRevision ?? 1,
    completedAt:
      hole.plannerMeta?.completionSnapshot?.completedAt ??
      hole.plannerMeta?.completedAt,
    nextRevisionHoleId: hole.plannerMeta?.nextRevisionHoleId,
    ...executionFields,
  };
}

export function buildRelationshipTree(
  programHoles: SavedHoleProject[],
  library: HoleLibrary
): PlannerRelationshipNode[] {
  const active = programHoles.filter((h) => plannerStatus(h) !== "archived");
  const daughters = active.filter((h) => plannerPlanType(h) === "daughter");
  const standards = active.filter((h) => plannerPlanType(h) !== "daughter");

  const nodeFor = (hole: SavedHoleProject): PlannerRelationshipNode => ({
    holeId: hole.holeId,
    holeName: hole.holeName,
    planType: plannerPlanType(hole) === "daughter" ? "daughter" : "standard",
    status: plannerStatus(hole),
    children: [],
    warning: collectPlannerWarnings(hole, library).find((w) =>
      w.includes("mother")
    ),
  });

  const roots: PlannerRelationshipNode[] = standards.map((h) => {
    const node = nodeFor(h);
    node.children = daughters
      .filter((d) => d.parentHoleId === h.holeId)
      .map((d) => nodeFor(d));
    return node;
  });

  const assignedDaughterIds = new Set(
    roots.flatMap((r) => r.children.map((c) => c.holeId))
  );

  for (const daughter of daughters) {
    if (assignedDaughterIds.has(daughter.holeId)) continue;
    const node = nodeFor(daughter);
    if (!daughter.parentHoleId) {
      node.warning = "Missing mother hole reference.";
    } else {
      const mother = findHole(library, daughter.parentHoleId);
      if (!mother) {
        node.warning = "Missing mother hole in library.";
      } else {
        node.warning = `Mother "${mother.holeName}" not in this program.`;
      }
    }
    roots.push(node);
  }

  return roots;
}

export function assignProgramToHoles(
  library: HoleLibrary,
  holeIds: string[],
  programId: string,
  programName: string
): HoleLibrary | null {
  let next = library;
  for (const holeId of holeIds) {
    const hole = findHole(next, holeId);
    if (!hole?.plannerMeta) continue;
    next = upsertHole(next, {
      ...hole,
      programId,
      plannerMeta: {
        ...hole.plannerMeta,
        programId,
        programName,
      },
      updatedAt: new Date().toISOString(),
    });
  }
  return next;
}

export function renameProgram(
  library: HoleLibrary,
  programId: string,
  newName: string
): HoleLibrary | null {
  const holes = holesInProgram(library, programId, true);
  if (!holes.length) return null;
  return assignProgramToHoles(
    library,
    holes.map((h) => h.holeId),
    programId,
    newName.trim()
  );
}

export function archiveProgram(
  library: HoleLibrary,
  programId: string
): { library: HoleLibrary; count: number } | null {
  const holes = holesInProgram(library, programId, true).filter(
    (h) => plannerStatus(h) !== "archived"
  );
  if (!holes.length) return null;

  let next = library;
  for (const hole of holes) {
    const updated = {
      ...hole,
      plannerMeta: hole.plannerMeta
        ? { ...hole.plannerMeta, status: "archived" as const }
        : hole.plannerMeta,
      updatedAt: new Date().toISOString(),
    };
    next = upsertHole(next, updated);
  }
  return { library: next, count: holes.length };
}
