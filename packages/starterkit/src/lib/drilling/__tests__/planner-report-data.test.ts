import { describe, expect, it } from "vitest";
import { createLibraryWithHole } from "../hole-library";
import { buildBlankProject } from "../hole-library";
import {
  buildHolePlanningReportData,
  buildProgramPlanningReportData,
  holePlanningFilename,
  PLANNER_HANDOFF_DISCLAIMER,
  programPlanningFilename,
} from "../planner-report-data";
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

describe("planner-report-data", () => {
  it("builds single-hole report data with disclaimer", () => {
    const lib = createLibraryWithHole(plannerHole("p1", "DDH-100"));
    const data = buildHolePlanningReportData(lib, "p1");
    expect(data?.holeName).toBe("DDH-100");
    expect(data?.disclaimer).toBe(PLANNER_HANDOFF_DISCLAIMER);
    expect(data?.surveyRows.length).toBe(2);
    expect(data?.stationCount).toBe("2");
  });

  it("builds program report data", () => {
    const lib = createLibraryWithHole(plannerHole("p1", "H1"));
    const data = buildProgramPlanningReportData(lib, "prog-1");
    expect(data?.programName).toBe("Test Program");
    expect(data?.holeStatusRows.length).toBe(1);
    expect(data?.manifestSummary.length).toBeGreaterThan(0);
  });

  it("filename helpers slugify safely", () => {
    expect(holePlanningFilename("DDH 100/A", "pdf")).toBe("ddh-100-a-planning-report.pdf");
    expect(programPlanningFilename("Camp Program", "txt")).toBe(
      "camp-program-program-planning-report.txt"
    );
  });
});
