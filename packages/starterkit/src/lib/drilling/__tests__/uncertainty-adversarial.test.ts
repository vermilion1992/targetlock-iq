import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  assessTargetUncertainty,
  propagateUncertainty,
  separationFactor,
  type ToolErrorModel,
} from "../uncertainty";
import { buildStations } from "../desurvey";
import { DEG } from "../geometry";
import { dbl } from "./arbitraries";

const MODEL: ToolErrorModel = {
  classId: "custom",
  label: "test",
  depthProportional: 0.001,
  depthConstantM: 0.5,
  inclinationDeg: 0.3,
  azimuthSensorDeg: 0.6,
  declinationDeg: 0.4,
};

describe("propagateUncertainty — closed-form variance", () => {
  it("vertical hole: lateral error vanishes, along/highside match closed form", () => {
    const stations = buildStations([
      { md: 0, dip: -90, azimuth: 0 },
      { md: 300, dip: -90, azimuth: 0 },
    ]);
    const sigma = 2;
    const u = propagateUncertainty(stations, MODEL, sigma);
    const last = u.stations[u.stations.length - 1]!;

    const expAlong = sigma * Math.sqrt(0.5 * 0.5 + (0.001 * 300) ** 2);
    const expHigh = sigma * 300 * (0.3 * DEG);
    expect(last.semiAlongM).toBeCloseTo(expAlong, 9);
    expect(last.semiHighsideM).toBeCloseTo(expHigh, 9);
    expect(last.semiLateralM).toBeCloseTo(0, 9); // cos(-90) = 0
  });

  it("horizontal hole: lateral combines random (quadrature) and systematic (linear)", () => {
    const stations = buildStations([
      { md: 0, dip: 0, azimuth: 90 },
      { md: 200, dip: 0, azimuth: 90 },
    ]);
    const sigma = 2;
    const u = propagateUncertainty(stations, MODEL, sigma);
    const last = u.stations[u.stations.length - 1]!;

    const random = 200 * (0.6 * DEG); // legLength * horizontal(=1) * aziRad
    const systematic = 200 * (0.4 * DEG);
    const expLateral = sigma * Math.sqrt(random * random + systematic * systematic);
    expect(last.semiLateralM).toBeCloseTo(expLateral, 9);
  });

  it("the first station carries only the constant depth term", () => {
    const stations = buildStations([{ md: 0, dip: -60, azimuth: 45 }]);
    const u = propagateUncertainty(stations, MODEL, 2);
    expect(u.stations[0]!.semiAlongM).toBeCloseTo(2 * 0.5, 9);
    expect(u.stations[0]!.semiHighsideM).toBeCloseTo(0, 9);
    expect(u.stations[0]!.semiLateralM).toBeCloseTo(0, 9);
  });
});

