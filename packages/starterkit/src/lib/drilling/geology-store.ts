import type { ParsedGeologyMesh } from "./geology-import";

/**
 * Program-scoped persistence for imported geology meshes.
 *
 * Deliberately a separate localStorage key from the hole library: meshes are
 * large, and keeping them out of HoleLibrary avoids re-serialising geometry on
 * every library save and leaves the package/import format untouched.
 *
 * Frame convention (matches planner-spatial map frame):
 * - e = file X + offsetE, n = file Y + offsetN
 * - d is down-positive depth below the RL-0 datum, so RL = -d.
 *   - "elevation" files (Z = true RL, the mining-package norm and the
 *     TargetLock DXF export convention): d = -z — exact round-trip with
 *     our own exports.
 *   - "depth" files (Z = depth, positive down): d = z.
 */

export type GeologyZConvention = "elevation" | "depth";

export type GeologyTransform = {
  offsetE: number;
  offsetN: number;
  zConvention: GeologyZConvention;
};

export type GeologyAssetKind = "surface" | "wireframe";

export type GeologyAsset = {
  id: string;
  programId: string;
  name: string;
  kind: GeologyAssetKind;
  mesh: ParsedGeologyMesh;
  /** CSS color for rendering. */
  color: string;
  /** 0..1 mesh opacity. */
  opacity: number;
  visible: boolean;
  transform: GeologyTransform;
  sourceFilename: string;
  createdAt: string;
};

export type GeologyStore = {
  version: 1;
  assets: GeologyAsset[];
};

export const GEOLOGY_STORAGE_KEY = "targetlock-iq-geology-v1";

/** Soft warning above this serialized size (localStorage quota headroom). */
export const GEOLOGY_WARN_BYTES = 2_500_000;
/** Hard block above this serialized size. */
export const GEOLOGY_MAX_BYTES = 4_500_000;

export const GEOLOGY_ASSET_COLORS = [
  "#d97706", // amber — ore/lode
  "#0ea5e9", // sky — water table / topo
  "#10b981", // emerald
  "#a855f7", // violet
  "#f43f5e", // rose
  "#84cc16", // lime
] as const;

export function emptyGeologyStore(): GeologyStore {
  return { version: 1, assets: [] };
}

/**
 * Tolerate transforms persisted before the RL-0 frame fix: the retired
 * "negative-down" convention is numerically identical to "elevation" in the
 * new frame (d = -z), and the dropped `datumRl` field is simply ignored.
 */
function normalizeStoredTransform(raw: GeologyTransform & { datumRl?: number }): GeologyTransform {
  const zConvention: GeologyZConvention =
    raw.zConvention === "depth" ? "depth" : "elevation";
  return {
    offsetE: Number.isFinite(raw.offsetE) ? raw.offsetE : 0,
    offsetN: Number.isFinite(raw.offsetN) ? raw.offsetN : 0,
    zConvention,
  };
}

export function loadGeologyStore(): GeologyStore {
  if (typeof window === "undefined") return emptyGeologyStore();
  try {
    const raw = window.localStorage.getItem(GEOLOGY_STORAGE_KEY);
    if (!raw) return emptyGeologyStore();
    const parsed = JSON.parse(raw) as GeologyStore;
    if (parsed?.version !== 1 || !Array.isArray(parsed.assets)) {
      return emptyGeologyStore();
    }
    return {
      version: 1,
      assets: parsed.assets.map((a) => ({
        ...a,
        transform: normalizeStoredTransform(a.transform),
      })),
    };
  } catch {
    return emptyGeologyStore();
  }
}

export function saveGeologyStore(store: GeologyStore): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(GEOLOGY_STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    // Quota exceeded or storage unavailable.
    return false;
  }
}

export function assetsForProgram(
  store: GeologyStore,
  programId: string
): GeologyAsset[] {
  return store.assets.filter((a) => a.programId === programId);
}

export function upsertGeologyAsset(
  store: GeologyStore,
  asset: GeologyAsset
): GeologyStore {
  const others = store.assets.filter((a) => a.id !== asset.id);
  return { version: 1, assets: [...others, asset] };
}

export function updateGeologyAsset(
  store: GeologyStore,
  assetId: string,
  patch: Partial<Omit<GeologyAsset, "id" | "mesh">>
): GeologyStore {
  return {
    version: 1,
    assets: store.assets.map((a) => (a.id === assetId ? { ...a, ...patch } : a)),
  };
}

export function removeGeologyAsset(
  store: GeologyStore,
  assetId: string
): GeologyStore {
  return { version: 1, assets: store.assets.filter((a) => a.id !== assetId) };
}

export function inferAssetKind(mesh: ParsedGeologyMesh): GeologyAssetKind {
  return mesh.triangleCount > 0 ? "surface" : "wireframe";
}

export function nextAssetColor(existing: GeologyAsset[]): string {
  return GEOLOGY_ASSET_COLORS[existing.length % GEOLOGY_ASSET_COLORS.length];
}

export function defaultGeologyTransform(
  zConvention: GeologyZConvention = "elevation"
): GeologyTransform {
  return { offsetE: 0, offsetN: 0, zConvention };
}

/* ------------------------------------------------------------------ */
/* Frame transform                                                      */
/* ------------------------------------------------------------------ */

