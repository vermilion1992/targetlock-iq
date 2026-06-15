import { describe, expect, it } from "vitest";
import { buildBlankProject, createLibraryWithHole } from "../hole-library";
import {
  buildInstitutionalDemoProgram,
  demoProgramHoleCounts,
  loadInstitutionalDemoProgram,
  DEMO_PROGRAM_NAME,
} from "../planner-demo-program";
import { derivePlannerPrograms } from "../planner-program";

describe("planner-demo-program", () => {
  it("builds expected hole counts", () => {
    const counts = demoProgramHoleCounts();
    expect(counts.total).toBe(6);
    expect(counts.standard).toBeGreaterThanOrEqual(3);
    expect(counts.daughters).toBe(2);
    expect(counts.active).toBe(1);
    expect(counts.approved).toBeGreaterThanOrEqual(1);
  });

  it("loads demo without removing existing holes", () => {
    const lib = createLibraryWithHole(buildBlankProject("KEEP", "Site", "keep-me"));
    const next = loadInstitutionalDemoProgram(lib);
    expect(next.holes.some((h) => h.holeId === "keep-me")).toBe(true);
    expect(next.holes.length).toBeGreaterThan(lib.holes.length);
  });

  it("demo holes appear in program grouping", () => {
    let lib = createLibraryWithHole(buildInstitutionalDemoProgram()[0]!);
    for (const hole of buildInstitutionalDemoProgram().slice(1)) {
      lib = {
        ...lib,
        holes: [...lib.holes.filter((h) => h.holeId !== hole.holeId), hole],
      };
    }
    const programs = derivePlannerPrograms(lib);
    const demo = programs.find((p) => p.name === DEMO_PROGRAM_NAME);
    expect(demo).toBeDefined();
    expect(demo!.holeCount).toBe(6);
  });

  it("active demo hole has locked plan", () => {
    const mother = buildInstitutionalDemoProgram().find(
      (h) => h.plannerMeta?.status === "active"
    );
    expect(mother?.plannerMeta?.lockedPlan).toBeDefined();
  });
});
