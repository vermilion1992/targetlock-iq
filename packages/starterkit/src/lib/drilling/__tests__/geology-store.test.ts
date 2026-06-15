import { afterEach, describe, expect, it, vi } from "vitest";

import type { ParsedGeologyMesh } from "../geology-import";
import {
  GEOLOGY_MAX_BYTES,
  GEOLOGY_STORAGE_KEY,
  GEOLOGY_WARN_BYTES,
  assetsForProgram,
  checkGeologyFramePlacement,
  defaultGeologyTransform,
  emptyGeologyStore,
  frameDepthFromFileZ,
  frameGeologyMesh,
  geologySizeStatus,
  holeFrameExtents,
  inferAssetKind,
  loadGeologyStore,
  nextAssetColor,
  removeGeologyAsset,
  saveGeologyStore,
  updateGeologyAsset,
  upsertGeologyAsset,
  type GeologyAsset,
} from "../geology-store";

function mesh(overrides: Partial<ParsedGeologyMesh> = {}): ParsedGeologyMesh {
  return {
    name: "ore",
    vertices: [0, 0, 400, 10, 0, 400, 0, 10, 400],
    triangles: [0, 1, 2],
    polylines: [],
    boundingBox: { min: [0, 0, 400], max: [10, 10, 400] },
    vertexCount: 3,
    triangleCount: 1,
    ...overrides,
  };
}

function asset(overrides: Partial<GeologyAsset> = {}): GeologyAsset {
  return {
    id: "geo-1",
    programId: "prog-1",
    name: "Ore shell",
    kind: "surface",
    mesh: mesh(),
    color: "#d97706",
    opacity: 0.5,
    visible: true,
    transform: defaultGeologyTransform("elevation"),
    sourceFilename: "ore.obj",
    createdAt: "2026-06-11T00:00:00.000Z",
    ...overrides,
  };
}

describe("frameDepthFromFileZ", () => {
  it("elevation convention: frame d = -RL (round-trips the TargetLock DXF export)", () => {
    const t = defaultGeologyTransform("elevation");
    // Point at RL 420 → frame d -420, same as a collar at RL 420.
    expect(frameDepthFromFileZ(420, t)).toBe(-420);
    // Below sea level (RL -100) → frame d 100.
    expect(frameDepthFromFileZ(-100, t)).toBe(100);
    expect(frameDepthFromFileZ(0, t)).toBe(0);
  });

  it("depth convention: file Z is already depth below the RL-0 datum", () => {
    const t = defaultGeologyTransform("depth");
    expect(frameDepthFromFileZ(520, t)).toBe(520);
    expect(frameDepthFromFileZ(0, t)).toBe(0);
  });
});

describe("frameGeologyMesh", () => {
  it("applies E/N offsets and depth conversion with bounds", () => {
    // Mesh vertices at RL 400 → frame d -400.
    const framed = frameGeologyMesh(mesh(), {
      offsetE: 500000,
      offsetN: 7000000,
      zConvention: "elevation",
    });
    expect(framed.positions.slice(0, 3)).toEqual([500000, 7000000, -400]);
    expect(framed.bounds).toEqual({
      minE: 500000,
      maxE: 500010,
      minN: 7000000,
      maxN: 7000010,
      minD: -400,
      maxD: -400,
    });
    expect(framed.indices).toEqual([0, 1, 2]);
  });

  it("returns null bounds for an empty mesh", () => {
    const framed = frameGeologyMesh(
      mesh({ vertices: [], triangles: [], vertexCount: 0, triangleCount: 0 }),
      defaultGeologyTransform()
    );
    expect(framed.bounds).toBeNull();
  });
});

