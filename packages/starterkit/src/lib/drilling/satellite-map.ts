import { normalizePlannerCollar } from "./coordinate-system";
import { findHole, resolveProgramCoordinateSystem, type HoleLibrary } from "./hole-library";
import {
  buildPlannerMapModel,
  DEFAULT_MAP_LAYER_TOGGLE,
  type PlannerMapLayerToggle,
} from "./planner-spatial";
import { holesInProgram } from "./planner-program";
import type {
  PlannerPlanStatus,
  PlannerProjectCoordinateSystem,
} from "./planner-types";
import type { SavedHoleProject } from "./storage";

export type GpsPoint = { latitude: number; longitude: number };

export type SatellitePlacementQuality = "gps" | "approximate" | "unplaced";

export type SatelliteLatLng = {
  lat: number;
  lng: number;
  quality: SatellitePlacementQuality;
};

export type SatelliteTraceOverlay = {
  coordinates: [number, number][];
  quality: SatellitePlacementQuality;
};

export type SatelliteHoleOverlay = {
  holeId: string;
  holeName: string;
  planType: "standard" | "daughter" | "import";
  status: PlannerPlanStatus;
  highlighted: boolean;
  related: boolean;
  collar: SatelliteLatLng | null;
  target: SatelliteLatLng | null;
  kickoff: SatelliteLatLng | null;
  trace: SatelliteTraceOverlay | null;
  motherTrace: SatelliteTraceOverlay | null;
};

export type SatelliteMapOverlayModel = {
  center: GpsPoint | null;
  zoom: number;
  warnings: string[];
  providerReady: boolean;
  layers: SatelliteHoleOverlay[];
};

export const GRID_CRS_SATELLITE_WARNING =
  "Grid coordinates need a project CRS/EPSG transform before satellite placement.";

export const SATELLITE_GPS_REQUIRED_MESSAGE =
  "Satellite view needs collar GPS or project origin GPS. Add latitude/longitude in Create.";

export const SATELLITE_PROVIDER_DISABLED_MESSAGE =
  "Add NEXT_PUBLIC_MAPBOX_TOKEN to packages/starterkit/.env.local and restart npm run dev.";

export const SATELLITE_TOKEN_FORMAT_MESSAGE =
  "Mapbox token must start with pk. on the same line as NEXT_PUBLIC_MAPBOX_TOKEN= in .env.local.";

export type SatelliteDiagnostics = {
  mapboxTokenDetected: boolean;
  mapboxTokenFormatValid: boolean;
  collarGpsAvailable: boolean;
  satelliteCenterResolved: boolean;
  providerConfigured: boolean;
};

export function isValidMapboxPublicToken(token: string): boolean {
  return token.startsWith("pk.") && token.length > 20;
}

export function buildSatelliteDiagnostics(
  overlay: SatelliteMapOverlayModel | null,
  selectedHoleId?: string | null
): SatelliteDiagnostics {
  const provider = satelliteProviderConfig();
  const selectedLayer = overlay?.layers.find((l) => l.holeId === selectedHoleId);
  const selectedHasCollarGps = selectedLayer?.collar?.quality === "gps";
  const anyCollarGps = overlay?.layers.some((l) => l.collar?.quality === "gps") ?? false;

  return {
    mapboxTokenDetected: Boolean(provider.token),
    mapboxTokenFormatValid: provider.ready,
    providerConfigured: provider.ready,
    collarGpsAvailable: selectedHoleId
      ? selectedHasCollarGps
      : anyCollarGps || Boolean(overlay?.center),
    satelliteCenterResolved: hasGpsCoordinate(overlay?.center),
  };
}

export function findFirstGpsCapableHoleId(
  library: HoleLibrary,
  programId: string
): string | null {
  const holes = holesInProgram(library, programId, true);
  for (const hole of holes) {
    if (collarGps(hole)) return hole.holeId;
  }
  return null;
}

export const APPROXIMATE_PLACEMENT_NOTE =
  "Approximate satellite placement from GPS origin and local E/N offsets — verify in field.";

/** Status stroke colors — keep in sync with PlannerMiniMap */
export const SATELLITE_STATUS_COLORS: Record<PlannerPlanStatus, string> = {
  draft: "#94a3b8",
  planned: "#1a4fa3",
  approved: "#1a6b3c",
  active: "#856404",
  completed: "#155724",
  archived: "#6c757d",
};

const METERS_PER_DEG_LAT = 111_320;

export function satelliteProviderConfig() {
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim()
      : undefined;
  const token = raw || null;
  return {
    provider: "mapbox" as const,
    token,
    ready: token !== null && isValidMapboxPublicToken(token),
  };
}

