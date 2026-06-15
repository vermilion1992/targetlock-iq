import { describe, expect, it } from "vitest";
import { buildBlankProject, createLibraryWithHole } from "../hole-library";
import {
  applyPlannerImport,
  parsePlannerImportFiles,
} from "../planner-csv-import";

const COLLAR_CSV = `hole_id,easting,northing,elevation,plan_type,program,status
IMP-001,500000,7000000,420,standard,Import Test,planned
IMP-002,500030,7000020,419,standard,Import Test,draft`;

const SURVEY_CSV = `hole_id,md,dip,azimuth
IMP-001,0,-58,92
IMP-001,50,-58.2,92.5
IMP-002,0,-60,90
IMP-002,50,-60.1,90.2`;

const TARGET_CSV = `hole_id,target_md,target_e,target_n,target_d,tolerance
IMP-001,100,500050,7000050,50,6`;

function blankLib() {
  return createLibraryWithHole(buildBlankProject("OTHER", "Site", "other"));
}

describe("planner-csv-import", () => {
  it("parses collar and survey CSVs", () => {
    const parsed = parsePlannerImportFiles(
      { collarCsv: COLLAR_CSV, surveyCsv: SURVEY_CSV, targetCsv: TARGET_CSV },
      blankLib()
    );
    expect(parsed.ok).toBe(true);
    expect(parsed.detectedHoleCount).toBe(2);
    expect(parsed.holes[0]!.plannerMeta?.createdFromPlanner).toBe(true);
    expect(parsed.holes[0]!.planRecords.length).toBeGreaterThan(1);
    expect(parsed.holes[0]!.target.e).toBe(500050);
  });

  it("converts grid target columns to collar-relative offsets via the collar", () => {
    const gridTargetCsv = `hole_id,target_md,target_easting,target_northing,target_elevation
IMP-001,300,500120,7000180,240`;
    const parsed = parsePlannerImportFiles(
      { collarCsv: COLLAR_CSV, surveyCsv: SURVEY_CSV, targetCsv: gridTargetCsv },
      blankLib()
    );
    expect(parsed.ok).toBe(true);
    const hole = parsed.holes.find((h) => h.holeId === "IMP-001")!;
    // Collar 500000 / 7000000 / RL 420; target RL 240 is 180 m below collar.
    expect(hole.target.e).toBe(120);
    expect(hole.target.n).toBe(180);
    expect(hole.target.d).toBe(180);
    expect(hole.target.md).toBe(300);
  });

  it("reports errors for empty collar file", () => {
    const parsed = parsePlannerImportFiles({ collarCsv: "hole_id,easting\n" }, blankLib());
    expect(parsed.ok).toBe(false);
    expect(parsed.errors.length).toBeGreaterThan(0);
  });

  it("applyPlannerImport adds holes to library", () => {
    const lib = blankLib();
    const parsed = parsePlannerImportFiles(
      { collarCsv: COLLAR_CSV, surveyCsv: SURVEY_CSV },
      lib
    );
    const next = applyPlannerImport(lib, parsed);
    expect(next.holes.some((h) => h.holeId === "IMP-001")).toBe(true);
    expect(next.holes.some((h) => h.holeId === "IMP-002")).toBe(true);
  });
});
