import { describe, expect, it } from "vitest";
import { buildBlankProject, createLibraryWithHole } from "../hole-library";
import {
  buildActualVsLockedPlanReport,
  buildActualVsPlanned,
} from "../actual-vs-plan";
import { activatePlannerPlanForExecution } from "../execution-bridge";
import { buildPlannerApprovalSnapshot } from "../planner-approval";
import { approvePlannerPlan } from "../planner-status";
import type { PlannerProjectMetadata } from "../planner-types";
import type { SavedHoleProject } from "../storage";

function plannerHole(
  overrides: Partial<SavedHoleProject> & { holeId: string; holeName: string }
): SavedHoleProject {
  const meta: PlannerProjectMetadata = {
    coordinateMode: "collar-relative",
    northReference: "grid",
    plannedAt: "2026-01-01T00:00:00.000Z",
    createdFromPlanner: true,
    status: "approved",
    planRevision: 1,
    ...(overrides.plannerMeta ?? {}),
  };
  return {
    ...buildBlankProject(overrides.holeName, "Site", overrides.holeId),
    planRecords: overrides.planRecords ?? [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 100, dip: -60, azimuth: 90 },
      { md: 200, dip: -60, azimuth: 90 },
    ],
    target: {
      md: 200,
      e: 0,
      n: 0,
      d: 0,
      tolerance: 6,
      maxDls: 3,
      nextInterval: 30,
    },
    actualRecords: overrides.actualRecords ?? [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 100, dip: -60, azimuth: 90 },
    ],
    plannerMeta: meta,
    ...overrides,
  };
}

function activateHole(hole: SavedHoleProject) {
  let lib = createLibraryWithHole(hole);
  const snapshot = buildPlannerApprovalSnapshot(hole, lib, {
    approvedBy: "Geologist",
  });
  lib = approvePlannerPlan(lib, hole.holeId, {
    approvedBy: "Geologist",
    snapshot,
  })!;
  return activatePlannerPlanForExecution(lib, hole.holeId)!;
}

