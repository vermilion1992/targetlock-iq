import { describe, expect, it } from "vitest";

import {
  GEOLOGY_MAX_VERTICES,
  GEOLOGY_WARN_VERTICES,
  computeBoundingBox,
  detectGeologyFormat,
  parseGeologyFile,
} from "../geology-import";

const OBJ_TRIANGLE = `
o LodeSurface
v 0 0 100
v 10 0 100
v 0 10 100
f 1 2 3
`;

const OBJ_QUAD = `
v 0 0 0
v 10 0 0
v 10 10 0
v 0 10 0
f 1 2 3 4
`;

function dxfPairs(rows: (string | number)[]): string {
  return rows.join("\n") + "\n";
}

const DXF_3DFACE = dxfPairs([
  0, "SECTION", 2, "ENTITIES",
  0, "3DFACE", 8, "ORE",
  10, 0, 20, 0, 30, 50,
  11, 10, 21, 0, 31, 50,
  12, 10, 22, 10, 32, 50,
  13, 0, 23, 10, 33, 50,
  0, "ENDSEC", 0, "EOF",
]);

const DXF_POLYFACE = dxfPairs([
  0, "SECTION", 2, "ENTITIES",
  0, "POLYLINE", 8, "ORE", 66, 1, 70, 64,
  0, "VERTEX", 8, "ORE", 10, 0, 20, 0, 30, 0, 70, 192,
  0, "VERTEX", 8, "ORE", 10, 10, 20, 0, 30, 0, 70, 192,
  0, "VERTEX", 8, "ORE", 10, 10, 20, 10, 30, 0, 70, 192,
  0, "VERTEX", 8, "ORE", 10, 0, 20, 10, 30, 0, 70, 192,
  0, "VERTEX", 8, "ORE", 70, 128, 71, 1, 72, 2, 73, 3, 74, 4,
  0, "SEQEND", 8, "ORE",
  0, "ENDSEC", 0, "EOF",
]);

const DXF_POLYLINE = dxfPairs([
  0, "SECTION", 2, "ENTITIES",
  0, "POLYLINE", 8, "STRING", 66, 1, 70, 8,
  0, "VERTEX", 8, "STRING", 10, 0, 20, 0, 30, 0, 70, 32,
  0, "VERTEX", 8, "STRING", 10, 5, 20, 5, 30, -2, 70, 32,
  0, "VERTEX", 8, "STRING", 10, 10, 20, 10, 30, -4, 70, 32,
  0, "SEQEND", 8, "STRING",
  0, "ENDSEC", 0, "EOF",
]);

describe("detectGeologyFormat", () => {
  it("detects by extension", () => {
    expect(detectGeologyFormat("ore_shell.obj", "")).toBe("obj");
    expect(detectGeologyFormat("Topo_Surface.DXF", "")).toBe("dxf");
  });

  it("sniffs content for renamed files", () => {
    expect(detectGeologyFormat("mesh.txt", OBJ_TRIANGLE)).toBe("obj");
    expect(detectGeologyFormat("mesh.txt", DXF_3DFACE)).toBe("dxf");
  });

  it("returns null for unknown content", () => {
    expect(detectGeologyFormat("data.csv", "a,b,c\n1,2,3\n")).toBeNull();
  });
});

