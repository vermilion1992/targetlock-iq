import { describe, expect, it } from "vitest";
import {
  gridConvergenceDeg,
  gridToLatLon,
  latLonToGrid,
  listGrids,
  parseEpsgCode,
  resolveGrid,
  suggestGridForLatLon,
} from "../grid-crs";

function dms(deg: number, min: number, sec: number): number {
  const sign = deg < 0 || Object.is(deg, -0) ? -1 : 1;
  return sign * (Math.abs(deg) + min / 60 + sec / 3600);
}

/**
 * Published control values:
 *
 * SSM FREMANTLE 64 — Landgate (WA) GOLA survey-control listing, GDA2020:
 *   lat S 32°02'07.16398", lon E 115°45'12.74082"
 *   MGA2020 zone 50: E 382306.176, N 6454969.831
 *   grid convergence -0°39'40.50" (GDA convention: added to a true azimuth
 *   to get a grid bearing), point scale factor 0.99977083.
 *
 * Flinders Peak — GDA2020 Technical Manual worked example (section 4),
 *   lat S 37°57'03.7203", lon E 144°25'29.5244"
 *   MGA2020 zone 55: E 273741.297, N 5796489.777.
 */
const FREMANTLE = {
  latitudeDeg: dms(-32, 2, 7.16398),
  longitudeDeg: dms(115, 45, 12.74082),
  epsg: 7850,
  easting: 382306.176,
  northing: 6454969.831,
  convergenceGdaDeg: dms(-0, 39, 40.5),
};

const FLINDERS_PEAK = {
  latitudeDeg: dms(-37, 57, 3.7203),
  longitudeDeg: dms(144, 25, 29.5244),
  epsg: 7855,
  easting: 273741.297,
  northing: 5796489.777,
};

describe("grid-crs registry", () => {
  it("contains the MGA2020, MGA94 and WGS84 UTM grids", () => {
    const grids = listGrids();
    const byEpsg = new Map(grids.map((g) => [g.epsg, g]));
    expect(byEpsg.get(7846)?.name).toBe("MGA2020 zone 46");
    expect(byEpsg.get(7859)?.name).toBe("MGA2020 zone 59");
    expect(byEpsg.get(28349)?.name).toBe("MGA94 zone 49");
    expect(byEpsg.get(28356)?.name).toBe("MGA94 zone 56");
    expect(byEpsg.get(32601)?.name).toBe("WGS84 / UTM zone 1N");
    expect(byEpsg.get(32760)?.name).toBe("WGS84 / UTM zone 60S");
    // 14 MGA2020 + 8 MGA94 + 120 UTM
    expect(grids).toHaveLength(14 + 8 + 120);
  });

  it("resolves EPSG codes from numbers, strings and grid names", () => {
    expect(resolveGrid(7852)?.name).toBe("MGA2020 zone 52");
    expect(resolveGrid("7852")?.name).toBe("MGA2020 zone 52");
    expect(resolveGrid("EPSG:7852")?.name).toBe("MGA2020 zone 52");
    expect(resolveGrid("epsg 28354")?.name).toBe("MGA94 zone 54");
    expect(resolveGrid("MGA2020 zone 50")?.epsg).toBe(7850);
    expect(resolveGrid("Mine grid (EPSG:32750)")?.name).toBe("WGS84 / UTM zone 50S");
  });

  it("returns undefined for unknown or unparseable codes", () => {
    expect(resolveGrid(4326)).toBeUndefined(); // geographic, not a TM grid
    expect(resolveGrid(2193)).toBeUndefined(); // NZTM — not in registry
    expect(resolveGrid("local mine grid")).toBeUndefined();
    expect(resolveGrid(undefined)).toBeUndefined();
    expect(parseEpsgCode("not a code")).toBeUndefined();
  });

  it("records central meridian and hemisphere metadata", () => {
    const z50 = resolveGrid(7850)!;
    expect(z50.centralMeridianDeg).toBe(117);
    expect(z50.southernHemisphere).toBe(true);
    const utm11n = resolveGrid(32611)!;
    expect(utm11n.centralMeridianDeg).toBe(-117);
    expect(utm11n.southernHemisphere).toBe(false);
  });
});

