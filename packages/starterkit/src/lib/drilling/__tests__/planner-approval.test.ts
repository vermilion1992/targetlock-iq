import { describe, expect, it } from "vitest";
import { createLibraryWithHole, upsertHole } from "../hole-library";
import { buildBlankProject } from "../hole-library";
import {
  buildPlannerApprovalSnapshot,
  hashPlannerPlan,
  plannerApprovalStatus,
  resolvePlannerApprovalStatus,
} from "../planner-approval";
import type { PlannerProjectMetadata } from "../planner-types";

function plannerHole(
  id: string,
  name: string,
  status: PlannerProjectMetadata["status"] = "planned"
) {
  return {
    ...buildBlankProject(name, "Camp", id),
    planRecords: [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 300, dip: -62, azimuth: 92 },
    ],
    plannerMeta: {
      coordinateMode: "collar-relative" as const,
      northReference: "grid" as const,
      plannedAt: "2026-01-01T00:00:00.000Z",
      createdFromPlanner: true,
      status,
      programId: "prog-1",
      programName: "Test Program",
      collar: { easting: 100, northing: 200, elevation: 50 },
    },
  };
}

describe("planner-approval", () => {
  it("builds approval snapshot with hashes", () => {
    const lib = createLibraryWithHole(plannerHole("p1", "H1"));
    const hole = lib.holes[0]!;
    const snapshot = buildPlannerApprovalSnapshot(hole, lib, {
      approvedBy: "Alex",
      role: "Geologist",
    });
    expect(snapshot.approvedBy).toBe("Alex");
    expect(snapshot.planHash).toBe(hashPlannerPlan(hole));
    expect(snapshot.planRevision).toBe(1);
  });

  it("marks approval stale when plan changes", () => {
    let lib = createLibraryWithHole(plannerHole("p1", "H1"));
    const hole = lib.holes[0]!;
    const snapshot = buildPlannerApprovalSnapshot(hole, lib, {
      approvedBy: "Alex",
    });
    const current = {
      planHash: hashPlannerPlan({
        ...hole,
        planRecords: [
          { md: 0, dip: -60, azimuth: 90 },
          { md: 310, dip: -63, azimuth: 93 },
        ],
      }),
      qaHash: snapshot.qaHash,
      coordinateSystemHash: snapshot.coordinateSystemHash,
    };
    const status = plannerApprovalStatus(snapshot, current);
    expect(status.state).toBe("stale");
    expect(status.changedFields).toContain("plan or target");
  });

  it("resolvePlannerApprovalStatus is current when unchanged", () => {
    const lib = createLibraryWithHole(plannerHole("p1", "H1"));
    const hole = lib.holes[0]!;
    const snapshot = buildPlannerApprovalSnapshot(hole, lib, {
      approvedBy: "Alex",
    });
    const withApproval = upsertHole(lib, {
      ...hole,
      plannerMeta: {
        ...hole.plannerMeta!,
        status: "approved",
        approvalSnapshot: snapshot,
      },
    });
    const saved = withApproval.holes[0]!;
    const status = resolvePlannerApprovalStatus(saved, withApproval);
    expect(status.state).toBe("current");
  });
});