export function hasGpsCoordinate(
  point?: { latitude?: number; longitude?: number } | null
): point is GpsPoint {
  return (
    point !== null &&
    point !== undefined &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude)
  );
}

export function localOffsetToApproxLatLng(
  origin: GpsPoint,
  eastingM: number,
  northingM: number
): { lat: number; lng: number; approximate: true } {
  const latRad = (origin.latitude * Math.PI) / 180;
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos(latRad);
  return {
    lat: origin.latitude + northingM / METERS_PER_DEG_LAT,
    lng: origin.longitude + eastingM / metersPerDegLng,
    approximate: true,
  };
}

function collarGps(hole: SavedHoleProject): GpsPoint | null {
  const collar = normalizePlannerCollar(hole.plannerMeta?.collar);
  if (!collar || !hasGpsCoordinate(collar)) return null;
  return { latitude: collar.latitude, longitude: collar.longitude };
}

function originGps(pcs?: PlannerProjectCoordinateSystem): GpsPoint | null {
  const origin = pcs?.projectOrigin;
  if (!hasGpsCoordinate(origin)) return null;
  return { latitude: origin.latitude, longitude: origin.longitude };
}

function isGridOnlyHole(hole: SavedHoleProject, pcs?: PlannerProjectCoordinateSystem): boolean {
  const mode = hole.plannerMeta?.coordinateMode ?? "collar-relative";
  const collar = normalizePlannerCollar(hole.plannerMeta?.collar);
  const hasCollarGps = collarGps(hole) !== null;
  const hasOriginGps = originGps(pcs) !== null;

  if (hasCollarGps || hasOriginGps) return false;

  if (mode === "grid") return true;
  if (collar && (collar.easting !== 0 || collar.northing !== 0 || collar.elevation !== 0)) {
    return true;
  }
  if (pcs?.mode === "grid" && (pcs.epsgCode || pcs.gridName)) return true;

  return false;
}

export function satellitePlacementWarnings(
  hole: SavedHoleProject,
  pcs?: PlannerProjectCoordinateSystem
): string[] {
  const warnings: string[] = [];

  if (isGridOnlyHole(hole, pcs)) {
    warnings.push(GRID_CRS_SATELLITE_WARNING);
    if (pcs?.epsgCode) {
      warnings.push(
        `EPSG ${pcs.epsgCode} is stored but grid-to-WGS84 transform is not implemented yet.`
      );
    }
  }

  const collar = collarGps(hole);
  const origin = originGps(pcs);
  if (!collar && !origin) {
    warnings.push(SATELLITE_GPS_REQUIRED_MESSAGE);
  }

  return warnings;
}

type MapAnchor = {
  gps: GpsPoint;
  mapE: number;
  mapN: number;
  collarQuality: SatellitePlacementQuality;
};

function resolveMapAnchor(
  hole: SavedHoleProject,
  pcs: PlannerProjectCoordinateSystem | undefined,
  collarMapE: number,
  collarMapN: number
): MapAnchor | null {
  const direct = collarGps(hole);
  if (direct) {
    const collar = normalizePlannerCollar(hole.plannerMeta?.collar);
    const mapE = collar?.easting ?? collarMapE;
    const mapN = collar?.northing ?? collarMapN;
    return {
      gps: direct,
      mapE,
      mapN,
      collarQuality: "gps",
    };
  }

  const origin = originGps(pcs);
  if (origin) {
    const originE = pcs?.projectOrigin?.easting ?? 0;
    const originN = pcs?.projectOrigin?.northing ?? 0;
    return {
      gps: origin,
      mapE: originE,
      mapN: originN,
      collarQuality: "approximate",
    };
  }

  return null;
}

function mapPointToLatLng(
  anchor: MapAnchor,
  mapE: number,
  mapN: number
): SatelliteLatLng {
  if (anchor.collarQuality === "gps" && mapE === anchor.mapE && mapN === anchor.mapN) {
    return { lat: anchor.gps.latitude, lng: anchor.gps.longitude, quality: "gps" };
  }
  const approx = localOffsetToApproxLatLng(
    anchor.gps,
    mapE - anchor.mapE,
    mapN - anchor.mapN
  );
  return { lat: approx.lat, lng: approx.lng, quality: "approximate" };
}

function traceToLatLng(
  anchor: MapAnchor,
  stations: { e: number; n: number }[]
): SatelliteTraceOverlay | null {
  if (!stations.length) return null;
  const coords = stations.map((s) => {
    const pt = mapPointToLatLng(anchor, s.e, s.n);
    return [pt.lng, pt.lat] as [number, number];
  });
  const quality = coords.every((_, i) => {
    const pt = mapPointToLatLng(anchor, stations[i]!.e, stations[i]!.n);
    return pt.quality === "gps";
  })
    ? "gps"
    : "approximate";
  return { coordinates: coords, quality };
}

