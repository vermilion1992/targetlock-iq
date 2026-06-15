/**
 * Grid CRS engine — lat/long ↔ projected grid conversions and grid
 * convergence for the transverse-Mercator grids exploration teams actually
 * use: MGA2020, MGA94 and WGS84 UTM.
 *
 * Built on proj4js. The registry is generated programmatically (every grid
 * here is a standard 6° UTM-style transverse Mercator, so each family is a
 * single template):
 *
 * - MGA2020 zones 46–59 (EPSG:7846–7859, GDA2020 / GRS80)
 * - MGA94 zones 49–56 (EPSG:28349–28356, GDA94 / GRS80)
 * - WGS84 UTM north zones 1–60 (EPSG:32601–32660)
 * - WGS84 UTM south zones 1–60 (EPSG:32701–32760)
 *
 * Lat/long inputs and outputs are treated as being on the grid's own datum
 * (GDA2020, GDA94 or WGS84). These datums agree at the metre level or better
 * for exploration purposes; no plate-motion or datum-shift transformations
 * are applied. Unknown EPSG codes resolve to `undefined` so callers keep the
 * existing metadata-only behaviour.
 *
 * Validation (see __tests__/grid-crs.test.ts): round-trips < 1 mm, published
 * Geoscience Australia / Landgate GDA2020 control values, convergence
 * sign/magnitude at known points.
 */

import proj4 from "proj4";

export type GridFamily = "MGA2020" | "MGA94" | "UTM-WGS84";

export type GridDefinition = {
  epsg: number;
  /** Display name, e.g. "MGA2020 zone 52". */
  name: string;
  family: GridFamily;
  zone: number;
  centralMeridianDeg: number;
  southernHemisphere: boolean;
  /** proj4 definition string. */
  proj4def: string;
};

export type LatLon = { latitudeDeg: number; longitudeDeg: number };
export type GridPosition = { easting: number; northing: number };

function utmCentralMeridian(zone: number): number {
  return -183 + 6 * zone;
}

function tmDef(zone: number, ellps: "GRS80" | "WGS84", south: boolean): string {
  // GDA2020/GDA94/WGS84 are treated as equivalent at exploration accuracy.
  const datum = ellps === "WGS84" ? "+datum=WGS84" : "+ellps=GRS80 +towgs84=0,0,0,0,0,0,0";
  return `+proj=utm +zone=${zone}${south ? " +south" : ""} ${datum} +units=m +no_defs`;
}

const REGISTRY: Map<number, GridDefinition> = (() => {
  const map = new Map<number, GridDefinition>();
  const add = (def: GridDefinition) => map.set(def.epsg, def);
  // MGA2020 zones 46-59 (EPSG:7846-7859).
  for (let zone = 46; zone <= 59; zone++) {
    add({
      epsg: 7800 + zone,
      name: `MGA2020 zone ${zone}`,
      family: "MGA2020",
      zone,
      centralMeridianDeg: utmCentralMeridian(zone),
      southernHemisphere: true,
      proj4def: tmDef(zone, "GRS80", true),
    });
  }
  // MGA94 zones 49-56 (EPSG:28349-28356).
  for (let zone = 49; zone <= 56; zone++) {
    add({
      epsg: 28300 + zone,
      name: `MGA94 zone ${zone}`,
      family: "MGA94",
      zone,
      centralMeridianDeg: utmCentralMeridian(zone),
      southernHemisphere: true,
      proj4def: tmDef(zone, "GRS80", true),
    });
  }
  // WGS84 UTM north (EPSG:326xx) and south (EPSG:327xx), zones 1-60.
  for (let zone = 1; zone <= 60; zone++) {
    add({
      epsg: 32600 + zone,
      name: `WGS84 / UTM zone ${zone}N`,
      family: "UTM-WGS84",
      zone,
      centralMeridianDeg: utmCentralMeridian(zone),
      southernHemisphere: false,
      proj4def: tmDef(zone, "WGS84", false),
    });
    add({
      epsg: 32700 + zone,
      name: `WGS84 / UTM zone ${zone}S`,
      family: "UTM-WGS84",
      zone,
      centralMeridianDeg: utmCentralMeridian(zone),
      southernHemisphere: true,
      proj4def: tmDef(zone, "WGS84", true),
    });
  }
  return map;
})();

/** All registry grids, ordered for display (MGA2020 first). */
export function listGrids(): GridDefinition[] {
  const order: Record<GridFamily, number> = { MGA2020: 0, MGA94: 1, "UTM-WGS84": 2 };
  return [...REGISTRY.values()].sort(
    (a, b) => order[a.family] - order[b.family] || a.epsg - b.epsg
  );
}

/**
 * Parse an EPSG identifier out of free text: accepts 7852, "7852",
 * "EPSG:7852", "epsg 7852", or a registry grid name like "MGA2020 zone 52".
 */
export function parseEpsgCode(value: number | string | undefined | null): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : undefined;
  }
  const text = value.trim();
  if (!text) return undefined;
  const direct = text.match(/^(?:epsg\s*:?\s*)?(\d{4,5})$/i);
  if (direct) return Number(direct[1]);
  // Match against registry names ("MGA2020 zone 52", "WGS84 / UTM zone 52S").
  const lower = text.toLowerCase();
  for (const def of REGISTRY.values()) {
    if (def.name.toLowerCase() === lower) return def.epsg;
  }
  // Embedded EPSG code anywhere in the text, e.g. "MGA2020 z52 (EPSG:7852)".
  const embedded = text.match(/epsg\s*:?\s*(\d{4,5})/i);
  if (embedded) return Number(embedded[1]);
  return undefined;
}

