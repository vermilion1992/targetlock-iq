/**
 * Client-side parsers for geology wireframes/surfaces.
 *
 * Supported formats (plain text, no dependencies):
 * - OBJ: `v` vertices, `f` faces (fan-triangulated), `l` polylines.
 * - DXF: 3DFACE entities, POLYLINE polyface meshes (flag 64), plain
 *   POLYLINE/LWPOLYLINE/LINE entities as wireframe polylines.
 *
 * These cover the common Leapfrog / Surpac / Micromine / Vulcan wireframe
 * export paths. Coordinates are kept in the source file's frame; the geology
 * store applies Z-convention and offset transforms before rendering.
 */

export type GeologyBoundingBox = {
  min: [number, number, number];
  max: [number, number, number];
};

export type ParsedGeologyMesh = {
  name: string;
  /** Flat vertex array [x0, y0, z0, x1, y1, z1, ...] in source coordinates. */
  vertices: number[];
  /** Flat triangle index array [a0, b0, c0, a1, b1, c1, ...]. */
  triangles: number[];
  /** Polylines as arrays of vertex indices into `vertices`. */
  polylines: number[][];
  boundingBox: GeologyBoundingBox | null;
  vertexCount: number;
  triangleCount: number;
};

export type GeologyParseResult = {
  ok: boolean;
  mesh: ParsedGeologyMesh | null;
  errors: string[];
  warnings: string[];
};

export type GeologyFileFormat = "obj" | "dxf";

/** Hard refusal above this many vertices (localStorage + render budget). */
export const GEOLOGY_MAX_VERTICES = 150_000;
/** Soft warning above this many vertices. */
export const GEOLOGY_WARN_VERTICES = 60_000;

export function detectGeologyFormat(
  filename: string,
  text: string
): GeologyFileFormat | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".obj")) return "obj";
  if (lower.endsWith(".dxf")) return "dxf";
  // Content sniff as a fallback for renamed files.
  const head = text.slice(0, 4000);
  if (/^\s*(v|f|o|g)\s/m.test(head) && /^\s*v\s+-?\d/m.test(head)) return "obj";
  if (/^\s*0\s*\r?\n\s*SECTION/m.test(head) || /ENTITIES/.test(head)) return "dxf";
  return null;
}

export function parseGeologyFile(
  filename: string,
  text: string
): GeologyParseResult {
  const format = detectGeologyFormat(filename, text);
  if (!format) {
    return {
      ok: false,
      mesh: null,
      errors: [
        `Unrecognised file format for "${filename}". Supported: .obj (wavefront) and .dxf (3DFACE / polyface / polyline).`,
      ],
      warnings: [],
    };
  }
  const baseName = filename.replace(/\.[^.]+$/, "") || "geology";
  return format === "obj" ? parseObj(baseName, text) : parseDxf(baseName, text);
}

/* ------------------------------------------------------------------ */
/* Shared mesh builder                                                  */
/* ------------------------------------------------------------------ */

class MeshBuilder {
  vertices: number[] = [];
  triangles: number[] = [];
  polylines: number[][] = [];
  private keyToIndex = new Map<string, number>();

  /** Add a vertex, deduplicating to millimetre precision. */
  addVertex(x: number, y: number, z: number): number {
    const key = `${Math.round(x * 1000)},${Math.round(y * 1000)},${Math.round(z * 1000)}`;
    const existing = this.keyToIndex.get(key);
    if (existing !== undefined) return existing;
    const index = this.vertices.length / 3;
    this.vertices.push(x, y, z);
    this.keyToIndex.set(key, index);
    return index;
  }

  addTriangle(a: number, b: number, c: number): void {
    if (a === b || b === c || a === c) return; // degenerate
    this.triangles.push(a, b, c);
  }

  addPolyline(indices: number[]): void {
    if (indices.length >= 2) this.polylines.push(indices);
  }

  get vertexCount(): number {
    return this.vertices.length / 3;
  }

  build(name: string): ParsedGeologyMesh {
    return {
      name,
      vertices: this.vertices,
      triangles: this.triangles,
      polylines: this.polylines,
      boundingBox: computeBoundingBox(this.vertices),
      vertexCount: this.vertexCount,
      triangleCount: this.triangles.length / 3,
    };
  }
}

export function computeBoundingBox(vertices: number[]): GeologyBoundingBox | null {
  if (vertices.length < 3) return null;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i + 2 < vertices.length; i += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      const v = vertices[i + axis];
      if (v < min[axis]) min[axis] = v;
      if (v > max[axis]) max[axis] = v;
    }
  }
  return { min, max };
}