describe("grid-crs conversions", () => {
  it("matches the published Landgate SSM FREMANTLE 64 control values", () => {
    const grid = latLonToGrid(FREMANTLE.epsg, FREMANTLE)!;
    expect(Math.abs(grid.easting - FREMANTLE.easting)).toBeLessThan(0.005);
    expect(Math.abs(grid.northing - FREMANTLE.northing)).toBeLessThan(0.005);
  });

  it("matches the GDA2020 technical-manual Flinders Peak example", () => {
    const grid = latLonToGrid(FLINDERS_PEAK.epsg, FLINDERS_PEAK)!;
    expect(Math.abs(grid.easting - FLINDERS_PEAK.easting)).toBeLessThan(0.005);
    expect(Math.abs(grid.northing - FLINDERS_PEAK.northing)).toBeLessThan(0.005);
  });

  it("inverse conversion recovers the published lat/long", () => {
    const back = gridToLatLon(FREMANTLE.epsg, {
      easting: FREMANTLE.easting,
      northing: FREMANTLE.northing,
    })!;
    expect(Math.abs(back.latitudeDeg - FREMANTLE.latitudeDeg)).toBeLessThan(1e-7);
    expect(Math.abs(back.longitudeDeg - FREMANTLE.longitudeDeg)).toBeLessThan(1e-7);
  });

  it("round-trips below 1 mm across grids and hemispheres", () => {
    const cases: Array<{ epsg: number; latitudeDeg: number; longitudeDeg: number }> = [
      { epsg: 7850, latitudeDeg: -30.75, longitudeDeg: 121.47 }, // Kalgoorlie-ish, off-zone
      { epsg: 7851, latitudeDeg: -30.75, longitudeDeg: 121.47 },
      { epsg: 7855, latitudeDeg: -37.0, longitudeDeg: 145.5 },
      { epsg: 28354, latitudeDeg: -23.7, longitudeDeg: 133.87 }, // Alice Springs, MGA94
      { epsg: 32611, latitudeDeg: 39.5, longitudeDeg: -116.9 }, // Nevada
      { epsg: 32719, latitudeDeg: -24.6, longitudeDeg: -69.1 }, // Atacama
    ];
    for (const c of cases) {
      const grid = latLonToGrid(c.epsg, c)!;
      const back = gridToLatLon(c.epsg, grid)!;
      const grid2 = latLonToGrid(c.epsg, back)!;
      const label = `EPSG:${c.epsg}`;
      expect(Math.abs(grid2.easting - grid.easting), label).toBeLessThan(0.001);
      expect(Math.abs(grid2.northing - grid.northing), label).toBeLessThan(0.001);
    }
  });

  it("returns undefined for unknown grids and bad input", () => {
    expect(latLonToGrid(2193, { latitudeDeg: -41, longitudeDeg: 174 })).toBeUndefined();
    expect(latLonToGrid(7850, { latitudeDeg: NaN, longitudeDeg: 117 })).toBeUndefined();
    expect(gridToLatLon(9999, { easting: 1, northing: 2 })).toBeUndefined();
    expect(
      gridToLatLon(7850, { easting: Infinity, northing: 6_000_000 })
    ).toBeUndefined();
  });
});

describe("grid convergence (finite difference)", () => {
  it("matches the published Fremantle convergence (app sign convention)", () => {
    const conv = gridConvergenceDeg(
      FREMANTLE.epsg,
      FREMANTLE.latitudeDeg,
      FREMANTLE.longitudeDeg
    )!;
    // App convention (grid->true, east positive) is the negation of the
    // GDA-manual convention quoted in the control listing.
    expect(Math.abs(conv - -FREMANTLE.convergenceGdaDeg)).toBeLessThan(0.001);
  });

  it("is ~0 on the central meridian", () => {
    const conv = gridConvergenceDeg(7850, -30, 117)!;
    expect(Math.abs(conv)).toBeLessThan(1e-4);
  });

  it("has the textbook sign and magnitude in the northern hemisphere", () => {
    // UTM 33N (CM 15E), point at 50N 16E: gamma ~= atan(tan(1 deg) sin(50 deg))
    const conv = gridConvergenceDeg(32633, 50, 16)!;
    const expected = (Math.atan(Math.tan(Math.PI / 180) * Math.sin((50 * Math.PI) / 180)) * 180) / Math.PI;
    expect(conv).toBeGreaterThan(0);
    expect(Math.abs(conv - expected)).toBeLessThan(0.01);
  });

  it("agrees between MGA94 and MGA2020 for the same zone", () => {
    const a = gridConvergenceDeg(7854, -23.7, 133.87)!;
    const b = gridConvergenceDeg(28354, -23.7, 133.87)!;
    expect(Math.abs(a - b)).toBeLessThan(1e-9);
  });

  it("returns undefined for unknown grids", () => {
    expect(gridConvergenceDeg(2193, -41, 174)).toBeUndefined();
  });
});

describe("grid suggestion", () => {
  it("suggests MGA2020 zones inside Australia", () => {
    expect(suggestGridForLatLon(-30.75, 121.47)?.epsg).toBe(7851); // Kalgoorlie
    expect(suggestGridForLatLon(-33.87, 151.21)?.epsg).toBe(7856); // Sydney
    expect(suggestGridForLatLon(-23.7, 133.87)?.epsg).toBe(7853); // Alice Springs
  });

  it("suggests WGS84 UTM elsewhere, hemisphere-aware", () => {
    expect(suggestGridForLatLon(39.5, -116.9)?.epsg).toBe(32611); // Nevada -> 11N
    expect(suggestGridForLatLon(-24.6, -69.1)?.epsg).toBe(32719); // Atacama -> 19S
    expect(suggestGridForLatLon(64.8, -147.7)?.epsg).toBe(32606); // Fairbanks -> 6N
  });

  it("rejects nonsense coordinates", () => {
    expect(suggestGridForLatLon(NaN, 100)).toBeUndefined();
    expect(suggestGridForLatLon(95, 100)).toBeUndefined();
  });
});
