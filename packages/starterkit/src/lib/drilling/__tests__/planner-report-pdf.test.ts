import { describe, expect, it } from "vitest";
import { createLibraryWithHole } from "../hole-library";
import { buildBlankProject } from "../hole-library";
import { buildHolePlanningReportData, buildProgramPlanningReportData } from "../planner-report-data";
import {
  buildHolePlanningPdfBlob,
  buildProgramPlanningPdfBlob,
  collectPlannerHolePdfStrings,
  collectPlannerProgramPdfStrings,
} from "../planner-report-pdf";
import { pdfTextLooksCorrupt } from "../report-pdf-layout";
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

describe("planner-report-pdf", () => {
  it("generates hole planning PDF blob", async () => {
    const lib = createLibraryWithHole(plannerHole("p1", "H1"));
    const data = buildHolePlanningReportData(lib, "p1");
    expect(data).toBeTruthy();
    const blob = await buildHolePlanningPdfBlob(data!);
    const buffer = Buffer.from(await blob.arrayBuffer());
    expect(buffer.subarray(0, 4).toString("latin1")).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(500);
    for (const s of collectPlannerHolePdfStrings(data!)) {
      expect(pdfTextLooksCorrupt(s)).toBe(false);
    }
  });

  it("generates program planning PDF blob", async () => {
    const lib = createLibraryWithHole(plannerHole("p1", "H1"));
    const data = buildProgramPlanningReportData(lib, "prog-1");
    expect(data).toBeTruthy();
    const blob = await buildProgramPlanningPdfBlob(data!);
    const buffer = Buffer.from(await blob.arrayBuffer());
    expect(buffer.subarray(0, 4).toString("latin1")).toBe("%PDF");
    for (const s of collectPlannerProgramPdfStrings(data!)) {
      expect(pdfTextLooksCorrupt(s)).toBe(false);
    }
  });
});
