import { buildStations } from "./desurvey";
import type { SurveyRecord, SurveyStation } from "./types";
import type {
  PlannerCollar,
  PlannerCoordinateMode,
  PlannerDraft,
  PlannerProjectCoordinateSystem,
} from "./planner-types";
import type { SavedHoleProject } from "./storage";

export type EnuPoint = { e: number; n: number; d: number };

export function normalizePlannerCollar(
  raw?: Partial<PlannerCollar> | null
): PlannerCollar | undefined {
  if (!raw) return undefined;
  const easting = Number(raw.easting);
  const northing = Number(raw.northing);
  const elevation = Number(raw.elevation);
  if (!Number.isFinite(easting) || !Number.isFinite(northing) || !Number.isFinite(elevation)) {
    return undefined;
  }
  const collar: PlannerCollar = { easting, northing, elevation };
  if (raw.latitude !== undefined && Number.isFinite(raw.latitude)) {
    collar.latitude = raw.latitude;
  }
  if (raw.longitude !== undefined && Number.isFinite(raw.longitude)) {
    collar.longitude = raw.longitude;
  }
  return collar;
}

/**
 * Convert a grid-coordinate target to collar-relative E/N/D.
 * Grid `d` is a true elevation / RL (up-positive); local `d` is depth below
 * the collar (down-positive): local_d = collar RL − target RL.
 */
export function collarRelativeTargetFromGrid(
  target: EnuPoint,
  collar: PlannerCollar
): EnuPoint {
  return {
    e: target.e - collar.easting,
    n: target.n - collar.northing,
    d: collar.elevation - target.d,
  };
}

/**
 * Convert a collar-relative target back to grid coordinates for display.
 * The returned `d` is a true elevation / RL (up-positive):
 * RL = collar RL − local depth.
 */
export function gridTargetFromCollarRelative(
  target: EnuPoint,
  collar: PlannerCollar
): EnuPoint {
  return {
    e: target.e + collar.easting,
    n: target.n + collar.northing,
    d: collar.elevation - target.d,
  };
}

/** Collar-relative E/N/D at MD along a constant dip/azimuth leg. */
export function targetEnuFromMdOffset(
  targetMd: number,
  startDip: number,
  startAzimuth: number,
  startMd = 0,
  startPosition: EnuPoint = { e: 0, n: 0, d: 0 }
): EnuPoint | null {
  if (!Number.isFinite(targetMd) || targetMd <= startMd) return null;
  const legLength = targetMd - startMd;
  const records: SurveyRecord[] = [
    { md: startMd, dip: startDip, azimuth: startAzimuth },
    { md: targetMd, dip: startDip, azimuth: startAzimuth },
  ];
  if (legLength > 30) {
    const midMd = startMd + legLength / 2;
    records.splice(1, 0, { md: midMd, dip: startDip, azimuth: startAzimuth });
  }
  const stations = buildStations(records);
  const last = stations[stations.length - 1];
  if (!last) return null;
  return {
    e: last.e + startPosition.e,
    n: last.n + startPosition.n,
    d: last.d + startPosition.d,
  };
}

