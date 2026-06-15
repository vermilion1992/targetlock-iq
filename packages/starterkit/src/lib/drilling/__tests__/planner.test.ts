import { describe, expect, it } from "vitest";
import { kickoffStationFromMother, requiredDaughterHeading } from "../branch-program";
import { buildStations } from "../desurvey";
import { createLibraryWithHole, buildBlankProject } from "../hole-library";
import {
  buildPlannerMetadata,
  buildStraightPlan,
  createPlannerRevision,
  exportPlannerCsv,
  generatePlannerPlan,
  plannerDraftToSavedHoleProject,
  publishPlannerDraft,
  validatePlannerDraft,
} from "../planner";
import { buildHolePackage, parseHolePackage } from "../hole-package";
import { findHole } from "../hole-library";
import { approvePlannerPlan } from "../planner-status";
import { createEmptyPlannerDraft } from "../planner-types";
import { validateHoleLibrary } from "../storage-health";
import { surveysToCsv } from "../csv";

const MOTHER_PLAN = [
  { md: 0, dip: -60, azimuth: 90 },
  { md: 300, dip: -62, azimuth: 92 },
];
const MOTHER_ACTUAL = [
  { md: 0, dip: -60, azimuth: 90 },
  { md: 300, dip: -65, azimuth: 95 },
];

