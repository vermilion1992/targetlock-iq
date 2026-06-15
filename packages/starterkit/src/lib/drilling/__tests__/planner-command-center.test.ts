import { describe, expect, it } from "vitest";
import {
  createLibraryWithHole,
  upsertHole,
  buildBlankProject,
} from "../hole-library";
import {
  buildNeedsAttentionList,
  buildProgramStatusCounts,
  buildRecentPlannerEvents,
  evaluateProgramReadiness,
} from "../planner-command-center";
import type { PlannerProjectMetadata } from "../planner-types";

function baseMeta(
  overrides: Partial<PlannerProjectMetadata> = {}
): PlannerProjectMetadata {
  return {
    coordinateMode: "collar-relative",
    northReference: "grid",
    plannedAt: "2026-01-01T00:00:00.000Z",
    createdFromPlanner: true,
    status: "planned",
    programId: "prog-demo",
    programName: "Demo Program",
    collar: { easting: 100, northing: 200, elevation: 50 },
    ...overrides,
  };
}

function plannerHole(
  id: string,
  name: string,
  meta: Partial<PlannerProjectMetadata> = {}
) {
  return {
    ...buildBlankProject(name, "Camp", id),
    planRecords: [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 300, dip: -62, azimuth: 92 },
    ],
    target: { e: 100, n: 200, d: 50, md: 300, tolerance: 6, maxDls: 3, nextInterval: 30 },
    plannerMeta: baseMeta(meta),
  };
}

describe("planner-command-center", () => {
  it("builds status counts for mixed hole states", () => {
    let lib = createLibraryWithHole(plannerHole("h1", "H1", { status: "draft" }));
    lib = upsertHole(
      lib,
      plannerHole("h2", "H2", {
        status: "approved",
        approvedAt: "2026-02-01T00:00:00.000Z",
      })
    );
    const counts = buildProgramStatusCounts(lib, "prog-demo");
    expect(counts.draft).toBe(1);
    expect(counts.approved).toBe(1);
  });

  it("includes daughter holes in program counts", () => {
    const mother = plannerHole("m1", "MOTHER-1", { status: "active", planType: "standard" });
    const daughter = {
      ...plannerHole("d1", "DAUGHTER-1", {
        status: "planned",
        planType: "daughter",
      }),
      holeRole: "daughter" as const,
      parentHoleId: "m1",
      kickoffMd: 150,
    };
    let lib = createLibraryWithHole(mother);
    lib = upsertHole(lib, daughter);
    const counts = buildProgramStatusCounts(lib, "prog-demo");
    expect(counts.active).toBe(1);
    expect(counts.planned).toBe(1);
  });

  it("builds needs attention for blocked QA", () => {
    const bad = {
      ...plannerHole("h1", "BAD-1"),
      planRecords: [{ md: 0, dip: -60, azimuth: 90 }],
    };
    const lib = createLibraryWithHole(bad);
    const items = buildNeedsAttentionList(lib, "prog-demo");
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]!.holeName).toBe("BAD-1");
  });

  it("builds recent events from approval timestamps", () => {
    const lib = createLibraryWithHole(
      plannerHole("h1", "H1", {
        status: "approved",
        approvedAt: "2026-03-01T12:00:00.000Z",
        approvedBy: "Geologist",
      })
    );
    const events = buildRecentPlannerEvents(lib, "prog-demo");
    expect(events.some((e) => e.kind === "approved")).toBe(true);
  });

  it("evaluates program readiness gates", () => {
    const lib = createLibraryWithHole(
      plannerHole("h1", "H1", { status: "approved", approvedAt: "2026-02-01T00:00:00.000Z" })
    );
    const readiness = evaluateProgramReadiness(lib, "prog-demo", {
      coordinateMetadataReviewed: true,
    });
    expect(readiness.gates.length).toBe(5);
    expect(readiness.score).toBeGreaterThan(0);
  });
});