export function resolveTargetEnu(
  draft: PlannerDraft
): { e: number; n: number; d: number; warnings: string[] } {
  const warnings: string[] = [];
  const { target, coordinateMode, collar } = draft;

  if (target.inputMode === "md-offset") {
    const md = target.md;
    if (md === undefined || !Number.isFinite(md)) {
      warnings.push("MD-offset target requires target MD.");
      return { e: target.e, n: target.n, d: target.d, warnings };
    }
    const dip =
      draft.planType === "daughter"
        ? draft.daughterKickoff?.dip
        : draft.initialDip;
    const azimuth =
      draft.planType === "daughter"
        ? draft.daughterKickoff?.azimuth
        : draft.initialAzimuth;
    if (dip === undefined || azimuth === undefined) {
      warnings.push("MD-offset target requires planned dip and azimuth.");
      return { e: target.e, n: target.n, d: target.d, warnings };
    }
    const startMd =
      draft.planType === "daughter" && draft.daughterKickoff
        ? 0
        : 0;
    const enu = targetEnuFromMdOffset(md, dip, azimuth, startMd);
    if (!enu) {
      warnings.push("Could not resolve MD-offset target position.");
      return { e: target.e, n: target.n, d: target.d, warnings };
    }
    return { ...enu, warnings };
  }

  if (target.inputMode === "collar-relative" || coordinateMode === "collar-relative") {
    return { e: target.e, n: target.n, d: target.d, warnings };
  }

  if (target.inputMode === "grid" || coordinateMode === "grid") {
    if (!collar) {
      warnings.push("Grid target requires collar easting, northing, and elevation.");
      return { e: target.e, n: target.n, d: target.d, warnings };
    }
    return {
      ...collarRelativeTargetFromGrid(
        { e: target.e, n: target.n, d: target.d },
        collar
      ),
      warnings,
    };
  }

  if (coordinateMode === "gps") {
    if (!collar?.latitude || !collar?.longitude) {
      warnings.push("GPS mode: store collar latitude and longitude as metadata for future CRS use.");
    }
  }

  return { e: target.e, n: target.n, d: target.d, warnings };
}

export function validateCoordinateInputs(draft: PlannerDraft): string[] {
  const warnings: string[] = [];

  if (draft.coordinateMode === "grid" && draft.planType === "standard") {
    if (!normalizePlannerCollar(draft.collar)) {
      warnings.push("Grid coordinate mode requires collar easting, northing, and elevation.");
    }
  }

  if (draft.coordinateMode === "gps") {
    const collar = normalizePlannerCollar(draft.collar);
    const hasGps =
      collar?.latitude !== undefined &&
      collar?.longitude !== undefined &&
      Number.isFinite(collar.latitude) &&
      Number.isFinite(collar.longitude);
    if (!hasGps) {
      warnings.push(
        "GPS metadata mode: enter collar latitude and longitude (stored for future CRS transforms)."
      );
    }
    const hasVerifiedGrid =
      collar &&
      (collar.easting !== 0 || collar.northing !== 0 || collar.elevation !== 0);
    if (hasGps && !hasVerifiedGrid) {
      warnings.push(
        "GPS metadata stored. Grid/local planning requires verified project coordinates."
      );
    }
  }

  if (draft.target.inputMode === "grid" && !normalizePlannerCollar(draft.collar)) {
    warnings.push("Grid target input requires collar coordinates to convert to collar-relative offsets.");
  }

  return warnings;
}

export function coordinateModeLabel(mode: PlannerCoordinateMode): string {
  const labels: Record<PlannerCoordinateMode, string> = {
    "collar-relative": "Collar-relative",
    grid: "Grid / mine coordinates",
    gps: "GPS WGS84 metadata",
  };
  return labels[mode];
}

export function normalizeProjectCoordinateSystem(
  raw?: Partial<PlannerProjectCoordinateSystem> | null
): PlannerProjectCoordinateSystem | undefined {
  if (!raw?.mode) return undefined;
  const mode = raw.mode;
  if (mode !== "local" && mode !== "grid" && mode !== "gps") return undefined;

  const pcs: PlannerProjectCoordinateSystem = { mode };
  if (raw.projectOrigin) {
    const origin: NonNullable<PlannerProjectCoordinateSystem["projectOrigin"]> = {};
    if (Number.isFinite(raw.projectOrigin.easting)) {
      origin.easting = raw.projectOrigin.easting;
    }
    if (Number.isFinite(raw.projectOrigin.northing)) {
      origin.northing = raw.projectOrigin.northing;
    }
    if (Number.isFinite(raw.projectOrigin.elevation)) {
      origin.elevation = raw.projectOrigin.elevation;
    }
    if (Number.isFinite(raw.projectOrigin.latitude)) {
      origin.latitude = raw.projectOrigin.latitude;
    }
    if (Number.isFinite(raw.projectOrigin.longitude)) {
      origin.longitude = raw.projectOrigin.longitude;
    }
    if (Object.keys(origin).length) pcs.projectOrigin = origin;
  }
  if (raw.gridName?.trim()) pcs.gridName = raw.gridName.trim();
  if (raw.epsgCode?.trim()) pcs.epsgCode = raw.epsgCode.trim();
  if (Number.isFinite(raw.magneticDeclinationDeg)) {
    pcs.magneticDeclinationDeg = raw.magneticDeclinationDeg;
  }
  if (Number.isFinite(raw.gridConvergenceDeg)) {
    pcs.gridConvergenceDeg = raw.gridConvergenceDeg;
  }
  if (raw.notes?.trim()) pcs.notes = raw.notes.trim();
  return pcs;
}

