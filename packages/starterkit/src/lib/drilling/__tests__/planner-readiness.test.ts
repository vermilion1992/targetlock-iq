import { describe, expect, it } from "vitest";
import { createLibraryWithHole } from "../hole-library";
import { buildBlankProject } from "../hole-library";
import { evaluatePlanReadiness } from "../planner-readiness";
import { hashPlannerPlan } from "../planner-approval";
import type { PlannerProjectMetadata } from "../planner-types";

function plannerHole(id: string, name: string, meta: Partial<PlannerProjectMetadata> = {}) {
  return {
    ...buildBlankProject(name, "Camp", id),
    planRecords: [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 300, dip: -62, azimuth: 92 },
    ],
    target: { e: 100, n: 200, d: 50, md: 300, tolerance: 6, maxDls: 3, nextInterval: 30 },
    plannerMeta: {
      coordinateMode: "collar-relative" as const,
      northReference: "grid" as const,
      plannedAt: "2026-01-01T00:00:00.000Z",
      createdFromPlanner: true,
      status: "planned" as const,
      programId: "prog-1",
      programName: "Test Program",
      collar: { easting: 100, northing: 200, elevation: 50 },
      ...meta,
    },
  };
}

describe("planner-readiness", () => {
  it("returns blocked for insufficient stations", () => {
    const lib = createLibraryWithHole({
      ...plannerHole("p1", "H1"),
      planRecords: [{ md: 0, dip: -60, azimuth: 90 }],
    });
    const readiness = evaluatePlanReadiness(lib.holes[0]!, lib);
    expect(readiness.state).toBe("blocked");
    expect(readiness.blockers.some((b) => b.includes("stations"))).toBe(true);
  });

  it("returns ready for clean planned hole", () => {
    const lib = createLibraryWithHole(plannerHole("p1", "H1"));
    const readiness = evaluatePlanReadiness(lib.holes[0]!, lib);
    expect(["ready", "needs-review"]).toContain(readiness.state);
    expect(readiness.score).toBeGreaterThan(50);
  });

  it("returns active state for active holes", () => {
    const lib = createLibraryWithHole(
      plannerHole("p1", "H1", {
        status: "active",
        activatedAt: "2026-02-01T00:00:00.000Z",
      })
    );
    const readiness = evaluatePlanReadiness(lib.holes[0]!, lib);
    expect(readiness.state).toBe("active");
    expect(readiness.nextAction).toContain("TargetLock");
  });

  it("flags stale approval on approved hole after plan change", () => {
    const hole = plannerHole("p1", "H1", {
      status: "approved",
      approvedAt: "2026-01-01T00:00:00.000Z",
      approvalSnapshot: {
        approvedBy: "Geo",
        approvedAt: "2026-01-01T00:00:00.000Z",
        statusAtApproval: "planned",
        planHash: "old-hash",
        qaHash: "{}",
        coordinateSystemHash: "null",
        planRevision: 1,
        warningsAtApproval: [],
        hardErrorsAtApproval: [],
      },
    });
    const lib = createLibraryWithHole(hole);
    const changed = {
      ...lib.holes[0]!,
      planRecords: [
        { md: 0, dip: -60, azimuth: 90 },
        { md: 350, dip: -62, azimuth: 92 },
      ],
    };
    changed.plannerMeta!.approvalSnapshot!.planHash = "old-hash";
    const lib2 = createLibraryWithHole(changed);
    const currentHash = hashPlannerPlan(lib2.holes[0]!);
    expect(currentHash).not.toBe("old-hash");
    const readiness = evaluatePlanReadiness(lib2.holes[0]!, lib2);
    expect(readiness.state).toBe("blocked");
    expect(readiness.blockers.some((b) => b.includes("stale"))).toBe(true);
  });

  it("blocks grid mode hole without collar coordinates", () => {
    const lib = createLibraryWithHole(
      plannerHole("p1", "H1", {
        coordinateMode: "grid",
        collar: undefined,
      })
    );
    const readiness = evaluatePlanReadiness(lib.holes[0]!, lib);
    expect(readiness.state).toBe("blocked");
    expect(readiness.blockers.some((b) => b.includes("Collar coordinates"))).toBe(
      true
    );
  });

  it("allows collar-relative local-only without grid collar", () => {
    const lib = createLibraryWithHole(
      plannerHole("p1", "H1", {
        coordinateMode: "collar-relative",
        collar: undefined,
      })
    );
    const readiness = evaluatePlanReadiness(lib.holes[0]!, lib);
    expect(readiness.blockers.some((b) => b.includes("Collar coordinates"))).toBe(
      false
    );
  });

  it("returns completed for completed holes", () => {
    const lib = createLibraryWithHole(
      plannerHole("p1", "H1", {
        status: "completed",
        completedAt: "2026-03-01T00:00:00.000Z",
      })
    );
    const readiness = evaluatePlanReadiness(lib.holes[0]!, lib);
    expect(readiness.state).toBe("completed");
    expect(readiness.score).toBe(100);
  });
});
