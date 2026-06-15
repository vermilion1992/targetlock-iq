import { describe, expect, it } from "vitest";
import { buildStations } from "../desurvey";
import {
  DEFAULT_SIGMA_FACTOR,
  DEFAULT_TOOL_ERROR_MODEL,
  TOOL_ERROR_CLASSES,
  assessTargetUncertainty,
  errorModelFromSurveyToolProfile,
  propagateUncertainty,
  separationFactor,
  uncertaintyAtMd,
} from "../uncertainty";
import { profileFromPreset } from "../survey-tool-profile";
import type { SurveyRecord } from "../types";

function straightRecords(
  td: number,
  interval: number,
  dip = -60,
  azimuth = 90
): SurveyRecord[] {
  const records: SurveyRecord[] = [];
  for (let md = 0; md <= td; md += interval) {
    records.push({ md, dip, azimuth });
  }
  return records;
}

describe("propagateUncertainty", () => {
  it("starts at the constant depth error and grows monotonically with MD", () => {
    const stations = buildStations(straightRecords(600, 30));
    const result = propagateUncertainty(stations);

    expect(result.stations).toHaveLength(stations.length);
    const first = result.stations[0];
    expect(first.semiAlongM).toBeCloseTo(
      DEFAULT_SIGMA_FACTOR * DEFAULT_TOOL_ERROR_MODEL.depthConstantM,
      6
    );
    expect(first.semiHighsideM).toBe(0);
    expect(first.semiLateralM).toBe(0);

    for (let i = 1; i < result.stations.length; i += 1) {
      expect(result.stations[i].radiusM).toBeGreaterThanOrEqual(
        result.stations[i - 1].radiusM
      );
    }
  });

  it("lateral uncertainty dominates at depth for magnetic tools", () => {
    const stations = buildStations(straightRecords(900, 30));
    const result = propagateUncertainty(
      stations,
      TOOL_ERROR_CLASSES["magnetic-multishot"]
    );
    const bottom = result.stations[result.stations.length - 1];
    expect(bottom.semiLateralM).toBeGreaterThan(bottom.semiAlongM);
    expect(bottom.radiusM).toBe(bottom.semiLateralM);
  });

  it("gyro tools produce much smaller lateral uncertainty than magnetic", () => {
    const stations = buildStations(straightRecords(900, 30));
    const magnetic = propagateUncertainty(
      stations,
      TOOL_ERROR_CLASSES["magnetic-multishot"]
    );
    const gyro = propagateUncertainty(
      stations,
      TOOL_ERROR_CLASSES["north-seeking-gyro"]
    );
    const mBottom = magnetic.stations[magnetic.stations.length - 1];
    const gBottom = gyro.stations[gyro.stations.length - 1];
    expect(gBottom.semiLateralM).toBeLessThan(mBottom.semiLateralM / 2);
  });

  it("near-vertical holes accumulate little azimuth-driven lateral error", () => {
    const inclined = propagateUncertainty(
      buildStations(straightRecords(600, 30, -45))
    );
    const vertical = propagateUncertainty(
      buildStations(straightRecords(600, 30, -89))
    );
    const inclinedBottom = inclined.stations[inclined.stations.length - 1];
    const verticalBottom = vertical.stations[vertical.stations.length - 1];
    expect(verticalBottom.semiLateralM).toBeLessThan(
      inclinedBottom.semiLateralM / 5
    );
  });

  it("scales with the sigma factor", () => {
    const stations = buildStations(straightRecords(600, 30));
    const oneSigma = propagateUncertainty(stations, undefined, 1);
    const twoSigma = propagateUncertainty(stations, undefined, 2);
    const a = oneSigma.stations[oneSigma.stations.length - 1];
    const b = twoSigma.stations[twoSigma.stations.length - 1];
    expect(b.radiusM).toBeCloseTo(a.radiusM * 2, 6);
  });
});