/**
 * First collar lat/long in a set of holes — used as the site fallback for
 * geodesy lookups (WMM declination, grid suggestion) when the project origin
 * has no lat/long.
 */
export function firstCollarLatLon(
  holes: SavedHoleProject[]
): { latitudeDeg: number; longitudeDeg: number } | undefined {
  for (const hole of holes) {
    const collar = hole.plannerMeta?.collar;
    if (
      collar &&
      Number.isFinite(collar.latitude) &&
      Number.isFinite(collar.longitude)
    ) {
      return { latitudeDeg: collar.latitude!, longitudeDeg: collar.longitude! };
    }
  }
  return undefined;
}

/**
 * Place hole-local stations into the shared program map frame.
 * Frame `d` is depth below the RL-0 datum (down-positive), so RL = −d and a
 * collar at RL 420 sits at frame d = −420. This keeps vertical relationships
 * between holes with different collar RLs physically correct (clearance, 3D,
 * DXF all consume this frame).
 */
export function offsetStationsByCollar(
  stations: SurveyStation[],
  collar?: PlannerCollar | null
): SurveyStation[] {
  if (!collar) return stations;
  return stations.map((s) => ({
    ...s,
    e: s.e + collar.easting,
    n: s.n + collar.northing,
    d: s.d - collar.elevation,
  }));
}

/** Shift hole-local stations by a kickoff point expressed in the same frame (purely additive). */
export function offsetStationsByKickoff(
  stations: SurveyStation[],
  kickoff: EnuPoint
): SurveyStation[] {
  return stations.map((s) => ({
    ...s,
    e: s.e + kickoff.e,
    n: s.n + kickoff.n,
    d: s.d + kickoff.d,
  }));
}

export function gridTargetDisplay(hole: SavedHoleProject): EnuPoint | null {
  const collar = normalizePlannerCollar(hole.plannerMeta?.collar);
  if (!collar || !hole.target) return null;
  return gridTargetFromCollarRelative(
    { e: hole.target.e, n: hole.target.n, d: hole.target.d },
    collar
  );
}

export function validateProjectCoordinateInputs(
  pcs: PlannerProjectCoordinateSystem | undefined,
  holes: SavedHoleProject[]
): string[] {
  const warnings: string[] = [];
  if (!pcs) return warnings;

  if (pcs.mode === "grid") {
    if (!pcs.gridName && !pcs.epsgCode) {
      warnings.push("Grid project coordinate system: specify grid name or EPSG code.");
    }
    const origin = pcs.projectOrigin;
    if (
      origin?.easting === undefined ||
      origin?.northing === undefined
    ) {
      warnings.push("Grid project coordinate system: project origin easting/northing recommended.");
    }
  }

  if (pcs.mode === "gps") {
    const origin = pcs.projectOrigin;
    if (origin?.latitude === undefined || origin?.longitude === undefined) {
      warnings.push("GPS project coordinate system: project origin latitude/longitude recommended.");
    }
  }

  const hasGpsCollar = holes.some(
    (h) =>
      h.plannerMeta?.collar?.latitude !== undefined &&
      h.plannerMeta?.collar?.longitude !== undefined
  );
  if (hasGpsCollar && pcs.mode !== "gps" && !pcs.projectOrigin?.latitude) {
    warnings.push("GPS collar coordinates provided without GPS/grid project origin.");
  }

  return warnings;
}
