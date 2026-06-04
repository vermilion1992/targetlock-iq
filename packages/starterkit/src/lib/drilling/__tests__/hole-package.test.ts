import { describe, expect, it } from "vitest";
import { buildHolePackage, parseHolePackage } from "../hole-package";
import { createBranchProgramOnMother, createDaughterFromKickoff, addTarget } from "../branch-program-library";
import { buildBlankProject, createLibraryWithHole, upsertHole } from "../hole-library";
import { buildApprovalSnapshot } from "../branch-program-approval";
import { DEFAULT_CAPABILITY_ASSUMPTIONS } from "../capability-assumptions";
import { kickoffStationFromMother } from "../branch-program";

const MOTHER_ACTUAL = [
  { md: 0, dip: -60, azimuth: 90 },
  { md: 300, dip: -62, azimuth: 92 },
  { md: 600, dip: -64, azimuth: 94 },
];

describe("hole package export/import", () => {
  it("round-trips library with branch program and approval", () => {
    let lib = createLibraryWithHole({
      ...buildBlankProject("DDH-0247", "Site", "mother-1"),
      actualRecords: MOTHER_ACTUAL,
    });
    lib = createBranchProgramOnMother(lib, "mother-1", "Site")!;
    lib = addTarget(lib, "mother-1", {
      label: "Pierce",
      e: 50,
      n: 10,
      d: 80,
      type: "point",
      priority: 1,
    })!;
    const targetId = lib.holes.find((h) => h.holeId === "mother-1")!.branchProgram!.targets[0]!.id;
    const created = createDaughterFromKickoff(lib, "mother-1", {
      daughterId: "DDH-0247A",
      targetId,
      kickoffMd: 300,
      method: "motor-navi",
      status: "approved",
    })!;
    lib = created!.library;
    const mother = lib.holes.find((h) => h.holeId === "mother-1")!;
    const daughterRef = mother.branchProgram!.daughters[0]!;
    const kickoff = kickoffStationFromMother(MOTHER_ACTUAL, 300)!;
    const approval = buildApprovalSnapshot({
      approvedBy: "Pat",
      role: "Geo",
      approvedMethod: "motor-navi",
      approvedKickoffMd: 300,
      approvedTargetId: targetId,
      assumptions: DEFAULT_CAPABILITY_ASSUMPTIONS,
      kickoff,
      requiredDls: 4,
      planRecords: lib.holes.find((h) => h.holeRole === "daughter")!.planRecords,
    });
    lib = upsertHole(lib, {
      ...mother,
      branchProgram: {
        ...mother.branchProgram!,
        daughters: [{ ...daughterRef, approval }],
      },
    });

    const json = JSON.stringify(buildHolePackage(lib));
    const parsed = parseHolePackage(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const restored = parsed.package.library;
    expect(restored.holes.length).toBe(lib.holes.length);
    const restoredMother = restored.holes.find((h) => h.holeId === "mother-1");
    expect(restoredMother?.branchProgram?.daughters[0]?.approval?.approvedBy).toBe("Pat");
    const restoredDaughter = restored.holes.find((h) => h.holeRole === "daughter");
    expect(restoredDaughter?.parentHoleId).toBe("mother-1");
    expect(restoredDaughter?.kickoffMd).toBe(300);
  });
});
