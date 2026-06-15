import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLibraryWithHole, upsertHole } from "../hole-library";
import { buildBlankProject } from "../hole-library";
import {
  buildSatelliteDiagnostics,
  buildSatelliteOverlayModel,
  findFirstGpsCapableHoleId,
  GRID_CRS_SATELLITE_WARNING,
  localOffsetToApproxLatLng,
  resolveSatelliteCenter,
  satellitePlacementWarnings,
  satelliteProviderConfig,
} from "../satellite-map";
import type { PlannerProjectMetadata } from "../planner-types";

function plannerHole(
  id: string,
  meta: Partial<PlannerProjectMetadata> = {}
) {
  return {
    ...buildBlankProject(id, "Camp", id),
    planRecords: [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 150, dip: -61, azimuth: 91 },
      { md: 300, dip: -62, azimuth: 92 },
    ],
    actualRecords: [{ md: 0, dip: -60, azimuth: 90 }],
    target: {
      md: 300,
      e: 100,
      n: 50,
      d: 200,
      tolerance: 6,
      maxDls: 3,
      nextInterval: 30,
    },
    plannerMeta: {
      coordinateMode: "grid" as const,
      northReference: "grid" as const,
      plannedAt: "2026-01-01T00:00:00.000Z",
      createdFromPlanner: true,
      status: "planned" as const,
      programId: "prog-1",
      programName: "Test Program",
      collar: { easting: 500000, northing: 7000000, elevation: 400 },
      ...meta,
    },
  };
}