/** Resolve a grid definition from an EPSG code / string; undefined if unknown. */
export function resolveGrid(
  value: number | string | undefined | null
): GridDefinition | undefined {
  const epsg = parseEpsgCode(value);
  if (epsg === undefined) return undefined;
  return REGISTRY.get(epsg);
}

/** Rough Australian mainland + Tasmania bounding box for MGA suggestions. */
function isAustralia(lat: number, lon: number): boolean {
  return lat >= -44.5 && lat <= -9 && lon >= 112 && lon <= 154;
}

/**
 * Suggest the natural grid for a lat/long: MGA2020 inside Australia,
 * otherwise the WGS84 UTM zone for the hemisphere.
 */
export function suggestGridForLatLon(
  latitudeDeg: number,
  longitudeDeg: number
): GridDefinition | undefined {
  if (
    !Number.isFinite(latitudeDeg) ||
    !Number.isFinite(longitudeDeg) ||
    Math.abs(latitudeDeg) > 90
  ) {
    return undefined;
  }
  const lon = ((((longitudeDeg + 180) % 360) + 360) % 360) - 180;
  const zone = Math.min(60, Math.max(1, Math.floor((lon + 180) / 6) + 1));
  if (isAustralia(latitudeDeg, lon)) {
    const mga = REGISTRY.get(7800 + zone);
    if (mga) return mga;
  }
  const epsg = (latitudeDeg < 0 ? 32700 : 32600) + zone;
  return REGISTRY.get(epsg);
}

const WGS84_DEF = "+proj=longlat +datum=WGS84 +no_defs";

/**
 * Convert lat/long (degrees, on the grid's datum) to grid easting/northing.
 * Returns undefined for unrecognized EPSG codes or non-finite input.
 */
export function latLonToGrid(
  epsg: number | string | undefined | null,
  point: LatLon
): GridPosition | undefined {
  const grid = resolveGrid(epsg);
  if (!grid) return undefined;
  const { latitudeDeg, longitudeDeg } = point;
  if (
    !Number.isFinite(latitudeDeg) ||
    !Number.isFinite(longitudeDeg) ||
    Math.abs(latitudeDeg) > 90
  ) {
    return undefined;
  }
  const [easting, northing] = proj4(WGS84_DEF, grid.proj4def, [longitudeDeg, latitudeDeg]);
  if (!Number.isFinite(easting) || !Number.isFinite(northing)) return undefined;
  return { easting, northing };
}

/**
 * Convert grid easting/northing back to lat/long (degrees, on the grid's
 * datum). Returns undefined for unrecognized EPSG codes or non-finite input.
 */
export function gridToLatLon(
  epsg: number | string | undefined | null,
  position: GridPosition
): LatLon | undefined {
  const grid = resolveGrid(epsg);
  if (!grid) return undefined;
  const { easting, northing } = position;
  if (!Number.isFinite(easting) || !Number.isFinite(northing)) return undefined;
  const [longitudeDeg, latitudeDeg] = proj4(grid.proj4def, WGS84_DEF, [easting, northing]);
  if (!Number.isFinite(latitudeDeg) || !Number.isFinite(longitudeDeg)) return undefined;
  return { latitudeDeg, longitudeDeg };
}

/**
 * Grid convergence at a point, in the app's azimuth convention:
 * degrees added to a GRID azimuth to obtain the TRUE azimuth (east-positive),
 * matching `ReferenceSystemConfig.gridRotationDeg`.
 *
 * Note: survey-control listings that follow the GDA technical-manual
 * convention ("added to a true azimuth to obtain a grid bearing") quote the
 * same angle with the opposite sign.
 *
 * Computed by finite difference — project the point and a second point a
 * small step along the true-north meridian; the grid bearing of true north
 * is atan2(dE, dN), and the returned value is its negation. This works for
 * any projection in the registry without projection-specific formulas.
 */
export function gridConvergenceDeg(
  epsg: number | string | undefined | null,
  latitudeDeg: number,
  longitudeDeg: number
): number | undefined {
  const grid = resolveGrid(epsg);
  if (!grid) return undefined;
  const base = latLonToGrid(grid.epsg, { latitudeDeg, longitudeDeg });
  if (!base) return undefined;
  // ~11 m step due true north; small enough that meridian curvature in the
  // projected plane is negligible, large enough to stay clear of float noise.
  const deltaDeg = 1e-4;
  const stepLat = latitudeDeg + (latitudeDeg > 89.99 ? -deltaDeg : deltaDeg);
  const moved = latLonToGrid(grid.epsg, { latitudeDeg: stepLat, longitudeDeg });
  if (!moved) return undefined;
  const sign = stepLat > latitudeDeg ? 1 : -1;
  const dE = sign * (moved.easting - base.easting);
  const dN = sign * (moved.northing - base.northing);
  const gridBearingOfTrueNorth = (Math.atan2(dE, dN) * 180) / Math.PI;
  return -gridBearingOfTrueNorth;
}