function finalize(
  builder: MeshBuilder,
  name: string,
  errors: string[],
  warnings: string[]
): GeologyParseResult {
  if (builder.vertexCount === 0) {
    errors.push("No geometry found in file — nothing to import.");
  } else if (builder.triangles.length === 0 && builder.polylines.length === 0) {
    errors.push(
      "File contains vertices but no faces or polylines TargetLock can render."
    );
  }

  if (builder.vertexCount > GEOLOGY_MAX_VERTICES) {
    errors.push(
      `Mesh has ${builder.vertexCount.toLocaleString()} vertices — above the ` +
        `${GEOLOGY_MAX_VERTICES.toLocaleString()} limit. Decimate the wireframe in your ` +
        `mining package (e.g. Leapfrog mesh simplification) and re-export.`
    );
  } else if (builder.vertexCount > GEOLOGY_WARN_VERTICES) {
    warnings.push(
      `Large mesh (${builder.vertexCount.toLocaleString()} vertices) — rendering and ` +
        `browser storage may be slow. Consider decimating before import.`
    );
  }

  const ok = errors.length === 0;
  return {
    ok,
    mesh: ok ? builder.build(name) : null,
    errors,
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/* OBJ                                                                  */
/* ------------------------------------------------------------------ */

function parseObj(defaultName: string, text: string): GeologyParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const builder = new MeshBuilder();

  // Raw OBJ vertex list (1-based indexing) mapped to deduped builder indices.
  const objIndexMap: number[] = [];
  let name = defaultName;
  let badFaceRows = 0;

  const lines = text.split(/\r?\n/);
  for (let lineNo = 0; lineNo < lines.length; lineNo += 1) {
    const line = lines[lineNo].trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    const keyword = parts[0];

    if (keyword === "o" || keyword === "g") {
      if (parts.length > 1 && name === defaultName) name = parts.slice(1).join(" ");
      continue;
    }

    if (keyword === "v") {
      const x = Number(parts[1]);
      const y = Number(parts[2]);
      const z = Number(parts[3]);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        errors.push(`OBJ line ${lineNo + 1}: vertex has non-numeric coordinates.`);
        objIndexMap.push(-1);
        continue;
      }
      objIndexMap.push(builder.addVertex(x, y, z));
      continue;
    }

    if (keyword === "f" || keyword === "l") {
      const resolved: number[] = [];
      let bad = false;
      for (const token of parts.slice(1)) {
        // Face tokens may be v, v/vt, v//vn, v/vt/vn — only the vertex index matters.
        const rawIndex = Number(token.split("/")[0]);
        if (!Number.isFinite(rawIndex) || rawIndex === 0) {
          bad = true;
          break;
        }
        const objIndex =
          rawIndex > 0 ? rawIndex - 1 : objIndexMap.length + rawIndex;
        const mapped = objIndexMap[objIndex];
        if (mapped === undefined || mapped < 0) {
          bad = true;
          break;
        }
        resolved.push(mapped);
      }
      if (bad || resolved.length < 2) {
        badFaceRows += 1;
        continue;
      }
      if (keyword === "l") {
        builder.addPolyline(resolved);
      } else if (resolved.length >= 3) {
        // Fan triangulation handles quads and n-gons.
        for (let i = 1; i + 1 < resolved.length; i += 1) {
          builder.addTriangle(resolved[0], resolved[i], resolved[i + 1]);
        }
      }
    }
    // vt / vn / usemtl / mtllib / s are ignored deliberately.
  }

  if (badFaceRows > 0) {
    warnings.push(
      `${badFaceRows} face/line row${badFaceRows === 1 ? "" : "s"} referenced missing or invalid vertices and were skipped.`
    );
  }

  return finalize(builder, name, errors, warnings);
}

/* ------------------------------------------------------------------ */
/* DXF                                                                  */
/* ------------------------------------------------------------------ */

type DxfPair = { code: number; value: string };

function tokenizeDxf(text: string): DxfPair[] {
  const lines = text.split(/\r?\n/);
  const pairs: DxfPair[] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i].trim());
    if (!Number.isFinite(code)) continue;
    pairs.push({ code, value: lines[i + 1].trim() });
  }
  return pairs;
}

