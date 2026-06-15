import { describe, expect, it } from "vitest";
import { createLibraryWithHole, upsertHole } from "../hole-library";
import {
  buildProgramManifest,
  exportPlannerPlanCsv,
  exportProgramCollarCsv,
  exportProgramCoordinateCsv,
  exportProgramCoordinateSystemCsv,
  exportProgramDaughterCsv,
  exportProgramSurveyCsv,
  exportProgramTargetCsv,
  PROGRAM_COLLAR_CSV_HEADER,
  PROGRAM_TARGET_CSV_HEADER,
  plannerExportFilename,
} from "../planner-export";
import type { PlannerProjectMetadata } from "../planner-types";
import { buildBlankProject } from "../hole-library";

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

describe("planner-export", () => {
  it("single plan CSV includes md,dip,azimuth header", () => {
    const csv = exportPlannerPlanCsv([{ md: 0, dip: -60, azimuth: 125 }]);
    expect(csv).toContain("md,dip,azimuth");
    expect(csv).toContain("0,-60.0,125.0");
  });

  it("program collar export includes all non-archived planned holes", () => {
    let lib = createLibraryWithHole(plannerHole("p1", "H1"));
    lib = upsertHole(lib, plannerHole("p2", "H2"));
    lib = upsertHole(
      lib,
      plannerHole("p3", "H3", "archived")
    );
    const csv = exportProgramCollarCsv(lib, "prog-1");
    expect(csv).toContain(PROGRAM_COLLAR_CSV_HEADER);
    expect(csv).toContain("coordinate_mode");
    expect(csv).toContain("p1");
    expect(csv).toContain("p2");
    expect(csv).not.toContain("p3");
  });

  it("program survey export includes hole_id prefix per row", () => {
    const lib = createLibraryWithHole(plannerHole("p1", "H1"));
    const csv = exportProgramSurveyCsv(lib, "prog-1");
    expect(csv).toContain("hole_id,md,dip,azimuth");
    expect(csv).toContain("p1,0,-60.0,90.0");
    expect(csv).toContain("p1,300,-62.0,92.0");
  });

  it("program manifest JSON includes metadata holes and warnings", () => {
    const lib = createLibraryWithHole(plannerHole("p1", "H1"));
    const manifest = buildProgramManifest(lib, "prog-1");
    expect(manifest).not.toBeNull();
    expect(manifest!.program.programId).toBe("prog-1");
    expect(manifest!.holes).toHaveLength(1);
    expect(manifest!.holes[0]!.plannerMeta?.createdFromPlanner).toBe(true);
    expect(Array.isArray(manifest!.warnings)).toBe(true);
    expect(manifest!.qa).toBeDefined();
    expect(manifest!.qa?.holeSummaries).toHaveLength(1);
  });

  it("program coordinate CSV includes standard and daughter holes", () => {
    const standard = plannerHole("p1", "H1");
    const daughter = {
      ...plannerHole("p2", "H2"),
      holeRole: "daughter" as const,
      parentHoleId: "p1",
      kickoffMd: 300,
      plannerMeta: {
        ...plannerHole("p2", "H2").plannerMeta!,
        planType: "daughter" as const,
      },
    };
    let lib = createLibraryWithHole(standard);
    lib = upsertHole(lib, daughter);
    const csv = exportProgramCoordinateCsv(lib, "prog-1");
    expect(csv).toContain("hole_id,plan_type,status");
    expect(csv).toContain("p1,standard");
    expect(csv).toContain("p2,daughter");
  });

  it("manifest preserves projectCoordinateSystem", () => {
    const pcs = {
      mode: "grid" as const,
      gridName: "MGA94",
      epsgCode: "EPSG:28354",
      projectOrigin: { easting: 500000, northing: 7000000, elevation: 400 },
    };
    const hole = {
      ...plannerHole("p1", "H1"),
      plannerMeta: {
        ...plannerHole("p1", "H1").plannerMeta!,
        projectCoordinateSystem: pcs,
      },
    };
    const lib = createLibraryWithHole(hole);
    const manifest = buildProgramManifest(lib, "prog-1");
    expect(manifest!.projectCoordinateSystem?.gridName).toBe("MGA94");
    expect(manifest!.projectCoordinateSystem?.epsgCode).toBe("EPSG:28354");
    expect(manifest!.holes[0]!.localEnu).toBeDefined();
    expect(manifest!.holes[0]!.spatialWarnings).toBeDefined();
  });

  it("target CSV export includes grid and local target fields", () => {
    const lib = createLibraryWithHole(plannerHole("p1", "H1"));
    const csv = exportProgramTargetCsv(lib, "prog-1");
    expect(csv).toContain(PROGRAM_TARGET_CSV_HEADER);
    expect(csv).toContain("p1");
    expect(csv).toContain("200");
  });

  it("daughter CSV export includes mother and kickoff", () => {
    const daughter = {
      ...plannerHole("p2", "H2"),
      holeRole: "daughter" as const,
      parentHoleId: "p1",
      kickoffMd: 200,
      plannerMeta: {
        ...plannerHole("p2", "H2").plannerMeta!,
        planType: "daughter" as const,
      },
    };
    let lib = createLibraryWithHole(plannerHole("p1", "H1"));
    lib = upsertHole(lib, daughter);
    const csv = exportProgramDaughterCsv(lib, "prog-1");
    expect(csv).toContain("daughter_hole_id,mother_hole_id,kickoff_md");
    expect(csv).toContain("p2,p1,200");
  });

  it("coordinate system CSV includes PCS metadata", () => {
    const pcs = {
      mode: "grid" as const,
      gridName: "MGA94",
      epsgCode: "EPSG:28354",
      projectOrigin: { easting: 500000, northing: 7000000, elevation: 400 },
    };
    const hole = {
      ...plannerHole("p1", "H1"),
      plannerMeta: {
        ...plannerHole("p1", "H1").plannerMeta!,
        projectCoordinateSystem: pcs,
      },
    };
    const lib = createLibraryWithHole(hole);
    const csv = exportProgramCoordinateSystemCsv(lib, "prog-1");
    expect(csv).toContain("epsg_code");
    expect(csv).toContain("EPSG:28354");
  });

  it("plan CSV can include hole_id prefix", () => {
    const csv = exportPlannerPlanCsv([{ md: 0, dip: -60, azimuth: 90 }], "p1");
    expect(csv).toContain("hole_id,md,dip,azimuth");
    expect(csv).toContain("p1,0,-60.0,90.0");
  });

  it("manifest includes coordinate export notice for GPS", () => {
    const hole = {
      ...plannerHole("p1", "H1"),
      plannerMeta: {
        ...plannerHole("p1", "H1").plannerMeta!,
        coordinateMode: "gps" as const,
        collar: {
          easting: 0,
          northing: 0,
          elevation: 0,
          latitude: -25,
          longitude: 133,
        },
        projectCoordinateSystem: { mode: "gps" as const },
      },
    };
    const lib = createLibraryWithHole(hole);
    const manifest = buildProgramManifest(lib, "prog-1");
    expect(manifest!.coordinateExportNotice).toBeDefined();
  });

  it("plannerExportFilename uses targetlock prefix and date", () => {
    const name = plannerExportFilename("Test Program", "collars.csv");
    expect(name).toMatch(/^targetlock-planner-test-program-\d{4}-\d{2}-\d{2}-collars\.csv$/);
  });
});
