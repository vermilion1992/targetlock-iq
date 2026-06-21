import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  gridConvergenceDeg,
  gridToLatLon,
  latLonToGrid,
  suggestGridForLatLon,
} from "../grid-crs";
import { dbl } from "./arbitraries";

describe("lat/lon <-> grid — round-trip across the globe (fuzz)", () => {
  it("recovers the original coordinate via the suggested grid", () => {
    fc.assert(
      fc.property(dbl(-80, 80), dbl(-179, 179), (lat, lon) => {
        const grid = suggestGridForLatLon(lat, lon);
        expect(grid).toBeDefined();
        const gp = latLonToGrid(grid!.epsg, { latitudeDeg: lat, longitudeDeg: lon });
        expect(gp).toBeDefined();
        const back = gridToLatLon(grid!.epsg, gp!);
        expect(back).toBeDefined();
        expect(back!.latitudeDeg).toBeCloseTo(lat, 6);
        expect(Math.abs(back!.longitudeDeg - lon)).toBeLessThan(1e-6);
      }),
      { numRuns: 1200 }
    );
  });
});

describe("UTM/MGA zone assignment at boundaries", () => {
  it("assigns UTM zones at 6-degree boundaries (northern, non-Australian)", () => {
    expect(suggestGridForLatLon(30, 114)!.epsg).toBe(32650); // zone 50 N
    expect(suggestGridForLatLon(30, 120)!.epsg).toBe(32651); // zone 51 N
  });

  it("wraps longitude at +/-180 to zone 1", () => {
    expect(suggestGridForLatLon(30, 180)!.epsg).toBe(32601);
    expect(suggestGridForLatLon(30, -180)!.epsg).toBe(32601);
  });

  it("suggests MGA2020 inside the Australian box", () => {
    expect(suggestGridForLatLon(-30, 120)!.epsg).toBe(7851); // MGA2020 zone 51
  });

  it("rejects out-of-range latitude / non-finite input", () => {
    expect(suggestGridForLatLon(95, 120)).toBeUndefined();
    expect(suggestGridForLatLon(NaN, 120)).toBeUndefined();
  });
});

describe("off-zone projection — accepted but out of survey band (documented)", () => {
  it("KNOWN LIMIT: projecting far from the central meridian is not rejected", () => {
    // MGA2020 zone 50 (EPSG 7850, CM 117E) used for a point at 124E (~7 deg off).
    const gp = latLonToGrid(7850, { latitudeDeg: -30, longitudeDeg: 124 });
    expect(gp).toBeDefined();
    expect(Number.isFinite(gp!.easting)).toBe(true);
    // The easting lands well outside the usable ~100k-900k zone band, signalling
    // the wrong-zone EPSG; the API does not guard against this.
    expect(gp!.easting).toBeGreaterThan(1_000_000);
    // Still mathematically invertible.
    const back = gridToLatLon(7850, gp!);
    expect(back!.longitudeDeg).toBeCloseTo(124, 6);
  });
});

describe("grid convergence near the pole", () => {
  it("stays finite at extreme latitude via the southward finite-difference step", () => {
    const conv = gridConvergenceDeg(32631, 89.99, 3); // UTM zone 31 N, CM 3E
    expect(conv).toBeDefined();
    expect(Number.isFinite(conv!)).toBe(true);
  });

  it("is approximately zero on the central meridian", () => {
    // Zone 51 N central meridian is 123E.
    const conv = gridConvergenceDeg(32651, 10, 123);
    expect(Math.abs(conv!)).toBeLessThan(1e-3);
  });
});