describe("satellite-map", () => {
  const originalEnv = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    } else {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = originalEnv;
    }
  });

  it("localOffsetToApproxLatLng moves east at mid-latitude", () => {
    const origin = { latitude: -25, longitude: 133 };
    const moved = localOffsetToApproxLatLng(origin, 100, 0);
    expect(moved.lat).toBeCloseTo(-25, 5);
    expect(moved.lng).toBeGreaterThan(133);
    expect(moved.approximate).toBe(true);
  });

  it("resolveSatelliteCenter prefers selected collar GPS over origin", () => {
    const holeA = plannerHole("a", {
      collar: {
        easting: 0,
        northing: 0,
        elevation: 0,
        latitude: -25.5,
        longitude: 133.2,
      },
      coordinateMode: "gps",
    });
    const holeB = plannerHole("b", {
      programId: "prog-1",
      projectCoordinateSystem: {
        mode: "gps",
        projectOrigin: { latitude: -26, longitude: 134 },
      },
    });
    let lib = createLibraryWithHole(holeA);
    lib = upsertHole(lib, holeB);

    const center = resolveSatelliteCenter(lib, "prog-1", "a");
    expect(center?.latitude).toBe(-25.5);
    expect(center?.longitude).toBe(133.2);
  });

  it("resolveSatelliteCenter falls back to project origin GPS", () => {
    const hole = plannerHole("a", {
      coordinateMode: "collar-relative",
      collar: undefined,
      projectCoordinateSystem: {
        mode: "gps",
        projectOrigin: { latitude: -26.1, longitude: 134.2 },
      },
    });
    const lib = createLibraryWithHole(hole);
    const center = resolveSatelliteCenter(lib, "prog-1", "a");
    expect(center?.latitude).toBe(-26.1);
  });

  it("buildSatelliteOverlayModel places collar marker when collar has GPS", () => {
    const hole = plannerHole("gps-1", {
      coordinateMode: "gps",
      collar: {
        easting: 0,
        northing: 0,
        elevation: 400,
        latitude: -25.5,
        longitude: 133.2,
      },
    });
    const lib = createLibraryWithHole(hole);
    const model = buildSatelliteOverlayModel(lib, "prog-1", "gps-1");
    expect(model).not.toBeNull();
    expect(model!.center?.latitude).toBe(-25.5);
    expect(model!.layers[0]?.collar?.quality).toBe("gps");
    expect(model!.layers[0]?.collar?.lat).toBe(-25.5);
  });

  it("marks target and trace approximate when derived from GPS and local offsets", () => {
    const hole = plannerHole("gps-2", {
      coordinateMode: "gps",
      collar: {
        easting: 0,
        northing: 0,
        elevation: 400,
        latitude: -25,
        longitude: 133,
      },
      targetInputMode: "collar-relative",
    });
    hole.target = { ...hole.target, e: 80, n: 40, d: 120 };
    const lib = createLibraryWithHole(hole);
    const model = buildSatelliteOverlayModel(lib, "prog-1", "gps-2");
    const layer = model!.layers[0];
    expect(layer?.target?.quality).toBe("approximate");
    expect(layer?.trace?.quality).toBe("approximate");
    expect(layer?.trace?.coordinates.length).toBeGreaterThan(1);
  });

  it("grid-only hole produces unplaced overlay and CRS warning", () => {
    const hole = plannerHole("grid-1", {
      coordinateMode: "grid",
      projectCoordinateSystem: {
        mode: "grid",
        epsgCode: "EPSG:7855",
        gridName: "MGA2020",
      },
    });
    const lib = createLibraryWithHole(hole);
    const warnings = satellitePlacementWarnings(hole, hole.plannerMeta?.projectCoordinateSystem);
    expect(warnings.some((w) => w.includes(GRID_CRS_SATELLITE_WARNING))).toBe(true);

    const model = buildSatelliteOverlayModel(lib, "prog-1", "grid-1");
    expect(model!.layers[0]?.collar).toBeNull();
    expect(model!.layers[0]?.trace).toBeNull();
    expect(model!.warnings.some((w) => w.includes(GRID_CRS_SATELLITE_WARNING))).toBe(true);
  });

  it("providerReady is false when env token absent", () => {
    const config = satelliteProviderConfig();
    expect(config.ready).toBe(false);
    expect(config.token).toBeNull();
  });

  it("providerReady is true when env token is set", () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.test-token-long-enough";
    const config = satelliteProviderConfig();
    expect(config.ready).toBe(true);
    expect(config.token).toBe("pk.test-token-long-enough");
  });

  it("providerReady is false when token has invalid format", () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "yopk.bad-token-value";
    const config = satelliteProviderConfig();
    expect(config.token).toBe("yopk.bad-token-value");
    expect(config.ready).toBe(false);
  });

  it("buildSatelliteDiagnostics reflects token and GPS state", () => {
    const hole = plannerHole("gps-1", {
      coordinateMode: "gps",
      collar: {
        easting: 0,
        northing: 0,
        elevation: 400,
        latitude: -25.5,
        longitude: 133.2,
      },
    });
    const lib = createLibraryWithHole(hole);
    const overlay = buildSatelliteOverlayModel(lib, "prog-1", "gps-1");
    const diag = buildSatelliteDiagnostics(overlay, "gps-1");
    expect(diag.mapboxTokenDetected).toBe(false);
    expect(diag.mapboxTokenFormatValid).toBe(false);
    expect(diag.satelliteCenterResolved).toBe(true);
    expect(diag.collarGpsAvailable).toBe(true);

    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.test-token-long-enough";
    const diagWithToken = buildSatelliteDiagnostics(overlay, "gps-1");
    expect(diagWithToken.mapboxTokenDetected).toBe(true);
    expect(diagWithToken.mapboxTokenFormatValid).toBe(true);
    expect(diagWithToken.providerConfigured).toBe(true);
  });

  it("findFirstGpsCapableHoleId returns first collar GPS hole", () => {
    const noGps = plannerHole("a");
    const withGps = plannerHole("b", {
      coordinateMode: "gps",
      collar: {
        easting: 0,
        northing: 0,
        elevation: 0,
        latitude: -25,
        longitude: 133,
      },
    });
    let lib = createLibraryWithHole(noGps);
    lib = upsertHole(lib, withGps);
    expect(findFirstGpsCapableHoleId(lib, "prog-1")).toBe("b");
  });
});
