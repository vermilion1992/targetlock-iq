import { describe, expect, it } from "vitest";
import { createLibraryWithHole, buildBlankProject } from "../hole-library";
import {
  activatePlannerPlanForExecution,
  completePlannerExecution,
} from "../execution-bridge";
import { buildPlannerApprovalSnapshot } from "../planner-approval";
import { approvePlannerPlan } from "../planner-status";
import { createPlannerRevision } from "../planner";
import {
  buildExecutionAuditReport,
  executionAuditEventKinds,
  isExecutionAuditSupported,
  revisionLineageInAudit,
} from "../execution-audit";
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
      { md: 300, dip: -62, azimuth: 92 },
    ],
    actualRecords: overrides.actualRecords ?? [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 50, dip: -60.5, azimuth: 90.5 },
    ],
    plannerMeta: meta,
    history: overrides.history ?? [],
    ...overrides,
  };
}

function activeHoleWithLock(): { hole: SavedHoleProject; lib: ReturnType<typeof createLibraryWithHole> } {
  const hole = plannerHole({
    holeId: "exec-audit-1",
    holeName: "DDH-A1",
    plannerMeta: {
      coordinateMode: "collar-relative",
      northReference: "grid",
      plannedAt: "2026-01-01T00:00:00.000Z",
      createdFromPlanner: true,
      status: "approved",
      programName: "Pilot Program",
    },
  });
  let lib = createLibraryWithHole(hole);
  const snapshot = buildPlannerApprovalSnapshot(hole, lib, {
    approvedBy: "Geologist",
  });
  lib = approvePlannerPlan(lib, "exec-audit-1", {
    approvedBy: "Geologist",
    snapshot,
  })!;
  lib = activatePlannerPlanForExecution(lib, "exec-audit-1", {
    now: "2026-06-02T10:00:00.000Z",
  })!;
  const saved = lib.holes.find((h) => h.holeId === "exec-audit-1")!;
  return { hole: saved, lib };
}

describe("execution-audit", () => {
  it("audit report includes lock, approval, and actual survey count", () => {
    const { hole, lib } = activeHoleWithLock();
    const report = buildExecutionAuditReport(hole, lib);
    expect(report).not.toBeNull();
    expect(report!.lockedPlanHash).toBeTruthy();
    expect(report!.approvalHash).toBeTruthy();
    expect(report!.approvedBy).toBe("Geologist");
    expect(report!.actualSurveyCount).toBe(2);
    expect(report!.lockStatus).toBeTruthy();
    expect(report!.latestActualMd).toBe(50);
  });

  it("audit events are chronological", () => {
    const { hole, lib } = activeHoleWithLock();
    const withHistory: SavedHoleProject = {
      ...hole,
      history: [
        {
          id: "h2",
          timestamp: "2026-06-03T12:00:00.000Z",
          type: "survey_added",
          summary: "Survey added at MD 80 m",
        },
        {
          id: "h1",
          timestamp: "2026-06-02T11:00:00.000Z",
          type: "report_exported",
          summary: "Handover report exported",
        },
      ],
    };
    const report = buildExecutionAuditReport(withHistory, lib);
    expect(report).not.toBeNull();
    const times = report!.events.map((e) => Date.parse(e.timestamp));
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]!);
    }
    expect(executionAuditEventKinds(report!)).toContain("plan_locked");
    expect(executionAuditEventKinds(report!)).toContain("plan_approved");
  });

  it("completed hole audit includes completion snapshot", () => {
    const { hole, lib } = activeHoleWithLock();
    const result = completePlannerExecution(lib, hole.holeId, {
      completedBy: "Supervisor",
      completedAt: "2026-06-04T08:00:00.000Z",
    });
    expect(result).not.toBeNull();
    const report = buildExecutionAuditReport(result!.completedHole, result!.library);
    expect(report).not.toBeNull();
    expect(report!.status).toBe("completed");
    expect(report!.completedBy).toBe("Supervisor");
    expect(report!.completedAt).toBe("2026-06-04T08:00:00.000Z");
    expect(report!.finalTrackingStatus).toBeTruthy();
    expect(executionAuditEventKinds(report!)).toContain("completion");
  });

  it("revision lineage appears in audit", () => {
    const { hole, lib } = activeHoleWithLock();
    const nextLib = createPlannerRevision(lib, hole.holeId, {
      newHoleName: "DDH-A1 R2",
      createdAt: "2026-06-05T00:00:00.000Z",
    });
    expect(nextLib).not.toBeNull();
    const source = nextLib!.holes.find((h) => h.holeId === hole.holeId)!;
    const report = buildExecutionAuditReport(source, nextLib!);
    expect(report).not.toBeNull();
    expect(revisionLineageInAudit(report!)).toMatch(/Current: DDH-A1 R1/);
    expect(revisionLineageInAudit(report!)).toMatch(/Next:/);
    expect(executionAuditEventKinds(report!)).toContain("revision_created");
  });

  it("returns null for non-planner holes", () => {
    const hole = buildBlankProject("Field", "Site", "field-1");
    const lib = createLibraryWithHole(hole);
    expect(isExecutionAuditSupported(hole)).toBe(false);
    expect(buildExecutionAuditReport(hole, lib)).toBeNull();
  });
});
