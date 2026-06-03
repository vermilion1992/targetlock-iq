import { describe, expect, it } from "vitest";
import {
  DEFAULT_CAPABILITY_ASSUMPTIONS,
  formatAssumptionsSummary,
  normalizeCapabilityAssumptions,
  profilesFromAssumptions,
} from "../capability-assumptions";
import { snapshotProject } from "../hole-library";

describe("capability-assumptions", () => {
  it("normalizes inverted min/max ranges", () => {
    const a = normalizeCapabilityAssumptions({
      naturalDlsMin: 2,
      naturalDlsMax: 0.5,
    });
    expect(a.naturalDlsMin).toBe(0.5);
    expect(a.naturalDlsMax).toBe(2);
  });

  it("builds profiles from assumptions", () => {
    const profiles = profilesFromAssumptions({
      motorNaviDlsMax: 6,
    });
    const motor = profiles.find((p) => p.id === "motor_navi");
    expect(motor?.dlsMax).toBe(6);
  });

  it("formats assumptions for reports", () => {
    const lines = formatAssumptionsSummary(DEFAULT_CAPABILITY_ASSUMPTIONS);
    expect(lines.some((l) => l.includes("Natural correction"))).toBe(true);
    expect(lines.some((l) => l.includes("Wedge / branch"))).toBe(true);
  });

  it("persists recovery assumptions on hole snapshot", () => {
    const custom = normalizeCapabilityAssumptions({
      devidrillDlsMax: 10,
      wedgeReviewThresholdDls: 3,
    });
    const snap = snapshotProject({
      holeId: "test-hole",
      holeName: "DDH-TEST",
      siteName: "Camp",
      planRecords: [],
      actualRecords: [],
      target: {
        md: 600,
        e: 0,
        n: 0,
        d: 0,
        tolerance: 6,
        maxDls: 3,
        nextInterval: 30,
      },
      mode: "advanced",
      history: [],
      recoveryAssumptions: custom,
    });
    expect(snap.recoveryAssumptions?.devidrillDlsMax).toBe(10);
    expect(snap.recoveryAssumptions?.wedgeReviewThresholdDls).toBe(3);
  });
});
