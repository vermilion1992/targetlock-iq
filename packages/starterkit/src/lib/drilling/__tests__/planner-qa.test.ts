import { describe, expect, it } from "vitest";
import { buildBlankProject, createLibraryWithHole } from "../hole-library";
import { buildProgramManifest } from "../planner-export";
import {
  buildProgramQaReport,
  canApprovePlannerHole,
  clearancePairSelection,
} from "../planner-qa";
import type { PlannerClearancePair, PlannerProjectMetadata } from "../planner-types";

function plannerHole(
  id: string,
  name: string,
  status: PlannerProjectMetadata["status"] = "planned",
  planRecords = [
    { md: 0, dip: -60, azimuth: 90 },
    { md: 300, dip: -62, azimuth: 92 },
  ]
) {
  return {
    ...buildBlankProject(name, "Site", id),
    planRecords,
    target: {
      md: 300,
      e: 100,
      n: 50,
      d: 200,
      tolerance: 6,
      maxDls: 3,
      nextInterval: 30,
    },
    plannerMeta: {
      coordinateMode: "collar-relative" as const,
      northReference: "grid" as const,
      plannedAt: "2026-01-01T00:00:00.000Z",
      createdFromPlanner: true,
      status,
      programId: "prog-1",
      programName: "Test Program",
    },
  };
}

describe("planner-qa", () => {
  it("approval guard blocks hard errors", () => {
    const hole = plannerHole("h1", "H1", "planned", [
      { md: 0, dip: -60, azimuth: 90 },
    ]);
    const lib = createLibraryWithHole(hole);
    const result = canApprovePlannerHole(hole, lib);
    expect(result.allowed).toBe(false);
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it("approval guard allows warnings with confirmation flag", () => {
    const hole = plannerHole("h1", "H1", "planned");
    const lib = createLibraryWithHole(hole);
    const result = canApprovePlannerHole(hole, lib);
    expect(result.allowed).toBe(true);
    expect(result.blockers).toHaveLength(0);
    if (result.warnings.length > 0) {
      expect(result.requiresConfirmation).toBe(true);
    } else {
      expect(result.requiresConfirmation).toBe(false);
    }
  });

  it("program manifest includes QA results", () => {
    const lib = createLibraryWithHole(plannerHole("h1", "H1"));
    const manifest = buildProgramManifest(lib, "prog-1");
    expect(manifest?.qa).toBeDefined();
    expect(manifest?.qa?.settings).toBeDefined();
    expect(manifest?.qa?.holeSummaries.length).toBe(1);
    expect(manifest?.qa?.generatedAt).toBeTruthy();
  });

  it("clearancePairSelection returns both hole IDs", () => {
    const pair: PlannerClearancePair = {
      holeAId: "h1",
      holeBId: "h2",
      holeAName: "H1",
      holeBName: "H2",
      relationship: "standard-standard",
      minDistanceM: 2,
      mdA: 100,
      mdB: 110,
      severity: "risk",
      message: "Too close",
    };
    const selection = clearancePairSelection(pair);
    expect(selection.holeIds).toEqual(["h1", "h2"]);
  });

  it("buildProgramQaReport returns program summary", () => {
    const lib = createLibraryWithHole(plannerHole("h1", "H1"));
    const report = buildProgramQaReport(lib, "prog-1");
    expect(report).not.toBeNull();
    expect(report!.programId).toBe("prog-1");
    expect(report!.holeSummaries).toHaveLength(1);
    expect(report!.programSummary).toBeDefined();
  });
});