export function resolveSatelliteCenter(
  library: HoleLibrary,
  programId: string,
  selectedHoleId?: string | null
): GpsPoint | null {
  if (selectedHoleId) {
    const selected = findHole(library, selectedHoleId);
    const gps = selected ? collarGps(selected) : null;
    if (gps) return gps;
  }

  const holes = holesInProgram(library, programId, true);
  const pcs = resolveProgramCoordinateSystem(holes);
  const origin = originGps(pcs);
  if (origin) return origin;

  for (const hole of holes) {
    const gps = collarGps(hole);
    if (gps) return gps;
  }

  return null;
}

export function buildSatelliteOverlayModel(
  library: HoleLibrary,
  programId: string,
  selectedHoleId?: string | null,
  toggles: PlannerMapLayerToggle = DEFAULT_MAP_LAYER_TOGGLE
): SatelliteMapOverlayModel | null {
  const mapModel = buildPlannerMapModel(library, programId, toggles, selectedHoleId);
  if (!mapModel) return null;

  const provider = satelliteProviderConfig();
  const warnings: string[] = [];
  if (!provider.ready) {
    warnings.push(SATELLITE_PROVIDER_DISABLED_MESSAGE);
  }

  const pcs = mapModel.projectCoordinateSystem;
  const center = resolveSatelliteCenter(library, programId, selectedHoleId);

  const layers: SatelliteHoleOverlay[] = mapModel.layers.map((layer) => {
    const hole = findHole(library, layer.holeId);
    if (!hole) {
      return {
        holeId: layer.holeId,
        holeName: layer.holeName,
        planType: layer.planType,
        status: layer.status,
        highlighted: layer.highlighted,
        related: layer.related,
        collar: null,
        target: null,
        kickoff: null,
        trace: null,
        motherTrace: null,
      };
    }

    const holeWarnings = satellitePlacementWarnings(hole, pcs);
    const gridOnly = isGridOnlyHole(hole, pcs);

    const collarMapE = layer.collar?.easting ?? layer.trace[0]?.e ?? 0;
    const collarMapN = layer.collar?.northing ?? layer.trace[0]?.n ?? 0;
    const anchor = gridOnly ? null : resolveMapAnchor(hole, pcs, collarMapE, collarMapN);

    if (gridOnly) {
      for (const w of holeWarnings) {
        warnings.push(`${layer.holeName}: ${w}`);
      }
      return {
        holeId: layer.holeId,
        holeName: layer.holeName,
        planType: layer.planType,
        status: layer.status,
        highlighted: layer.highlighted,
        related: layer.related,
        collar: null,
        target: null,
        kickoff: null,
        trace: null,
        motherTrace: null,
      };
    }

    if (!anchor) {
      for (const w of holeWarnings) {
        warnings.push(`${layer.holeName}: ${w}`);
      }
      return {
        holeId: layer.holeId,
        holeName: layer.holeName,
        planType: layer.planType,
        status: layer.status,
        highlighted: layer.highlighted,
        related: layer.related,
        collar: null,
        target: null,
        kickoff: null,
        trace: null,
        motherTrace: null,
      };
    }

    const collar = mapPointToLatLng(anchor, collarMapE, collarMapN);
    const target = mapPointToLatLng(anchor, layer.target.e, layer.target.n);
    const kickoff = layer.kickoff
      ? mapPointToLatLng(anchor, layer.kickoff.e, layer.kickoff.n)
      : null;
    const trace = traceToLatLng(anchor, layer.trace);
    const motherTrace = layer.motherTrace?.length
      ? traceToLatLng(anchor, layer.motherTrace)
      : null;

    if (collar.quality === "approximate" || target.quality === "approximate") {
      holeWarnings.push(APPROXIMATE_PLACEMENT_NOTE);
    }

    warnings.push(...holeWarnings.map((w) => `${layer.holeName}: ${w}`));

    return {
      holeId: layer.holeId,
      holeName: layer.holeName,
      planType: layer.planType,
      status: layer.status,
      highlighted: layer.highlighted,
      related: layer.related,
      collar,
      target,
      kickoff,
      trace,
      motherTrace,
    };
  });

  if (!center) {
    warnings.push(SATELLITE_GPS_REQUIRED_MESSAGE);
  }

  return {
    center,
    zoom: 15,
    warnings: [...new Set(warnings)],
    providerReady: provider.ready,
    layers,
  };
}
