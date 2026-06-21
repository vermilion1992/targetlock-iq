import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  collarRelativeTargetFromGrid,
  gridTargetFromCollarRelative,
  normalizeProjectCoordinateSystem,
  offsetStationsByCollar,
  offsetStationsByKickoff,
  targetEnuFromMdOffset,
} from "../coordinate-system";
import { buildStations } from "../desurvey";
import { DEG } from "../geometry";
import { dbl } from "./arbitraries";
import type { PlannerCollar } from "../planner-types";

describe("grid <-> collar-relative — sign convention and round-trip", () => {
  it("RL/depth sign: a target 120 m below a collar at RL 400 is local d=120, grid RL=280", () => {
    const collar: PlannerCollar = { easting: 500000, northing: 7000000, elevation: 400 };
    const local = collarRelativeTargetFromGrid({ e: 500150, n: 7000080, d: 280 }, collar);
    expect(local.e).toBeCloseTo(150, 9);
    expect(local.n).toBeCloseTo(80, 9);
    expect(local.d).toBeCloseTo(120, 9); // depth below collar
    const grid = gridTargetFromCollarRelative(local, collar);
    expect(grid.d).toBeCloseTo(280, 9); // back to RL
  });

  it("round-trips grid -> collar-relative -> grid for any finite point (fuzz)", () => {
    fc.assert(
      fc.property(
        dbl(-1e6, 1e6),
        dbl(-1e6, 1e6),
        dbl(-1e4, 1e4),
        dbl(-1e6, 1e6),
        dbl(-1e6, 1e6),
        dbl(-1e4, 1e4),
        (te, tn, td, ce, cn, cel) => {
          const collar: PlannerCollar = { easting: ce, northing: cn, elevation: cel };
          const target = { e: te, n: tn, d: td };
          const back = gridTargetFromCollarRelative(
            collarRelativeTargetFromGrid(target, collar),
            collar
          );
          expect(back.e).toBeCloseTo(te, 6);
          expect(back.n).toBeCloseTo(tn, 6);
          expect(back.d).toBeCloseTo(td, 6);
        }
      ),
      { numRuns: 1500 }
    );
  });
});

describe("station frame offsets", () => {
  const stations = buildStations([
    { md: 0, dip: -90, azimuth: 0 },
    { md: 100, dip: -90, azimuth: 0 },
  ]);

  it("offsetStationsByCollar adds E/N and subtracts collar RL (frame d = -RL at collar)", () => {
    const collar: PlannerCollar = { easting: 1000, northing: 2000, elevation: 420 };
    const shifted = offsetStationsByCollar(stations, collar);
    expect(shifted[0]!.e).toBeCloseTo(1000, 9);
    expect(shifted[0]!.n).toBeCloseTo(2000, 9);
    expect(shifted[0]!.d).toBeCloseTo(-420, 9); // collar at frame d = -RL
    expect(shifted[1]!.d).toBeCloseTo(100 - 420, 6); // 100 m down from collar
  });

  it("offsetStationsByCollar is a no-op without a collar", () => {
    expect(offsetStationsByCollar(stations, null)).toBe(stations);
  });

  it("offsetStationsByKickoff is purely additive", () => {
    const shifted = offsetStationsByKickoff(stations, { e: 5, n: -7, d: 3 });
    expect(shifted[0]!.e).toBeCloseTo(5, 9);
    expect(shifted[0]!.n).toBeCloseTo(-7, 9);
    expect(shifted[0]!.d).toBeCloseTo(3, 9);
  });
});

describe("targetEnuFromMdOffset — closed form and guards", () => {
  it("matches straight-leg trigonometry including the start position", () => {
    const md = 200;
    const dip = -60;
    const azi = 30;
    const start = { e: 10, n: 20, d: 5 };
    const enu = targetEnuFromMdOffset(md, dip, azi, 0, start)!;
    const horiz = md * Math.cos(dip * DEG);
    expect(enu.e).toBeCloseTo(horiz * Math.sin(azi * DEG) + start.e, 6);
    expect(enu.n).toBeCloseTo(horiz * Math.cos(azi * DEG) + start.n, 6);
    expect(enu.d).toBeCloseTo(md * Math.sin(60 * DEG) + start.d, 6); // downward depth
  });

  it("returns null for targetMd <= startMd or non-finite MD", () => {
    expect(targetEnuFromMdOffset(0, -60, 30, 0)).toBeNull();
    expect(targetEnuFromMdOffset(50, -60, 30, 50)).toBeNull();
    expect(targetEnuFromMdOffset(NaN, -60, 30, 0)).toBeNull();
  });

  it("long legs (>30 m, with a midpoint split) still match the straight closed form", () => {
    const enu = targetEnuFromMdOffset(120, -45, 90, 0)!;
    const horiz = 120 * Math.cos(45 * DEG);
    expect(enu.e).toBeCloseTo(horiz, 6);
    expect(enu.n).toBeCloseTo(0, 6);
    expect(enu.d).toBeCloseTo(120 * Math.sin(45 * DEG), 6);
  });
});

describe("normalizeProjectCoordinateSystem — validation", () => {
  it("rejects missing/invalid mode", () => {
    expect(normalizeProjectCoordinateSystem(null)).toBeUndefined();
    expect(normalizeProjectCoordinateSystem({})).toBeUndefined();
    expect(
      normalizeProjectCoordinateSystem({ mode: "bogus" as "grid" })
    ).toBeUndefined();
  });

  it("keeps only finite origin fields and trims metadata", () => {
    const pcs = normalizeProjectCoordinateSystem({
      mode: "grid",
      gridName: "  MGA2020 Z51  ",
      epsgCode: " 7851 ",
      magneticDeclinationDeg: 1.5,
      gridConvergenceDeg: NaN,
      projectOrigin: { easting: 500000, northing: NaN, elevation: 420 },
    });
    expect(pcs?.mode).toBe("grid");
    expect(pcs?.gridName).toBe("MGA2020 Z51");
    expect(pcs?.epsgCode).toBe("7851");
    expect(pcs?.magneticDeclinationDeg).toBe(1.5);
    expect(pcs?.gridConvergenceDeg).toBeUndefined();
    expect(pcs?.projectOrigin?.easting).toBe(500000);
    expect(pcs?.projectOrigin?.northing).toBeUndefined();
    expect(pcs?.projectOrigin?.elevation).toBe(420);
  });
});