describe("propagateUncertainty — degenerate legs and sigma scaling", () => {
  it("duplicate/non-advancing MD adds no variance", () => {
    const stations = buildStations([
      { md: 0, dip: 0, azimuth: 90 },
      { md: 100, dip: 0, azimuth: 90 },
      { md: 100, dip: 0, azimuth: 90 },
      { md: 60, dip: 0, azimuth: 90 }, // backward MD
    ]);
    const u = propagateUncertainty(stations, MODEL, 2);
    const s = u.stations;
    expect(s[2]!.semiLateralM).toBeCloseTo(s[1]!.semiLateralM, 9);
    expect(s[3]!.semiLateralM).toBeCloseTo(s[1]!.semiLateralM, 9);
  });

  it("all semi-axes scale linearly with the sigma factor (fuzz)", () => {
    const stations = buildStations([
      { md: 0, dip: -45, azimuth: 30 },
      { md: 150, dip: -40, azimuth: 35 },
      { md: 300, dip: -35, azimuth: 40 },
    ]);
    fc.assert(
      fc.property(dbl(0.1, 5), (sigma) => {
        const u1 = propagateUncertainty(stations, MODEL, 1);
        const us = propagateUncertainty(stations, MODEL, sigma);
        const a = u1.stations[u1.stations.length - 1]!;
        const b = us.stations[us.stations.length - 1]!;
        expect(b.semiAlongM).toBeCloseTo(a.semiAlongM * sigma, 6);
        expect(b.semiHighsideM).toBeCloseTo(a.semiHighsideM * sigma, 6);
        expect(b.semiLateralM).toBeCloseTo(a.semiLateralM * sigma, 6);
      }),
      { numRuns: 300 }
    );
  });

  it("MODEL PROPERTY: random lateral error shrinks with more surveys, systematic does not", () => {
    const coarse = buildStations([
      { md: 0, dip: 0, azimuth: 90 },
      { md: 300, dip: 0, azimuth: 90 },
    ]);
    const fine = buildStations([
      { md: 0, dip: 0, azimuth: 90 },
      { md: 100, dip: 0, azimuth: 90 },
      { md: 200, dip: 0, azimuth: 90 },
      { md: 300, dip: 0, azimuth: 90 },
    ]);
    // Combined lateral: finer surveys reduce the in-quadrature random term.
    const cLast = propagateUncertainty(coarse, MODEL, 2).stations.at(-1)!;
    const fLast = propagateUncertainty(fine, MODEL, 2).stations.at(-1)!;
    expect(fLast.semiLateralM).toBeLessThan(cLast.semiLateralM);

    // With only the systematic declination term, station count is irrelevant.
    const sysOnly: ToolErrorModel = { ...MODEL, azimuthSensorDeg: 0, inclinationDeg: 0, depthProportional: 0, depthConstantM: 0 };
    const cSys = propagateUncertainty(coarse, sysOnly, 2).stations.at(-1)!;
    const fSys = propagateUncertainty(fine, sysOnly, 2).stations.at(-1)!;
    expect(fSys.semiLateralM).toBeCloseTo(cSys.semiLateralM, 9);
  });
});

describe("assessTargetUncertainty — status boundaries", () => {
  const stations = buildStations([
    { md: 0, dip: 0, azimuth: 90 },
    { md: 200, dip: 0, azimuth: 90 },
  ]);
  const u = propagateUncertainty(stations, MODEL, 2);

  it("miss beyond tolerance is 'exceeds' regardless of uncertainty", () => {
    const a = assessTargetUncertainty(u, 200, 10, 6)!;
    expect(a.status).toBe("exceeds");
  });

  it("miss inside tolerance but uncertainty eats the margin is 'marginal'", () => {
    // Tolerance just above miss so radius pushes effective margin negative.
    const radius = u.stations.at(-1)!.semiLateralM;
    const a = assessTargetUncertainty(u, 200, 1, 1 + radius * 0.5)!;
    expect(a.effectiveMarginM).toBeLessThanOrEqual(0);
    expect(a.status).toBe("marginal");
  });

  it("ample tolerance is 'clear' and excludes along-hole error from the radius", () => {
    const last = u.stations.at(-1)!;
    const a = assessTargetUncertainty(u, 200, 0, 1000)!;
    expect(a.status).toBe("clear");
    expect(a.radiusAtTargetM).toBeCloseTo(Math.max(last.semiHighsideM, last.semiLateralM), 9);
  });
});

describe("separationFactor", () => {
  it("returns distance / combined radius", () => {
    const a = { md: 0, semiAlongM: 1, semiHighsideM: 2, semiLateralM: 3, radiusM: 3 };
    const b = { md: 0, semiAlongM: 1, semiHighsideM: 1, semiLateralM: 2, radiusM: 2 };
    const sf = separationFactor(10, a, b);
    expect(sf.combinedRadiusM).toBe(5);
    expect(sf.factor).toBeCloseTo(2, 9);
  });

  it("null factor when both radii are zero", () => {
    const sf = separationFactor(10, null, null);
    expect(sf.factor).toBeNull();
    expect(sf.combinedRadiusM).toBe(0);
  });
});
