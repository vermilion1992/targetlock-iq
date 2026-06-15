import { describe, expect, it } from "vitest";
import { createLibraryWithHole } from "../hole-library";
import { buildBlankProject } from "../hole-library";
import {
  buildOpenInTargetLockSummary,
  evaluateHandoffReadiness,
} from "../planner-handoff";
import type { PlannerProjectMetadata } from "../planner-types";

function plannerHole(id: string, name: string) {
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
      status: "planned" as const,
      programId: "prog-1",
      programName: "Test Program",
      collar: { easting: 100, northing: 200, elevation: 50 },
    },
  };
}

describe("planner-handoff", () => {
  it("blocks handoff when coordinate metadata not reviewed", () => {
    const lib = createLibraryWithHole(plannerHole("p1", "H1"));
    const hole = lib.holes[0]!;
    const readiness = evaluateHandoffReadiness(hole, lib);
    expect(readiness.ready).toBe(false);
    expect(readiness.items.find((i) => i.id === "coordinate_metadata")?.passed).toBe(
      false
    );
  });

  it("allows handoff with bypass flags", () => {
    const lib = createLibraryWithHole(plannerHole("p1", "H1"));
    const hole = lib.holes[0]!;
    const readiness = evaluateHandoffReadiness(hole, lib, {
      coordinateMetadataReviewed: true,
      handoffBypassApproval: true,
      handoffBypassSignoffNote: true,
    });
    expect(readiness.ready).toBe(true);
  });

  it("buildOpenInTargetLockSummary includes hole name", () => {
    const lib = createLibraryWithHole(plannerHole("p1", "H1"));
    const text = buildOpenInTargetLockSummary(lib.holes[0]!, lib);
    expect(text).toContain("H1");
    expect(text).toContain("/targetlock");
  });
});