describe("actual-vs-plan", () => {
  it("returns no-locked-plan when hole has no locked snapshot", () => {
    const hole = plannerHole({
      holeId: "nl",
      holeName: "NL",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    const report = buildActualVsLockedPlanReport(hole);
    expect(report.status).toBe("no-locked-plan");
    expect(report.hasLockedPlan).toBe(false);
  });

  it("returns not-started when only collar actual exists on locked plan", () => {
    const hole = plannerHole({
      holeId: "ns",
      holeName: "NS",
      actualRecords: [{ md: 0, dip: -60, azimuth: 90 }],
    });
    const lib = activateHole(hole);
    const active = lib.holes[0]!;
    const report = buildActualVsLockedPlanReport(active);
    expect(report.status).toBe("not-started");
    expect(report.hasLockedPlan).toBe(true);
    expect(report.hasActuals).toBe(false);
  });

  it("returns on-plan when actual follows locked path", () => {
    const hole = plannerHole({ holeId: "op", holeName: "OP" });
    const lib = activateHole(hole);
    const active = lib.holes[0]!;
    const report = buildActualVsLockedPlanReport(active);
    expect(report.status).toBe("on-plan");
    expect(report.latestPlanOffsetM).not.toBeNull();
    expect((report.latestPlanOffsetM ?? 99) < 3).toBe(true);
  });

  it("returns watch when offset exceeds warning threshold", () => {
    const hole = plannerHole({
      holeId: "w",
      holeName: "W",
      target: {
        md: 200,
        e: 0,
        n: 0,
        d: 0,
        tolerance: 2,
        maxDls: 3,
        nextInterval: 30,
      },
      actualRecords: [
        { md: 0, dip: -60, azimuth: 90 },
        { md: 100, dip: -54, azimuth: 96 },
      ],
    });
    const lib = activateHole(hole);
    const active = lib.holes[0]!;
    const report = buildActualVsLockedPlanReport(active);
    expect(report.status).toBe("watch");
    expect(report.severity).toBe("watch");
    expect((report.latestPlanOffsetM ?? 0) >= 3).toBe(true);
    expect((report.latestPlanOffsetM ?? 99) < 6).toBe(true);
  });

  it("returns off-plan when offset exceeds risk threshold", () => {
    const hole = plannerHole({
      holeId: "off",
      holeName: "OFF",
      actualRecords: [
        { md: 0, dip: -60, azimuth: 90 },
        { md: 100, dip: -30, azimuth: 150 },
      ],
    });
    const lib = activateHole(hole);
    const active = lib.holes[0]!;
    const report = buildActualVsLockedPlanReport(active);
    expect(report.status).toBe("off-plan");
    expect(report.severity).toBe("risk");
    expect((report.latestPlanOffsetM ?? 0) >= 9).toBe(true);
  });

  it("returns review-plan when actual MD is beyond planned TD", () => {
    const hole = plannerHole({
      holeId: "past",
      holeName: "PAST",
      actualRecords: [
        { md: 0, dip: -60, azimuth: 90 },
        { md: 100, dip: -60, azimuth: 90 },
        { md: 202, dip: -60, azimuth: 90 },
      ],
    });
    const lib = activateHole(hole);
    const active = lib.holes[0]!;
    const report = buildActualVsLockedPlanReport(active);
    expect(report.status).toBe("review-plan");
    expect(report.drilledPastPlan).toBe(true);
    expect(report.warnings.some((w) => w.includes("beyond planned TD"))).toBe(
      true
    );
  });

  it("computes dip and azimuth deltas against interpolated locked plan", () => {
    const hole = plannerHole({
      holeId: "delta",
      holeName: "DELTA",
      actualRecords: [
        { md: 0, dip: -60, azimuth: 90 },
        { md: 150, dip: -58, azimuth: 95 },
      ],
    });
    const lib = activateHole(hole);
    const active = lib.holes[0]!;
    const report = buildActualVsLockedPlanReport(active);
    expect(report.latestDipDeltaDeg).not.toBeNull();
    expect(report.latestAzimuthDeltaDeg).not.toBeNull();
    expect(Math.abs(report.latestDipDeltaDeg!)).toBeLessThan(5);
    expect(Math.abs(report.latestAzimuthDeltaDeg!)).toBeLessThan(10);
  });

  it("flags elevated DLS as watch or off-plan", () => {
    const hole = plannerHole({
      holeId: "dls",
      holeName: "DLS",
      actualRecords: [
        { md: 0, dip: -60, azimuth: 90 },
        { md: 30, dip: -60, azimuth: 90 },
        { md: 60, dip: -20, azimuth: 200 },
      ],
    });
    const lib = activateHole(hole);
    const active = lib.holes[0]!;
    const report = buildActualVsLockedPlanReport(active);
    expect(["watch", "off-plan", "review-plan"]).toContain(report.status);
    expect((report.latestActualDls ?? 0) >= 2.25).toBe(true);
  });

  it("uses locked plan records even when mutable planRecords differ", () => {
    const hole = plannerHole({ holeId: "lock", holeName: "LOCK" });
    const lib = activateHole(hole);
    const active = lib.holes[0]!;
    const drifted = {
      ...active,
      planRecords: [
        { md: 0, dip: -60, azimuth: 90 },
        { md: 300, dip: -70, azimuth: 110 },
      ],
    };
    const onPath = buildActualVsLockedPlanReport(active);
    const driftedReport = buildActualVsLockedPlanReport(drifted);
    expect(onPath.status).toBe("on-plan");
    expect(driftedReport.status).toBe("review-plan");
    expect(driftedReport.latestPlanOffsetM).toBe(onPath.latestPlanOffsetM);
  });

  it("non-planner hole is unaffected", () => {
    const hole = buildBlankProject("Field", "Site", "field-1");
    const report = buildActualVsLockedPlanReport(hole);
    expect(report.status).toBe("no-locked-plan");
    const adapted = buildActualVsPlanned(hole, hole.actualRecords, null, null);
    expect(adapted.status).toBe("no-locked-plan");
  });
});
