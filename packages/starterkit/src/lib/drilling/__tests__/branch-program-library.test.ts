import { describe, expect, it } from "vitest";
import {
  addTarget,
  createBranchProgramOnMother,
  createDaughterFromKickoff,
  daughterContextLine,
  migrateHoleProject,
} from "../branch-program-library";
import { buildBlankProject, createLibraryWithHole } from "../hole-library";
import { kickoffStationFromMother } from "../branch-program";

describe("branch-program-library", () => {
  it("creates program on mother and adds target", () => {
    const base = buildBlankProject("DDH-0247", "Site A", "mother-1");
    let lib = createLibraryWithHole(base);
    lib = createBranchProgramOnMother(lib, "mother-1", "Site A")!;
    const withTarget = addTarget(lib, "mother-1", {
      label: "Pierce A",
      e: 10,
      n: 20,
      d: 100,
      type: "point",
      priority: 1,
      toleranceM: 8,
    })!;
    const mother = withTarget.holes.find((h) => h.holeId === "mother-1");
    expect(mother?.holeRole).toBe("mother");
    expect(mother?.branchProgram?.targets).toHaveLength(1);
  });

  it("creates daughter from kickoff on actual mother", () => {
    const motherActual = [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 300, dip: -62, azimuth: 92 },
      { md: 600, dip: -64, azimuth: 94 },
    ];
    const base = {
      ...buildBlankProject("DDH-0247", "", "m1"),
      actualRecords: motherActual,
    };
    let lib = createLibraryWithHole(base);
    lib = createBranchProgramOnMother(lib, "m1")!;
    lib = addTarget(lib, "m1", {
      label: "T1",
      e: 50,
      n: 10,
      d: 80,
      type: "point",
      priority: 1,
    })!;
    const targetId = lib.holes.find((h) => h.holeId === "m1")!.branchProgram!.targets[0]!.id;
    const result = createDaughterFromKickoff(lib, "m1", {
      daughterId: "DDH-0247A",
      targetId,
      kickoffMd: 300,
      method: "motor-navi",
      status: "draft",
    });
    expect(result).not.toBeNull();
    const daughter = result!.library.holes.find((h) => h.holeRole === "daughter");
    expect(daughter?.parentHoleId).toBe("m1");
    expect(daughter?.planRecords[0]?.md).toBe(300);
    const ko = kickoffStationFromMother(motherActual, 300);
    expect(ko).not.toBeNull();
  });

  it("migrates v1 daughter status planned to draft", () => {
    const migrated = migrateHoleProject({
      ...buildBlankProject("DDH-0247A", "", "d1"),
      holeRole: "daughter",
      branchStatus: "planned",
    });
    expect(migrated.branchStatus).toBe("draft");
  });

  it("daughterContextLine includes parent and kickoff MD", () => {
    const line = daughterContextLine({
      ...buildBlankProject("DDH-0247A", "", "d1"),
      holeRole: "daughter",
      parentHoleName: "DDH-0247",
      kickoffMd: 465,
    });
    expect(line).toContain("Daughter of DDH-0247");
    expect(line).toContain("465");
  });
});