describe("parseGeologyFile (OBJ)", () => {
  it("parses a triangle mesh and picks up the object name", () => {
    const result = parseGeologyFile("ore.obj", OBJ_TRIANGLE);
    expect(result.ok).toBe(true);
    expect(result.mesh?.name).toBe("LodeSurface");
    expect(result.mesh?.vertexCount).toBe(3);
    expect(result.mesh?.triangleCount).toBe(1);
    expect(result.mesh?.boundingBox).toEqual({
      min: [0, 0, 100],
      max: [10, 10, 100],
    });
  });

  it("fan-triangulates quads and n-gons", () => {
    const result = parseGeologyFile("quad.obj", OBJ_QUAD);
    expect(result.ok).toBe(true);
    expect(result.mesh?.triangleCount).toBe(2);
  });

  it("handles v/vt/vn face tokens and negative indices", () => {
    const obj = `
v 0 0 0
v 1 0 0
v 0 1 0
f -3/1/1 -2/2/2 -1/3/3
`;
    const result = parseGeologyFile("tokens.obj", obj);
    expect(result.ok).toBe(true);
    expect(result.mesh?.triangleCount).toBe(1);
  });

  it("parses l rows as polylines", () => {
    const obj = `
v 0 0 0
v 5 0 0
v 10 0 0
l 1 2 3
`;
    const result = parseGeologyFile("string.obj", obj);
    expect(result.ok).toBe(true);
    expect(result.mesh?.polylines).toEqual([[0, 1, 2]]);
    expect(result.mesh?.triangleCount).toBe(0);
  });

  it("deduplicates identical vertices", () => {
    const obj = `
v 0 0 0
v 1 0 0
v 0 1 0
v 0 0 0
v 1 0 0
v 1 1 0
f 1 2 3
f 4 5 6
`;
    const result = parseGeologyFile("dedup.obj", obj);
    expect(result.ok).toBe(true);
    expect(result.mesh?.vertexCount).toBe(4);
    expect(result.mesh?.triangleCount).toBe(2);
  });

  it("warns about face rows referencing missing vertices", () => {
    const obj = `
v 0 0 0
v 1 0 0
v 0 1 0
f 1 2 3
f 1 2 99
`;
    const result = parseGeologyFile("bad-face.obj", obj);
    expect(result.ok).toBe(true);
    expect(result.mesh?.triangleCount).toBe(1);
    expect(result.warnings.some((w) => w.includes("skipped"))).toBe(true);
  });

  it("rejects vertices with non-numeric coordinates", () => {
    const result = parseGeologyFile("bad.obj", "v 0 zero 0\nf 1 1 1\n");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("non-numeric"))).toBe(true);
  });

  it("rejects an empty file", () => {
    const result = parseGeologyFile("empty.obj", "# nothing here\n");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("No geometry"))).toBe(true);
  });

  it("rejects vertices-only files with nothing to render", () => {
    const result = parseGeologyFile("verts.obj", "v 0 0 0\nv 1 1 1\n");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("no faces or polylines"))).toBe(true);
  });
});