describe("store CRUD", () => {
  it("upserts, updates, and removes assets", () => {
    let store = emptyGeologyStore();
    store = upsertGeologyAsset(store, asset());
    store = upsertGeologyAsset(store, asset({ id: "geo-2", programId: "prog-2" }));
    expect(store.assets).toHaveLength(2);

    // Upsert replaces by id.
    store = upsertGeologyAsset(store, asset({ name: "Renamed" }));
    expect(store.assets).toHaveLength(2);

    store = updateGeologyAsset(store, "geo-1", { visible: false, opacity: 0.2 });
    const updated = store.assets.find((a) => a.id === "geo-1");
    expect(updated?.visible).toBe(false);
    expect(updated?.opacity).toBe(0.2);

    expect(assetsForProgram(store, "prog-1").map((a) => a.id)).toEqual(["geo-1"]);

    store = removeGeologyAsset(store, "geo-1");
    expect(store.assets.map((a) => a.id)).toEqual(["geo-2"]);
  });

  it("infers asset kind from triangle count", () => {
    expect(inferAssetKind(mesh())).toBe("surface");
    expect(
      inferAssetKind(mesh({ triangles: [], triangleCount: 0, polylines: [[0, 1]] }))
    ).toBe("wireframe");
  });

  it("cycles asset colors", () => {
    expect(nextAssetColor([])).toBe("#d97706");
    expect(nextAssetColor([asset()])).not.toBe(nextAssetColor([]));
  });
});

describe("persistence", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an empty store outside the browser", () => {
    expect(loadGeologyStore()).toEqual(emptyGeologyStore());
    expect(saveGeologyStore(emptyGeologyStore())).toBe(false);
  });

  it("round-trips through localStorage and survives corrupt payloads", () => {
    const backing = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => backing.get(k) ?? null,
        setItem: (k: string, v: string) => backing.set(k, v),
      },
    });

    const store = upsertGeologyAsset(emptyGeologyStore(), asset());
    expect(saveGeologyStore(store)).toBe(true);
    expect(loadGeologyStore().assets).toHaveLength(1);

    backing.set(GEOLOGY_STORAGE_KEY, "{not json");
    expect(loadGeologyStore()).toEqual(emptyGeologyStore());

    backing.set(GEOLOGY_STORAGE_KEY, JSON.stringify({ version: 9, assets: "x" }));
    expect(loadGeologyStore()).toEqual(emptyGeologyStore());
  });

  it("normalizes legacy stored transforms (negative-down / datumRl)", () => {
    const backing = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => backing.get(k) ?? null,
        setItem: (k: string, v: string) => backing.set(k, v),
      },
    });

    const legacy = {
      version: 1,
      assets: [
        {
          ...asset(),
          transform: {
            offsetE: 10,
            offsetN: 20,
            datumRl: 420,
            zConvention: "negative-down",
          },
        },
      ],
    };
    backing.set(GEOLOGY_STORAGE_KEY, JSON.stringify(legacy));

    const loaded = loadGeologyStore();
    expect(loaded.assets).toHaveLength(1);
    expect(loaded.assets[0]!.transform).toEqual({
      offsetE: 10,
      offsetN: 20,
      zConvention: "elevation",
    });
  });
});

describe("size guard", () => {
  it("flags warn and block levels by serialized size", () => {
    const ok = geologySizeStatus(emptyGeologyStore());
    expect(ok.level).toBe("ok");
    expect(ok.message).toBeNull();

    // Pad a fake mesh to cross thresholds without huge allocations.
    const padded = (bytes: number) =>
      upsertGeologyAsset(
        emptyGeologyStore(),
        asset({ name: "x".repeat(bytes) })
      );

    const warn = geologySizeStatus(padded(GEOLOGY_WARN_BYTES));
    expect(warn.level).toBe("warn");
    expect(warn.message).toContain("approaching");

    const block = geologySizeStatus(padded(GEOLOGY_MAX_BYTES));
    expect(block.level).toBe("block");
    expect(block.message).toContain("Remove an asset or decimate");
  });
});

describe("frame placement check", () => {
  const holes = holeFrameExtents([
    [
      { e: 500000, n: 7000000 },
      { e: 500100, n: 7000100 },
    ],
  ]);

  it("accepts meshes overlapping or near the program extents", () => {
    const framed = frameGeologyMesh(mesh(), {
      offsetE: 500000,
      offsetN: 7000000,
      zConvention: "elevation",
    });
    expect(checkGeologyFramePlacement(framed, holes)).toBeNull();
  });

  it("warns when the mesh is kilometres from the collars", () => {
    const framed = frameGeologyMesh(mesh(), defaultGeologyTransform("elevation"));
    const warning = checkGeologyFramePlacement(framed, holes);
    expect(warning).toContain("km from your program collars");
  });

  it("stays silent without bounds or hole extents", () => {
    const framed = frameGeologyMesh(mesh(), defaultGeologyTransform());
    expect(checkGeologyFramePlacement(framed, null)).toBeNull();
    expect(holeFrameExtents([])).toBeNull();
  });
});