describe("uncertaintyAtMd", () => {
  it("interpolates between stations and clamps beyond the ends", () => {
    const stations = buildStations(straightRecords(300, 100));
    const result = propagateUncertainty(stations);

    const mid = uncertaintyAtMd(result, 150);
    expect(mid).not.toBeNull();
    const at100 = result.stations.find((s) => s.md === 100)!;
    const at200 = result.stations.find((s) => s.md === 200)!;
    expect(mid!.radiusM).toBeGreaterThan(at100.radiusM);
    expect(mid!.radiusM).toBeLessThan(at200.radiusM);

    const beyond = uncertaintyAtMd(result, 999);
    expect(beyond!.radiusM).toBeCloseTo(
      result.stations[result.stations.length - 1].radiusM,
      6
    );

    const before = uncertaintyAtMd(result, -10);
    expect(before!.radiusM).toBeCloseTo(result.stations[0].radiusM, 6);
  });

  it("returns null for empty uncertainty", () => {
    expect(
      uncertaintyAtMd(
        { model: DEFAULT_TOOL_ERROR_MODEL, sigmaFactor: 2, stations: [] },
        100
      )
    ).toBeNull();
  });
});

describe("assessTargetUncertainty", () => {
  const stations = buildStations(straightRecords(600, 30));
  const uncertainty = propagateUncertainty(stations);

  it("is clear when miss plus uncertainty fit inside tolerance", () => {
    const assessment = assessTargetUncertainty(uncertainty, 600, 0.5, 25);
    expect(assessment).not.toBeNull();
    expect(assessment!.status).toBe("clear");
    expect(assessment!.effectiveMarginM).toBeGreaterThan(0);
  });

  it("is marginal when uncertainty consumes the tolerance margin", () => {
    const at = uncertaintyAtMd(uncertainty, 600)!;
    const radius = Math.max(at.semiHighsideM, at.semiLateralM);
    const tolerance = radius + 1;
    const assessment = assessTargetUncertainty(
      uncertainty,
      600,
      2,
      tolerance
    );
    expect(assessment!.status).toBe("marginal");
    expect(assessment!.effectiveMarginM).toBeLessThanOrEqual(0);
  });

  it("is exceeds when projected miss is already outside tolerance", () => {
    const assessment = assessTargetUncertainty(uncertainty, 600, 10, 6);
    expect(assessment!.status).toBe("exceeds");
  });
});

describe("separationFactor", () => {
  it("divides distance by the combined radii", () => {
    const a = {
      md: 100,
      semiAlongM: 1,
      semiHighsideM: 2,
      semiLateralM: 3,
      radiusM: 3,
    };
    const b = { ...a, radiusM: 2, semiLateralM: 2 };
    const result = separationFactor(10, a, b);
    expect(result.combinedRadiusM).toBe(5);
    expect(result.factor).toBeCloseTo(2, 6);
  });

  it("returns null factor when no uncertainty is available", () => {
    const result = separationFactor(10, null, null);
    expect(result.factor).toBeNull();
    expect(result.combinedRadiusM).toBe(0);
  });
});

describe("errorModelFromSurveyToolProfile", () => {
  it("maps gyro presets to the gyro class", () => {
    const model = errorModelFromSurveyToolProfile(
      profileFromPreset("devigyro")
    );
    expect(model.classId).toBe("north-seeking-gyro");
    expect(model.azimuthSensorDeg).toBeCloseTo(0.1, 6);
  });

  it("inflates magnetic terms with magnetic risk", () => {
    const low = errorModelFromSurveyToolProfile(
      profileFromPreset("reflex-ez-trac", { magneticRisk: "low" })
    );
    const high = errorModelFromSurveyToolProfile(
      profileFromPreset("reflex-ez-trac", { magneticRisk: "high" })
    );
    expect(high.azimuthSensorDeg).toBeGreaterThan(low.azimuthSensorDeg);
    expect(high.declinationDeg).toBeGreaterThan(low.declinationDeg);
  });

  it("keeps custom profiles labelled as custom", () => {
    const model = errorModelFromSurveyToolProfile(
      profileFromPreset("custom", { toolName: "Site tool" })
    );
    expect(model.classId).toBe("custom");
    expect(model.label).toContain("Site tool");
  });
});