describe("parseGeologyFile (DXF)", () => {
  it("parses 3DFACE quads as two triangles", () => {
    const result = parseGeologyFile("faces.dxf", DXF_3DFACE);
    expect(result.ok).toBe(true);
    expect(result.mesh?.vertexCount).toBe(4);
    expect(result.mesh?.triangleCount).toBe(2);
  });

  it("parses 3DFACE triangles (4th corner repeats 3rd)", () => {
    const dxf = dxfPairs([
      0, "SECTION", 2, "ENTITIES",
      0, "3DFACE", 8, "ORE",
      10, 0, 20, 0, 30, 0,
      11, 10, 21, 0, 31, 0,
      12, 10, 22, 10, 32, 0,
      13, 10, 23, 10, 33, 0,
      0, "ENDSEC", 0, "EOF",
    ]);
    const result = parseGeologyFile("tri.dxf", dxf);
    expect(result.ok).toBe(true);
    expect(result.mesh?.triangleCount).toBe(1);
  });

  it("parses polyface meshes (flag 64) with face records", () => {
    const result = parseGeologyFile("polyface.dxf", DXF_POLYFACE);
    expect(result.ok).toBe(true);
    expect(result.mesh?.vertexCount).toBe(4);
    expect(result.mesh?.triangleCount).toBe(2);
    expect(result.mesh?.polylines).toEqual([]);
  });

  it("parses 3D polylines as wireframe strings", () => {
    const result = parseGeologyFile("string.dxf", DXF_POLYLINE);
    expect(result.ok).toBe(true);
    expect(result.mesh?.polylines).toHaveLength(1);
    expect(result.mesh?.polylines[0]).toHaveLength(3);
    expect(result.mesh?.triangleCount).toBe(0);
  });

  it("closes closed polylines back to the start vertex", () => {
    const dxf = dxfPairs([
      0, "SECTION", 2, "ENTITIES",
      0, "POLYLINE", 8, "PIT", 66, 1, 70, 9, // 8 (3D) + 1 (closed)
      0, "VERTEX", 8, "PIT", 10, 0, 20, 0, 30, 0, 70, 32,
      0, "VERTEX", 8, "PIT", 10, 10, 20, 0, 30, 0, 70, 32,
      0, "VERTEX", 8, "PIT", 10, 10, 20, 10, 30, 0, 70, 32,
      0, "SEQEND", 8, "PIT",
      0, "ENDSEC", 0, "EOF",
    ]);
    const result = parseGeologyFile("pit.dxf", dxf);
    expect(result.ok).toBe(true);
    const line = result.mesh?.polylines[0];
    expect(line?.[0]).toBe(line?.[line.length - 1]);
  });

  it("parses LWPOLYLINE with elevation and LINE entities", () => {
    const dxf = dxfPairs([
      0, "SECTION", 2, "ENTITIES",
      0, "LWPOLYLINE", 8, "CONTOUR", 38, 420, 70, 0,
      10, 0, 20, 0,
      10, 5, 20, 5,
      0, "LINE", 8, "SEC",
      10, 0, 20, 0, 30, 0,
      11, 100, 21, 100, 31, -50,
      0, "ENDSEC", 0, "EOF",
    ]);
    const result = parseGeologyFile("mixed.dxf", dxf);
    expect(result.ok).toBe(true);
    expect(result.mesh?.polylines).toHaveLength(2);
    // LWPOLYLINE vertices carry the elevation as Z.
    expect(result.mesh?.vertices.slice(0, 3)).toEqual([0, 0, 420]);
  });

  it("warns about unsupported solid entities", () => {
    const dxf = dxfPairs([
      0, "SECTION", 2, "ENTITIES",
      0, "3DSOLID", 8, "SOLID",
      0, "LINE", 8, "SEC",
      10, 0, 20, 0, 30, 0,
      11, 1, 21, 1, 31, 1,
      0, "ENDSEC", 0, "EOF",
    ]);
    const result = parseGeologyFile("solid.dxf", dxf);
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.includes("skipped"))).toBe(true);
  });

  it("rejects files with no parsable geometry", () => {
    const dxf = dxfPairs([0, "SECTION", 2, "ENTITIES", 0, "ENDSEC", 0, "EOF"]);
    const result = parseGeologyFile("empty.dxf", dxf);
    expect(result.ok).toBe(false);
  });
});

describe("vertex budget", () => {
  function objWithVertices(count: number): string {
    const rows: string[] = [];
    for (let i = 0; i < count; i += 1) {
      rows.push(`v ${i} ${i * 2} ${i * 3}`);
    }
    rows.push("f 1 2 3");
    return rows.join("\n");
  }

  it("warns above the soft vertex budget", () => {
    const result = parseGeologyFile("big.obj", objWithVertices(GEOLOGY_WARN_VERTICES + 1));
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.includes("Large mesh"))).toBe(true);
  });

  it("refuses above the hard vertex budget with decimation guidance", () => {
    const result = parseGeologyFile("huge.obj", objWithVertices(GEOLOGY_MAX_VERTICES + 1));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("Decimate"))).toBe(true);
  });
});

describe("computeBoundingBox", () => {
  it("returns null for empty vertices", () => {
    expect(computeBoundingBox([])).toBeNull();
  });

  it("computes min/max across all vertices", () => {
    expect(computeBoundingBox([0, 0, 0, -5, 10, 2, 3, -1, 7])).toEqual({
      min: [-5, -1, 0],
      max: [3, 10, 7],
    });
  });
});
