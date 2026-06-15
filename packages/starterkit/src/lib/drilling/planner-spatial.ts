import { bounds, makeScale } from "@/components/charts/chart-scale";
import { kickoffStationFromMother } from "./branch-program";
import {
  gridTargetDisplay,
  gridTargetFromCollarRelative,
  normalizePlannerCollar,
  offsetStationsByCollar,
  offsetStationsByKickoff,
  validateProjectCoordinateInputs,
} from "./coordinate-system";
import { buildStations } from "./desurvey";
import {
  findHole,
  resolveProgramCoordinateSystem,
  type HoleLibrary,
} from "./hole-library";
import {
  evaluateCollarCoordinateStatus,
  evaluateCoordinateWarnings,
  evaluateTargetCoordinateStatus,
  GPS_COORDINATE_HONESTY_WARNING,
  resolveKickoffGridPosition,
  shouldShowGpsHonestyWarning,
} from "./planner-coordinate-registry";
import {
  collectPlannerWarnings,
  holesInProgram,
  plannerPlanType,
} from "./planner-program";
import { plannerStatus } from "./planner-status";
import type {
  PlannerCollar,
  PlannerPlanStatus,
  PlannerProjectCoordinateSystem,
  PlannerQaSeverity,
} from "./planner-types";
import type { SavedHoleProject } from "./storage";
import type { SurveyStation } from "./types";

export type PlannerMapLayerToggle = {
  standardHoles: boolean;
  daughterHoles: boolean;
  archivedHoles: boolean;
  targets: boolean;
  labels: boolean;
  localGrid: boolean;
};

export const DEFAULT_MAP_LAYER_TOGGLE: PlannerMapLayerToggle = {
  standardHoles: true,
  daughterHoles: true,
  archivedHoles: false,
  targets: true,
  labels: true,
  localGrid: true,
};

export type PlannerMapHoleLayer = {
  holeId: string;
  holeName: string;
  planType: "standard" | "daughter" | "import";
  status: PlannerPlanStatus;
  trace: SurveyStation[];
  target: {
    e: number;
    n: number;
    d: number;
    tolerance: number;
    md: number | null;
  };
  collar?: PlannerCollar;
  kickoff?: SurveyStation | null;
  motherTrace?: SurveyStation[];
  warnings: string[];
  highlighted: boolean;
  related: boolean;
};

export type PlannerClearanceHighlight = {
  holeAId: string;
  holeBId: string;
  mdA: number;
  mdB: number;
  severity: PlannerQaSeverity;
};

export type PlannerMapModel = {
  programId: string;
  layers: PlannerMapHoleLayer[];
  projectCoordinateSystem?: PlannerProjectCoordinateSystem;
  programWarnings: string[];
  clearanceHighlights?: PlannerClearanceHighlight[];
};

export type PlannerCoordinateCardData = {
  gridEnu: { e: number; n: number; d: number } | null;
  gpsLatLon: { latitude: number; longitude: number } | null;
  localEnu: { e: number; n: number; d: number };
  targetOffset: { e: number; n: number; d: number };
  collarLabel: string;
  targetLabel: string;
  coordinateMode?: string;
  northReference?: string;
  pcsMode?: string;
  epsgCode?: string;
  collarStatus?: string;
  targetStatus?: string;
  warnings?: string[];
  kickoffLabel?: string;
};

const EXTENT_PADDING_M = 500;

export function selectRelatedHoleIds(
  holeId: string,
  library: HoleLibrary,
  programId: string
): string[] {
  const hole = findHole(library, holeId);
  if (!hole) return [holeId];

  const programHoles = holesInProgram(library, programId, true);
  const related = new Set<string>([holeId]);
  const type = plannerPlanType(hole);

  if (type === "daughter" && hole.parentHoleId) {
    related.add(hole.parentHoleId);
    programHoles
      .filter(
        (h) =>
          h.parentHoleId === hole.parentHoleId &&
          plannerPlanType(h) === "daughter"
      )
      .forEach((h) => related.add(h.holeId));
  } else {
    programHoles
      .filter((h) => h.parentHoleId === holeId && plannerPlanType(h) === "daughter")
      .forEach((h) => related.add(h.holeId));
  }

  return [...related];
}