describe("planner", () => {
  it("generates sorted standard plan from collar + target", () => {
    const rows = buildStraightPlan({
      startMd: 0,
      startDip: -60,
      startAzimuth: 125,
      startPosition: { e: 0, n: 0, d: 0 },
      targetEnu: { e: 100, n: -50, d: 200 },
      targetMd: 300,
      surveyInterval: 30,
    });
    expect(rows.length).toBeGreaterThan(1);
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i]!.md).toBeGreaterThanOrEqual(rows[i - 1]!.md);
    }
    expect(rows[rows.length - 1]!.md).toBeCloseTo(300, 0);
  });

  it("generates a curved standard plan when pathDesign is curve-to-target", () => {
    const draft = createEmptyPlannerDraft();
    draft.planType = "standard";
    draft.projectName = "Curve site";
    draft.holeName = "DDH-CURVE";
    draft.initialDip = -60;
    draft.initialAzimuth = 90;
    draft.target = {
      e: 250,
      n: 40,
      d: 420,
      tolerance: 6,
      inputMode: "collar-relative",
    };
    draft.constraints = {
      surveyInterval: 30,
      maxDls: 3,
      pathDesign: "curve-to-target",
    };

    const generated = generatePlannerPlan(draft);
    expect(generated.planRecords.length).toBeGreaterThan(2);
    const stations = buildStations(generated.planRecords);
    const end = stations[stations.length - 1]!;
    expect(Math.hypot(end.e - 250, end.n - 40, end.d - 420)).toBeLessThan(1);
    // Direction changes along the path — it is genuinely curved.
    const first = generated.planRecords[0]!;
    const last = generated.planRecords[generated.planRecords.length - 1]!;
    expect(
      Math.abs(first.dip - last.dip) + Math.abs(first.azimuth - last.azimuth)
    ).toBeGreaterThan(1);
  });

  it("reports infeasible curved plans instead of silently generating them", () => {
    const draft = createEmptyPlannerDraft();
    draft.planType = "standard";
    draft.projectName = "Curve site";
    draft.holeName = "DDH-IMPOSSIBLE";
    draft.initialDip = -60;
    draft.initialAzimuth = 90;
    draft.target = {
      e: 0,
      n: 200,
      d: 100,
      tolerance: 6,
      inputMode: "collar-relative",
    };
    draft.constraints = {
      surveyInterval: 30,
      maxDls: 1,
      pathDesign: "curve-to-target",
    };

    const generated = generatePlannerPlan(draft);
    expect(generated.planRecords).toHaveLength(0);
    expect(
      generated.warnings.some((w) => w.includes("Cannot reach target within max DLS"))
    ).toBe(true);
  });

  it("daughter kickoff uses mother actual path not plan", () => {
    const lib = createLibraryWithHole({
      ...buildBlankProject("DDH-MOTHER", "Site", "mother-1"),
      planRecords: MOTHER_PLAN,
      actualRecords: MOTHER_ACTUAL,
    });

    const draft = createEmptyPlannerDraft();
    draft.planType = "daughter";
    draft.projectName = "Branch site";
    draft.holeName = "DDH-0247A";
    draft.daughterKickoff = {
      motherHoleId: "mother-1",
      motherHoleName: "DDH-MOTHER",
      kickoffMd: 300,
      e: 0,
      n: 0,
      d: 0,
      dip: -60,
      azimuth: 90,
    };
    draft.target = { e: 80, n: 20, d: 120, tolerance: 8, inputMode: "collar-relative", md: 480 };
    draft.daughterKickoff = {
      motherHoleId: "mother-1",
      motherHoleName: "DDH-MOTHER",
      kickoffMd: 300,
      e: 0,
      n: 0,
      d: 0,
      dip: -60,
      azimuth: 90,
    };

    const actualKo = kickoffStationFromMother(MOTHER_ACTUAL, 300)!;
    const planKo = kickoffStationFromMother(MOTHER_PLAN, 300)!;
    expect(actualKo.dip).not.toBeCloseTo(planKo.dip, 0);

    const generated = generatePlannerPlan(
      {
        ...draft,
        daughterKickoff: {
          motherHoleId: "mother-1",
          motherHoleName: "DDH-MOTHER",
          kickoffMd: actualKo.md,
          e: actualKo.e,
          n: actualKo.n,
          d: actualKo.d,
          dip: actualKo.dip,
          azimuth: actualKo.azimuth,
        },
      },
      lib
    );
    expect(generated.planRecords.length).toBeGreaterThan(0);
    expect(generated.planRecords[0]!.md).toBeCloseTo(300, 0);
    expect(generated.planRecords[0]!.dip).toBeCloseTo(actualKo.dip, 0);
  });

  it("generated plan terminal position near requested target", () => {
    const draft = createEmptyPlannerDraft();
    draft.planType = "standard";
    draft.projectName = "Test";
    draft.holeName = "DDH-TEST";
    const heading = requiredDaughterHeading(
      { e: 0, n: 0, d: 0 },
      { e: 150, n: -80, d: 250 }
    );
    draft.initialDip = heading.dip;
    draft.initialAzimuth = heading.azimuth;
    draft.target = { e: 150, n: -80, d: 250, tolerance: 6, inputMode: "collar-relative" };
    draft.constraints = { surveyInterval: 30, maxDls: 12 };

    const generated = generatePlannerPlan(draft);
    const stations = buildStations(generated.planRecords);
    const terminal = stations[stations.length - 1]!;
    const miss = Math.sqrt(
      (terminal.e - 150) ** 2 + (terminal.n - -80) ** 2 + (terminal.d - 250) ** 2
    );
    expect(miss).toBeLessThan(draft.target.tolerance * 2);
  });

  it("returns validation warnings for missing collar/target inputs", () => {
    const draft = createEmptyPlannerDraft();
    draft.planType = "standard";
    const warnings = validatePlannerDraft(draft);
    expect(warnings.length).toBeGreaterThan(0);
    expect(() => generatePlannerPlan(draft)).not.toThrow();
  });

  it("converts draft to SavedHoleProject passing library validation", () => {
    const draft = createEmptyPlannerDraft();
    draft.planType = "standard";
    draft.projectName = "North Camp";
    draft.holeName = "DDH-PLAN-01";
    draft.initialDip = -70;
    draft.initialAzimuth = 200;
    draft.target = { e: 50, n: 30, d: 180, tolerance: 6, inputMode: "collar-relative", md: 350 };
    const generated = generatePlannerPlan(draft);
    const project = plannerDraftToSavedHoleProject(generated);
    expect(project).not.toBeNull();
    const lib = { version: 1 as const, activeHoleId: project!.holeId, holes: [project!] };
    expect(validateHoleLibrary(lib)).toBeNull();
    expect(project!.plannerMeta?.coordinateMode).toBe("collar-relative");
  });

  it("publishPlannerDraft saves standard hole without auto-activate by default", () => {
    const draft = createEmptyPlannerDraft();
    draft.planType = "standard";
    draft.projectName = "Pilot";
    draft.holeName = "DDH-NEW";
    draft.initialDip = -60;
    draft.initialAzimuth = 90;
    draft.target = { e: 40, n: 20, d: 150, tolerance: 6, inputMode: "collar-relative", md: 300 };
    const generated = generatePlannerPlan(draft);
    const lib = createLibraryWithHole(buildBlankProject("Existing", "", "existing-1"));
    const result = publishPlannerDraft(generated, lib);
    expect(result).not.toBeNull();
    expect(result!.library.holes.length).toBe(2);
    expect(result!.library.activeHoleId).toBe("existing-1");
    const saved = result!.library.holes.find((h) => h.holeId === result!.holeId);
    expect(saved?.planRecords.length).toBeGreaterThan(0);
    expect(saved?.plannerMeta?.createdFromPlanner).toBe(true);
    expect(saved?.plannerMeta?.status).toBe("planned");
  });

  it("publish bridges PCS declination and convergence into the hole reference system", () => {
    const draft = createEmptyPlannerDraft();
    draft.planType = "standard";
    draft.projectName = "Pilot";
    draft.holeName = "DDH-REF";
    draft.northReference = "magnetic";
    draft.initialDip = -60;
    draft.initialAzimuth = 90;
    draft.target = { e: 40, n: 20, d: 150, tolerance: 6, inputMode: "collar-relative", md: 300 };
    draft.projectCoordinateSystem = {
      mode: "grid",
      gridName: "MGA2020 Zone 55",
      magneticDeclinationDeg: 8.2,
      gridConvergenceDeg: -1.4,
    };
    const generated = generatePlannerPlan(draft);
    const lib = createLibraryWithHole(buildBlankProject("Existing", "", "existing-1"));
    const result = publishPlannerDraft(generated, lib);
    const saved = result!.library.holes.find((h) => h.holeId === result!.holeId);
    expect(saved?.referenceSystem?.planReference).toBe("magnetic");
    expect(saved?.referenceSystem?.magneticDeclinationDeg).toBe(8.2);
    expect(saved?.referenceSystem?.gridRotationDeg).toBe(-1.4);
  });

  it("publish without PCS values leaves reference system at defaults", () => {
    const draft = createEmptyPlannerDraft();
    draft.planType = "standard";
    draft.projectName = "Pilot";
    draft.holeName = "DDH-REF-DEFAULT";
    draft.initialDip = -60;
    draft.initialAzimuth = 90;
    draft.target = { e: 40, n: 20, d: 150, tolerance: 6, inputMode: "collar-relative", md: 300 };
    const generated = generatePlannerPlan(draft);
    const lib = createLibraryWithHole(buildBlankProject("Existing", "", "existing-1"));
    const result = publishPlannerDraft(generated, lib);
    const saved = result!.library.holes.find((h) => h.holeId === result!.holeId);
    expect(saved?.referenceSystem?.magneticDeclinationDeg).toBe(0);
    expect(saved?.referenceSystem?.gridRotationDeg).toBe(0);
  });

  it("publishPlannerDraft activates when opts.activate is true", () => {
    const draft = createEmptyPlannerDraft();
    draft.planType = "standard";
    draft.projectName = "Pilot";
    draft.holeName = "DDH-ACT";
    draft.initialDip = -60;
    draft.initialAzimuth = 90;
    draft.target = { e: 40, n: 20, d: 150, tolerance: 6, inputMode: "collar-relative", md: 300 };
    const generated = generatePlannerPlan(draft);
    const lib = createLibraryWithHole(buildBlankProject("Existing", "", "existing-1"));
    const result = publishPlannerDraft(generated, lib, { activate: true });
    expect(result!.library.activeHoleId).toBe(result!.holeId);
  });

  it("buildPlannerMetadata sets Phase 2 defaults", () => {
    const draft = createEmptyPlannerDraft();
    draft.projectName = "North Camp";
    draft.programName = "Camp Program";
    const meta = buildPlannerMetadata(draft);
    expect(meta.createdFromPlanner).toBe(true);
    expect(meta.status).toBe("planned");
    expect(meta.planRevision).toBe(1);
    expect(meta.programName).toBe("Camp Program");
  });

  it("createPlannerRevision duplicates without mutating original", () => {
    const draft = createEmptyPlannerDraft();
    draft.planType = "standard";
    draft.projectName = "Pilot";
    draft.holeName = "DDH-REV";
    draft.initialDip = -60;
    draft.initialAzimuth = 90;
    draft.target = { e: 40, n: 20, d: 150, tolerance: 6, inputMode: "collar-relative", md: 300 };
    const generated = generatePlannerPlan(draft);
    const lib = createLibraryWithHole(buildBlankProject("Existing", "", "existing-1"));
    const published = publishPlannerDraft(generated, lib);
    let workLib = published!.library;
    workLib =
      approvePlannerPlan(workLib, published!.holeId, { approvedBy: "Geo" }) ??
      workLib;
    const original = findHole(workLib, published!.holeId)!;
    const originalRecords = [...original.planRecords];
    const revised = createPlannerRevision(workLib, published!.holeId);
    expect(revised).not.toBeNull();
    const stillOriginal = findHole(revised!, published!.holeId)!;
    expect(stillOriginal.planRecords).toEqual(originalRecords);
    expect(stillOriginal.plannerMeta?.status).toBe("approved");
    const revHole = revised!.holes.find((h) => h.holeName.includes("R2"));
    expect(revHole?.plannerMeta?.status).toBe("draft");
    expect(revHole?.plannerMeta?.previousRevisionHoleId).toBe(published!.holeId);
    const source = revised!.holes.find((h) => h.holeId === published!.holeId);
    expect(source?.plannerMeta?.nextRevisionHoleId).toBe(revHole?.holeId);
  });

  it("hole package round-trip preserves extended plannerMeta", () => {
    const draft = createEmptyPlannerDraft();
    draft.planType = "standard";
    draft.projectName = "Pilot";
    draft.holeName = "DDH-PKG";
    draft.programName = "Package Prog";
    draft.initialDip = -60;
    draft.initialAzimuth = 90;
    draft.target = { e: 40, n: 20, d: 150, tolerance: 6, inputMode: "collar-relative", md: 300 };
    const generated = generatePlannerPlan(draft);
    const lib = createLibraryWithHole(buildBlankProject("Existing", "", "existing-1"));
    const published = publishPlannerDraft(generated, lib);
    const pkg = buildHolePackage(published!.library);
    const parsed = parseHolePackage(JSON.stringify(pkg));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const hole = parsed.package.library.holes.find((h) => h.holeId === published!.holeId);
    expect(hole?.plannerMeta?.createdFromPlanner).toBe(true);
    expect(hole?.plannerMeta?.programName).toBe("Package Prog");
    expect(hole?.plannerMeta?.status).toBe("planned");
  });

  it("exportPlannerCsv matches surveysToCsv format", () => {
    const rows = [
      { md: 0, dip: -60, azimuth: 125 },
      { md: 30, dip: -61, azimuth: 126 },
    ];
    expect(exportPlannerCsv(rows)).toBe(surveysToCsv(rows));
    expect(exportPlannerCsv(rows)).toContain("md,dip,azimuth");
  });
});
