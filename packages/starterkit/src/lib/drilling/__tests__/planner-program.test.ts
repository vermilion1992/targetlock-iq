import { describe, expect, it } from "vitest";
import { createLibraryWithHole, upsertHole } from "../hole-library";
import {
  buildRelationshipTree,
  collectPlannerWarnings,
  derivePlannerPrograms,
  listPlannerHoles,
  plannerHoleSummary,
} from "../planner-program";
import { activatePlannerPlanForExecution } from "../execution-bridge";
import type { PlannerProjectMetadata } from "../planner-types";
import type { SavedHoleProject } from "../storage";
import { buildBlankProject } from "../hole-library";

function plannerHole(
  id: string,
  name: string,
  meta: Partial<PlannerProjectMetadata> & { status?: PlannerProjectMetadata["status"] } = {}
): SavedHoleProject {
  return {
    ...buildBlankProject(name, "Camp", id),
    planRecords: [{ md: 0, dip: -60, azimuth: 90 }, { md: 300, dip: -62, azimuth: 92 }],
    actualRecords: [{ md: 0, dip: -60, azimuth: 90 }],
    plannerMeta: {
      coordinateMode: "collar-relative",
      northReference: "grid",
      plannedAt: "2026-01-01T00:00:00.000Z",
      createdFromPlanner: true,
      status: meta.status ?? "planned",
      programId: meta.programId,
      programName: meta.programName,
      planType: meta.planType,
    },
    holeRole: meta.planType === "daughter" ? "daughter" : "standard",
    parentHoleId: meta.planType === "daughter" ? "mother-1" : undefined,
    parentHoleName: meta.planType === "daughter" ? "DDH-MOTHER" : undefined,
    kickoffMd: meta.planType === "daughter" ? 300 : undefined,
  };
}

describe("planner-program", () => {
  it("filters planner-created holes from library", () => {
    const lib = createLibraryWithHole(buildBlankProject("Dashboard", "", "dash-1"));
    const withPlanner = upsertHole(
      lib,
      plannerHole("plan-1", "DDH-001", { programId: "prog-1", programName: "Prog A" })
    );
    const holes = listPlannerHoles(withPlanner);
    expect(holes).toHaveLength(1);
    expect(holes[0]!.holeId).toBe("plan-1");
  });

  it("derives program groups from hole metadata", () => {
    let lib = createLibraryWithHole(
      plannerHole("p1", "H1", { programId: "prog-a", programName: "Program A" })
    );
    lib = upsertHole(
      lib,
      plannerHole("p2", "H2", { programId: "prog-a", programName: "Program A" })
    );
    const programs = derivePlannerPrograms(lib);
    expect(programs).toHaveLength(1);
    expect(programs[0]!.programId).toBe("prog-a");
    expect(programs[0]!.holeCount).toBe(2);
  });

  it("warns when magnetic north is used without a PCS declination", () => {
    const hole = plannerHole("m1", "MAG-1", { programId: "prog-m" });
    hole.plannerMeta!.northReference = "magnetic";
    const lib = createLibraryWithHole(hole);
    expect(
      collectPlannerWarnings(hole, lib).some((w) => w.includes("declination"))
    ).toBe(true);

    // Providing the site declination clears the warning.
    hole.plannerMeta!.projectCoordinateSystem = {
      mode: "grid",
      magneticDeclinationDeg: 8.2,
    };
    expect(
      collectPlannerWarnings(hole, createLibraryWithHole(hole)).some((w) =>
        w.includes("declination")
      )
    ).toBe(false);
  });

  it("warns when a program mixes north references", () => {
    const a = plannerHole("n1", "N1", { programId: "prog-n" });
    const b = plannerHole("n2", "N2", { programId: "prog-n" });
    b.plannerMeta!.northReference = "magnetic";
    b.plannerMeta!.projectCoordinateSystem = {
      mode: "grid",
      magneticDeclinationDeg: 8.2,
    };
    let lib = createLibraryWithHole(a);
    lib = upsertHole(lib, b);

    const warnings = collectPlannerWarnings(a, lib);
    expect(warnings.some((w) => w.includes("mixes north references"))).toBe(true);

    // Single-reference programs stay clean.
    const soloLib = createLibraryWithHole(
      plannerHole("n3", "N3", { programId: "prog-solo" })
    );
    const solo = soloLib.holes[0]!;
    expect(
      collectPlannerWarnings(solo, soloLib).some((w) =>
        w.includes("mixes north references")
      )
    ).toBe(false);
  });

  it("builds relationship tree with standard roots and daughter children", () => {
    const mother = {
      ...buildBlankProject("DDH-MOTHER", "Camp", "mother-1"),
      actualRecords: [
        { md: 0, dip: -60, azimuth: 90 },
        { md: 400, dip: -65, azimuth: 95 },
      ],
      plannerMeta: {
        coordinateMode: "collar-relative" as const,
        northReference: "grid" as const,
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "active" as const,
        programId: "prog-1",
        programName: "Prog",
        planType: "standard" as const,
      },
    };
    let lib = createLibraryWithHole(mother);
    lib = upsertHole(
      lib,
      plannerHole("d1", "DDH-A", {
        programId: "prog-1",
        programName: "Prog",
        planType: "daughter",
      })
    );
    const programHoles = listPlannerHoles(lib, { includeArchived: true });
    const tree = buildRelationshipTree(programHoles, lib);
    const daughterNode = tree.flatMap((n) => n.children).find((c) => c.holeId === "d1");
    expect(daughterNode).toBeDefined();
    expect(daughterNode!.planType).toBe("daughter");
  });

  it("missing mother daughter creates warning in tree", () => {
    let lib = createLibraryWithHole(
      plannerHole("d1", "Orphan", {
        programId: "prog-1",
        programName: "Prog",
        planType: "daughter",
      })
    );
    const programHoles = listPlannerHoles(lib, { includeArchived: true });
    const tree = buildRelationshipTree(programHoles, lib);
    const orphan = tree.find((n) => n.holeId === "d1");
    expect(orphan?.warning).toBeTruthy();
  });

  it("warns on duplicate hole names in same program", () => {
    let lib = createLibraryWithHole(
      plannerHole("p1", "DDH-001", { programId: "prog-1", programName: "Prog" })
    );
    lib = upsertHole(
      lib,
      plannerHole("p2", "DDH-001", { programId: "prog-1", programName: "Prog" })
    );
    const hole = lib.holes.find((h) => h.holeId === "p2")!;
    const warnings = collectPlannerWarnings(hole, lib);
    expect(warnings.some((w) => w.includes("Duplicate hole name"))).toBe(true);
  });

  it("plannerHoleSummary includes execution state for active plans", () => {
    let lib = createLibraryWithHole(
      plannerHole("active-1", "DDH-ACTIVE", {
        programId: "prog-1",
        programName: "Prog",
        status: "approved",
      })
    );
    lib = activatePlannerPlanForExecution(lib, "active-1")!;
    const hole = lib.holes.find((h) => h.holeId === "active-1")!;
    const summary = plannerHoleSummary(hole, lib);
    expect(summary.status).toBe("active");
    expect(summary.executionState).toBe("not-started");
    expect(summary.lockStatus).toBeTruthy();
  });
});