export function collectSpatialWarnings(
  hole: SavedHoleProject,
  library: HoleLibrary,
  pcs?: PlannerProjectCoordinateSystem
): string[] {
  const warnings = [...collectPlannerWarnings(hole, library)];
  const meta = hole.plannerMeta;
  const type = plannerPlanType(hole);
  const collar = normalizePlannerCollar(meta?.collar);

  if (meta?.coordinateMode === "grid" && !collar) {
    if (!warnings.some((w) => w.includes("collar"))) {
      warnings.push("Collar missing grid coordinate.");
    }
  }

  if (meta?.coordinateMode === "gps" && collar?.latitude !== undefined) {
    if (
      !pcs?.projectOrigin?.latitude &&
      !pcs?.projectOrigin?.easting
    ) {
      warnings.push("GPS provided without grid/project origin.");
    }
  }

  if (hole.planRecords.length <= 1) {
    warnings.push("Plan has suspicious zero-length trace.");
  } else {
    const first = hole.planRecords[0]!;
    const last = hole.planRecords[hole.planRecords.length - 1]!;
    if (last.md - first.md < 1) {
      warnings.push("Plan has suspicious zero-length trace.");
    }
  }

  if (hole.target && hole.planRecords.length) {
    const localD = hole.target.d;
    const stations = buildStations(hole.planRecords);
    const finalD = stations[stations.length - 1]?.d;
    if (finalD !== undefined && Math.abs(localD - finalD) > hole.target.tolerance + 50) {
      warnings.push("Plan target depth inconsistent with local D value.");
    }
  }

  if (type === "daughter" && hole.parentHoleId) {
    const mother = findHole(library, hole.parentHoleId);
    if (!mother?.actualRecords.length) {
      if (!warnings.some((w) => w.includes("mother"))) {
        warnings.push("Daughter kickoff has no mother actual path.");
      }
    }
  }

  return [...new Set(warnings)];
}

export type PlannerMapFramePath = {
  trace: SurveyStation[];
  actualTrace?: SurveyStation[];
  kickoff: SurveyStation | null;
  motherTrace?: SurveyStation[];
  collar?: PlannerCollar;
};

export function getPlannerMapFramePath(
  hole: SavedHoleProject,
  library: HoleLibrary
): PlannerMapFramePath {
  const frame = mapFrameStations(hole, library);
  let actualTrace: SurveyStation[] | undefined;
  if (hole.actualRecords.length > 1) {
    const type = plannerPlanType(hole);
    const collar = normalizePlannerCollar(hole.plannerMeta?.collar);
    const actualLocal = buildStations(hole.actualRecords);
    if (type === "daughter" && hole.parentHoleId && frame.kickoff) {
      // frame.kickoff is already in the same frame as the planned trace
      // (map frame when the mother has a collar, hole-local otherwise), so
      // the kickoff offset alone places the actual trace correctly.
      const kickoffEnu = {
        e: frame.kickoff.e,
        n: frame.kickoff.n,
        d: frame.kickoff.d,
      };
      actualTrace = offsetStationsByKickoff(actualLocal, kickoffEnu);
    } else {
      actualTrace = offsetStationsByCollar(actualLocal, collar);
    }
  }
  return { ...frame, actualTrace };
}

function mapFrameStations(
  hole: SavedHoleProject,
  library: HoleLibrary
): {
  trace: SurveyStation[];
  kickoff: SurveyStation | null;
  motherTrace: SurveyStation[] | undefined;
  collar?: PlannerCollar;
} {
  const type = plannerPlanType(hole);
  const collar = normalizePlannerCollar(hole.plannerMeta?.collar);
  const localStations = buildStations(hole.planRecords);

  if (type === "daughter" && hole.parentHoleId) {
    const mother = findHole(library, hole.parentHoleId);
    let kickoff: SurveyStation | null = null;
    let motherTrace: SurveyStation[] | undefined;

    if (mother && hole.kickoffMd !== undefined) {
      kickoff = kickoffStationFromMother(mother.actualRecords, hole.kickoffMd);
      if (kickoff) {
        const motherCollar = normalizePlannerCollar(mother.plannerMeta?.collar);
        const motherLocal = buildStations(mother.actualRecords);
        const motherMap = offsetStationsByCollar(motherLocal, motherCollar);
        motherTrace = motherMap.filter((s) => s.md <= hole.kickoffMd!);
        if (motherTrace.length === 0 && motherMap.length) {
          motherTrace = [motherMap[0]!];
        }

        const kickoffEnu = { e: kickoff.e, n: kickoff.n, d: kickoff.d };
        if (motherCollar) {
          // Map frame: d = depth below the RL-0 datum (down-positive).
          kickoff = {
            ...kickoff,
            e: kickoff.e + motherCollar.easting,
            n: kickoff.n + motherCollar.northing,
            d: kickoff.d - motherCollar.elevation,
          };
        }

        const trace = offsetStationsByKickoff(localStations, kickoffEnu);
        if (motherCollar) {
          return {
            trace: offsetStationsByCollar(trace, motherCollar),
            kickoff,
            motherTrace,
            collar,
          };
        }
        return { trace, kickoff, motherTrace, collar };
      }
    }

    const persistedKickoff =
      hole.kickoffE !== undefined
        ? { e: hole.kickoffE, n: hole.kickoffN ?? 0, d: hole.kickoffD ?? 0 }
        : null;
    if (persistedKickoff) {
      return {
        trace: offsetStationsByKickoff(localStations, persistedKickoff),
        kickoff: persistedKickoff as SurveyStation,
        motherTrace,
        collar,
      };
    }

    return { trace: localStations, kickoff: null, motherTrace, collar };
  }

  return {
    trace: offsetStationsByCollar(localStations, collar),
    kickoff: null,
    motherTrace: undefined,
    collar: collar ?? undefined,
  };
}