function parseDxf(defaultName: string, text: string): GeologyParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const builder = new MeshBuilder();

  const pairs = tokenizeDxf(text);
  if (pairs.length === 0) {
    return {
      ok: false,
      mesh: null,
      errors: ["DXF file could not be tokenized — expected alternating group code / value lines."],
      warnings: [],
    };
  }

  // Locate ENTITIES section; fall back to whole file for fragment exports.
  let start = 0;
  let end = pairs.length;
  for (let i = 0; i + 1 < pairs.length; i += 1) {
    if (pairs[i].code === 0 && pairs[i].value === "SECTION") {
      if (pairs[i + 1]?.code === 2 && pairs[i + 1].value === "ENTITIES") {
        start = i + 2;
        for (let j = start; j < pairs.length; j += 1) {
          if (pairs[j].code === 0 && pairs[j].value === "ENDSEC") {
            end = j;
            break;
          }
        }
        break;
      }
    }
  }

  // Group into entities (split on code 0).
  type Entity = { type: string; pairs: DxfPair[] };
  const entities: Entity[] = [];
  let current: Entity | null = null;
  for (let i = start; i < end; i += 1) {
    const p = pairs[i];
    if (p.code === 0) {
      current = { type: p.value.toUpperCase(), pairs: [] };
      entities.push(current);
    } else if (current) {
      current.pairs.push(p);
    }
  }

  const numOf = (entity: Entity, code: number, fallback = 0): number => {
    const found = entity.pairs.find((p) => p.code === code);
    const value = found ? Number(found.value) : NaN;
    return Number.isFinite(value) ? value : fallback;
  };

  let unsupported = 0;
  let i = 0;
  while (i < entities.length) {
    const entity = entities[i];

    if (entity.type === "3DFACE") {
      const corners: number[] = [];
      for (let c = 0; c < 4; c += 1) {
        const x = numOf(entity, 10 + c, NaN);
        const y = numOf(entity, 20 + c, NaN);
        const z = numOf(entity, 30 + c, NaN);
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
          corners.push(builder.addVertex(x, y, z));
        }
      }
      if (corners.length >= 3) {
        builder.addTriangle(corners[0], corners[1], corners[2]);
        // 4th corner distinct from 3rd → quad as two triangles.
        if (corners.length === 4 && corners[3] !== corners[2]) {
          builder.addTriangle(corners[0], corners[2], corners[3]);
        }
      }
      i += 1;
      continue;
    }

    if (entity.type === "POLYLINE") {
      const flags = numOf(entity, 70, 0);
      const isPolyface = (flags & 64) !== 0;

      // Collect the VERTEX run until SEQEND.
      const vertexEntities: Entity[] = [];
      let j = i + 1;
      while (j < entities.length && entities[j].type === "VERTEX") {
        vertexEntities.push(entities[j]);
        j += 1;
      }
      if (j < entities.length && entities[j].type === "SEQEND") j += 1;

      if (isPolyface) {
        // Polyface mesh: coordinate vertices (flag 64 set, no 71) then face
        // records carrying 1-based indices in codes 71-74 (negative = hidden edge).
        const coordIndices: number[] = [];
        const faceRecords: Entity[] = [];
        for (const v of vertexEntities) {
          const vFlags = numOf(v, 70, 0);
          const hasFaceCodes = v.pairs.some((p) => p.code >= 71 && p.code <= 74);
          if ((vFlags & 128) !== 0 && hasFaceCodes) {
            faceRecords.push(v);
          } else {
            coordIndices.push(
              builder.addVertex(numOf(v, 10), numOf(v, 20), numOf(v, 30))
            );
          }
        }
        for (const face of faceRecords) {
          const ids = [71, 72, 73, 74]
            .map((code) => Math.abs(numOf(face, code, 0)))
            .filter((id) => id > 0 && id <= coordIndices.length)
            .map((id) => coordIndices[id - 1]);
          if (ids.length >= 3) {
            builder.addTriangle(ids[0], ids[1], ids[2]);
            if (ids.length === 4 && ids[3] !== ids[2]) {
              builder.addTriangle(ids[0], ids[2], ids[3]);
            }
          }
        }
      } else {
        // 3D/2D polyline → wireframe string.
        const indices = vertexEntities
          .filter((v) => !v.pairs.some((p) => p.code >= 71 && p.code <= 74))
          .map((v) => builder.addVertex(numOf(v, 10), numOf(v, 20), numOf(v, 30)));
        if ((flags & 1) !== 0 && indices.length >= 2) indices.push(indices[0]); // closed
        builder.addPolyline(indices);
      }
      i = j;
      continue;
    }

    if (entity.type === "LWPOLYLINE") {
      const elevation = numOf(entity, 38, 0);
      const flags = numOf(entity, 70, 0);
      const indices: number[] = [];
      let x: number | null = null;
      for (const p of entity.pairs) {
        if (p.code === 10) x = Number(p.value);
        else if (p.code === 20 && x !== null) {
          const y = Number(p.value);
          if (Number.isFinite(x) && Number.isFinite(y)) {
            indices.push(builder.addVertex(x, y, elevation));
          }
          x = null;
        }
      }
      if ((flags & 1) !== 0 && indices.length >= 2) indices.push(indices[0]);
      builder.addPolyline(indices);
      i += 1;
      continue;
    }

    if (entity.type === "LINE") {
      const a = builder.addVertex(numOf(entity, 10), numOf(entity, 20), numOf(entity, 30));
      const b = builder.addVertex(numOf(entity, 11), numOf(entity, 21), numOf(entity, 31));
      builder.addPolyline([a, b]);
      i += 1;
      continue;
    }

    if (entity.type === "MESH" || entity.type === "3DSOLID" || entity.type === "REGION") {
      unsupported += 1;
    }
    i += 1;
  }

  if (unsupported > 0) {
    warnings.push(
      `${unsupported} MESH/3DSOLID/REGION entit${unsupported === 1 ? "y was" : "ies were"} skipped — export wireframes as 3DFACE or polyface meshes instead.`
    );
  }

  return finalize(builder, defaultName, errors, warnings);
}