export function frameDepthFromFileZ(z: number, transform: GeologyTransform): number {
  // "depth": file Z is already depth below the RL-0 datum (down-positive).
  if (transform.zConvention === "depth") return z;
  // "elevation": file Z is a true RL, so depth below the RL-0 datum = -z.
  return z === 0 ? 0 : -z;
}

export type FramedGeologyMesh = {
  /** Flat frame-space positions [e0, n0, d0, e1, n1, d1, ...]. */
  positions: number[];
  /** Triangle indices (shared with source mesh). */
  indices: number[];
  /** Polylines as vertex index arrays (shared with source mesh). */
  polylines: number[][];
  bounds: {
    minE: number;
    maxE: number;
    minN: number;
    maxN: number;
    minD: number;
    maxD: number;
  } | null;
};

/** Transform a parsed mesh from file coordinates into the planner map frame. */
export function frameGeologyMesh(
  mesh: ParsedGeologyMesh,
  transform: GeologyTransform
): FramedGeologyMesh {
  const positions: number[] = new Array(mesh.vertices.length);
  let minE = Infinity;
  let maxE = -Infinity;
  let minN = Infinity;
  let maxN = -Infinity;
  let minD = Infinity;
  let maxD = -Infinity;

  for (let i = 0; i + 2 < mesh.vertices.length; i += 3) {
    const e = mesh.vertices[i] + transform.offsetE;
    const n = mesh.vertices[i + 1] + transform.offsetN;
    const d = frameDepthFromFileZ(mesh.vertices[i + 2], transform);
    positions[i] = e;
    positions[i + 1] = n;
    positions[i + 2] = d;
    if (e < minE) minE = e;
    if (e > maxE) maxE = e;
    if (n < minN) minN = n;
    if (n > maxN) maxN = n;
    if (d < minD) minD = d;
    if (d > maxD) maxD = d;
  }

  return {
    positions,
    indices: mesh.triangles,
    polylines: mesh.polylines,
    bounds:
      positions.length >= 3
        ? { minE, maxE, minN, maxN, minD, maxD }
        : null,
  };
}

/* ------------------------------------------------------------------ */
/* Size guard                                                           */
/* ------------------------------------------------------------------ */

export type GeologySizeStatus = {
  bytes: number;
  level: "ok" | "warn" | "block";
  message: string | null;
};

export function estimateGeologyStoreBytes(store: GeologyStore): number {
  return JSON.stringify(store).length;
}

export function geologySizeStatus(store: GeologyStore): GeologySizeStatus {
  const bytes = estimateGeologyStoreBytes(store);
  if (bytes > GEOLOGY_MAX_BYTES) {
    return {
      bytes,
      level: "block",
      message:
        `Geology storage is ${(bytes / 1_000_000).toFixed(1)} MB — above the ` +
        `${(GEOLOGY_MAX_BYTES / 1_000_000).toFixed(1)} MB browser-storage budget. ` +
        `Remove an asset or decimate meshes in your mining package before importing more.`,
    };
  }
  if (bytes > GEOLOGY_WARN_BYTES) {
    return {
      bytes,
      level: "warn",
      message:
        `Geology storage is ${(bytes / 1_000_000).toFixed(1)} MB — approaching the ` +
        `${(GEOLOGY_MAX_BYTES / 1_000_000).toFixed(1)} MB browser-storage budget.`,
    };
  }
  return { bytes, level: "ok", message: null };
}

/* ------------------------------------------------------------------ */
/* Frame sanity check                                                   */
/* ------------------------------------------------------------------ */

export type FrameExtents = {
  minE: number;
  maxE: number;
  minN: number;
  maxN: number;
};

/**
 * Warn when a framed mesh sits far from the program hole extents — almost
 * always a wrong offset or Z convention rather than real geometry.
 * Returns a human-readable warning or null when the placement looks sane.
 */
export function checkGeologyFramePlacement(
  framed: FramedGeologyMesh,
  holeExtents: FrameExtents | null,
  toleranceM = 2_000
): string | null {
  if (!framed.bounds || !holeExtents) return null;
  const b = framed.bounds;

  const gapE = Math.max(0, holeExtents.minE - b.maxE, b.minE - holeExtents.maxE);
  const gapN = Math.max(0, holeExtents.minN - b.maxN, b.minN - holeExtents.maxN);
  const gap = Math.hypot(gapE, gapN);

  if (gap <= toleranceM) return null;
  const km = gap / 1000;
  return (
    `Mesh is ${km >= 10 ? km.toFixed(0) : km.toFixed(1)} km from your program collars — ` +
    `check the E/N offsets and Z convention before trusting the scene.`
  );
}

/** Bounding extents of program hole traces in the shared map frame. */
export function holeFrameExtents(
  traces: { e: number; n: number }[][]
): FrameExtents | null {
  let minE = Infinity;
  let maxE = -Infinity;
  let minN = Infinity;
  let maxN = -Infinity;
  let any = false;
  for (const trace of traces) {
    for (const p of trace) {
      any = true;
      if (p.e < minE) minE = p.e;
      if (p.e > maxE) maxE = p.e;
      if (p.n < minN) minN = p.n;
      if (p.n > maxN) maxN = p.n;
    }
  }
  return any ? { minE, maxE, minN, maxN } : null;
}

export function createGeologyAssetId(): string {
  return `geo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