function mapTargetPosition(
  hole: SavedHoleProject,
  trace: SurveyStation[],
  collar?: PlannerCollar
): PlannerMapHoleLayer["target"] {
  const local = {
    e: hole.target.e,
    n: hole.target.n,
    d: hole.target.d,
  };
  const grid = collar
    ? gridTargetFromCollarRelative(local, collar)
    : local;
  const lastStation = trace[trace.length - 1];
  const mapE = collar ? grid.e : local.e + (trace[0]?.e ?? 0);
  const mapN = collar ? grid.n : local.n + (trace[0]?.n ?? 0);
  // Keep the target depth in the same frame as the trace: map-frame d is
  // depth below the RL-0 datum (down-positive), i.e. local depth minus the
  // collar RL, so 3D/DXF consumers see traces and targets aligned.
  const mapD = collar ? local.d - collar.elevation : local.d;

  return {
    e: mapE,
    n: mapN,
    d: mapD,
    tolerance: hole.target.tolerance,
    md: hole.target.md ?? lastStation?.md ?? null,
  };
}

function collectProgramSpatialWarnings(
  holes: SavedHoleProject[],
  library: HoleLibrary,
  pcs?: PlannerProjectCoordinateSystem
): string[] {
  const warnings: string[] = validateProjectCoordinateInputs(pcs, holes);

  const active = holes.filter((h) => plannerStatus(h) !== "archived");
  const collarKeys = new Map<string, string>();
  for (const hole of active) {
    const collar = normalizePlannerCollar(hole.plannerMeta?.collar);
    if (!collar) continue;
    const key = `${collar.easting.toFixed(1)},${collar.northing.toFixed(1)}`;
    const existing = collarKeys.get(key);
    if (existing && existing !== hole.holeId) {
      warnings.push(`Duplicate collar coordinates: ${hole.holeName} and ${existing}.`);
    } else {
      collarKeys.set(key, hole.holeName);
    }
  }

  const collarPoints = active
    .map((h) => normalizePlannerCollar(h.plannerMeta?.collar))
    .filter((c): c is PlannerCollar => !!c);

  if (collarPoints.length && pcs?.projectOrigin) {
    const originE = pcs.projectOrigin.easting ?? 0;
    const originN = pcs.projectOrigin.northing ?? 0;
    const maxDist =
      Math.max(
        ...collarPoints.map((c) =>
          Math.hypot(c.easting - originE, c.northing - originN)
        ),
        0
      ) + EXTENT_PADDING_M;

    for (const hole of active) {
      const { trace } = mapFrameStations(hole, library);
      const target = mapTargetPosition(hole, trace, normalizePlannerCollar(hole.plannerMeta?.collar));
      const dist = Math.hypot(target.e - originE, target.n - originN);
      if (dist > maxDist * 2) {
        warnings.push(`Target for ${hole.holeName} appears far outside expected project extents.`);
      }
    }
  }

  return [...new Set(warnings)];
}

export function buildCoordinateCardData(
  hole: SavedHoleProject,
  library: HoleLibrary,
  pcs?: PlannerProjectCoordinateSystem
): PlannerCoordinateCardData {
  const collar = normalizePlannerCollar(hole.plannerMeta?.collar);
  const localEnu = {
    e: hole.target.e,
    n: hole.target.n,
    d: hole.target.d,
  };
  const gridEnu = gridTargetDisplay(hole);
  const gpsLatLon =
    collar?.latitude !== undefined && collar?.longitude !== undefined
      ? { latitude: collar.latitude, longitude: collar.longitude }
      : null;

  const { trace } = mapFrameStations(hole, library);
  const targetMap = mapTargetPosition(hole, trace, collar);

  const resolvedPcs = pcs ?? hole.plannerMeta?.projectCoordinateSystem;
  const warnings = evaluateCoordinateWarnings(hole, library);
  const kickoffGrid = resolveKickoffGridPosition(hole, library);

  return {
    gridEnu: gridEnu ?? (collar ? gridTargetFromCollarRelative(localEnu, collar) : null),
    gpsLatLon,
    localEnu,
    targetOffset: localEnu,
    collarLabel: collar
      ? `E ${collar.easting.toFixed(1)}  N ${collar.northing.toFixed(1)}  RL ${collar.elevation.toFixed(1)}`
      : "Collar at local origin (0, 0, 0)",
    targetLabel: collar && gridEnu
      ? `Grid E ${gridEnu.e.toFixed(1)}  N ${gridEnu.n.toFixed(1)}  RL ${gridEnu.d.toFixed(1)}`
      : `Local E ${localEnu.e.toFixed(1)}  N ${localEnu.n.toFixed(1)}  D ${localEnu.d.toFixed(1)}`,
    coordinateMode: hole.plannerMeta?.coordinateMode,
    northReference: hole.plannerMeta?.northReference,
    pcsMode: resolvedPcs?.mode,
    epsgCode: resolvedPcs?.epsgCode,
    collarStatus: evaluateCollarCoordinateStatus(hole),
    targetStatus: evaluateTargetCoordinateStatus(hole),
    warnings: shouldShowGpsHonestyWarning(hole, library)
      ? [...warnings, GPS_COORDINATE_HONESTY_WARNING]
      : warnings,
    kickoffLabel: kickoffGrid
      ? `Grid kickoff E ${kickoffGrid.e.toFixed(1)}  N ${kickoffGrid.n.toFixed(1)}  RL ${kickoffGrid.d.toFixed(1)}`
      : hole.kickoffMd !== undefined
        ? `Local kickoff MD ${hole.kickoffMd.toFixed(1)} m`
        : undefined,
  };
}

export type ProgramMapBoundsOpts = {
  /** Restrict bounds to these hole layers (for fit-to-selection). */
  focusHoleIds?: string[];
  /** Include PCS project origin in extent when defined. */
  projectOrigin?: { easting?: number; northing?: number };
};

function layerMapPoints(layer: PlannerMapHoleLayer): { e: number; n: number }[] {
  const points: { e: number; n: number }[] = [];
  layer.trace.forEach((s) => points.push({ e: s.e, n: s.n }));
  layer.motherTrace?.forEach((s) => points.push({ e: s.e, n: s.n }));
  points.push({ e: layer.target.e, n: layer.target.n });
  if (layer.kickoff) points.push({ e: layer.kickoff.e, n: layer.kickoff.n });
  if (layer.collar) {
    points.push({ e: layer.collar.easting, n: layer.collar.northing });
  }
  return points;
}

function shiftLayerMapPositions(
  layer: PlannerMapHoleLayer,
  deltaE: number,
  deltaN: number
): void {
  layer.trace = layer.trace.map((s) => ({
    ...s,
    e: s.e + deltaE,
    n: s.n + deltaN,
  }));
  if (layer.motherTrace) {
    layer.motherTrace = layer.motherTrace.map((s) => ({
      ...s,
      e: s.e + deltaE,
      n: s.n + deltaN,
    }));
  }
  layer.target = {
    ...layer.target,
    e: layer.target.e + deltaE,
    n: layer.target.n + deltaN,
  };
  if (layer.kickoff) {
    layer.kickoff = {
      ...layer.kickoff,
      e: layer.kickoff.e + deltaE,
      n: layer.kickoff.n + deltaN,
    };
  }
}

/**
 * When multiple collarless holes share the same map origin, fan them out for
 * display only so the local plan view remains readable.
 */
export function applyCollarlessDisplaySpread(
  layers: PlannerMapHoleLayer[]
): string | null {
  const collarless = layers.filter((l) => !l.collar);
  if (collarless.length < 2) return null;

  const anchors = collarless.map((l) => ({
    e: l.trace[0]?.e ?? l.target.e,
    n: l.trace[0]?.n ?? l.target.n,
  }));
  const ref = anchors[0]!;
  const overlaps = anchors.every(
    (a) => Math.hypot(a.e - ref.e, a.n - ref.n) < 8
  );
  if (!overlaps) return null;

  const spacing = 40;
  collarless.forEach((layer, i) => {
    const ring = Math.floor(i / 8) + 1;
    const angle = (-Math.PI / 2) + (2 * Math.PI * i) / collarless.length;
    shiftLayerMapPositions(
      layer,
      Math.cos(angle) * spacing * ring,
      Math.sin(angle) * spacing * ring
    );
  });

  return `${collarless.length} holes without grid collars overlap at the local origin — traces are fanned for display. Add collar coordinates for true spatial layout.`;
}

export function programMapBounds(
  layers: PlannerMapHoleLayer[],
  opts: ProgramMapBoundsOpts = {}
) {
  const focusSet = opts.focusHoleIds?.length
    ? new Set(opts.focusHoleIds)
    : null;
  const activeLayers = focusSet
    ? layers.filter((l) => focusSet.has(l.holeId))
    : layers;

  if (!activeLayers.length) {
    return { minX: -50, maxX: 50, minY: -50, maxY: 50 };
  }

  const points: { e: number; n: number }[] = [];
  if (
    opts.projectOrigin?.easting !== undefined &&
    opts.projectOrigin?.northing !== undefined
  ) {
    points.push({
      e: opts.projectOrigin.easting,
      n: opts.projectOrigin.northing,
    });
  }

  for (const layer of activeLayers) {
    points.push(...layerMapPoints(layer));
  }

  if (!points.length) {
    return { minX: -50, maxX: 50, minY: -50, maxY: 50 };
  }

  return bounds(points, "e", "n");
}

export function programMapScale(
  width: number,
  height: number,
  layers: PlannerMapHoleLayer[],
  opts: ProgramMapBoundsOpts = {}
) {
  return makeScale(width, height, programMapBounds(layers, opts));
}

export function buildPlannerMapModel(
  library: HoleLibrary,
  programId: string,
  toggles: PlannerMapLayerToggle = DEFAULT_MAP_LAYER_TOGGLE,
  selectedHoleId?: string | null,
  clearanceHighlights?: PlannerClearanceHighlight[]
): PlannerMapModel | null {
  const allHoles = holesInProgram(library, programId, true);
  if (!allHoles.length) return null;

  const pcs = resolveProgramCoordinateSystem(allHoles);
  const relatedIds = selectedHoleId
    ? new Set(selectRelatedHoleIds(selectedHoleId, library, programId))
    : new Set<string>();

  const visible = allHoles.filter((hole) => {
    const status = plannerStatus(hole);
    if (status === "archived" && !toggles.archivedHoles) return false;
    const type = plannerPlanType(hole);
    if (type === "daughter" && !toggles.daughterHoles) return false;
    if (type !== "daughter" && !toggles.standardHoles) return false;
    return true;
  });

  const layers: PlannerMapHoleLayer[] = visible.map((hole) => {
    const type = plannerPlanType(hole);
    const { trace, kickoff, motherTrace, collar } = mapFrameStations(hole, library);
    const target = mapTargetPosition(hole, trace, collar);
    const warnings = collectSpatialWarnings(hole, library, pcs);

    return {
      holeId: hole.holeId,
      holeName: hole.holeName,
      planType: type,
      status: plannerStatus(hole),
      trace,
      target,
      collar,
      kickoff,
      motherTrace,
      warnings,
      highlighted: hole.holeId === selectedHoleId,
      related: relatedIds.has(hole.holeId) && hole.holeId !== selectedHoleId,
    };
  });

  const programWarnings = collectProgramSpatialWarnings(allHoles, library, pcs);
  const spreadWarning = applyCollarlessDisplaySpread(layers);
  if (spreadWarning) programWarnings.push(spreadWarning);

  return {
    programId,
    layers,
    projectCoordinateSystem: pcs,
    programWarnings,
    clearanceHighlights,
  };
}

export function exportHoleSpatialFields(
  hole: SavedHoleProject,
  library: HoleLibrary,
  pcs?: PlannerProjectCoordinateSystem
) {
  const collar = normalizePlannerCollar(hole.plannerMeta?.collar);
  const gridTarget = gridTargetDisplay(hole);
  const card = buildCoordinateCardData(hole, library, pcs);

  return {
    collarCoordinates: collar
      ? {
          easting: collar.easting,
          northing: collar.northing,
          elevation: collar.elevation,
          latitude: collar.latitude,
          longitude: collar.longitude,
        }
      : null,
    targetCoordinates: gridTarget
      ? { e: gridTarget.e, n: gridTarget.n, d: gridTarget.d }
      : null,
    localEnu: card.localEnu,
    spatialWarnings: collectSpatialWarnings(hole, library, pcs),
  };
}
