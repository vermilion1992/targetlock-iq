import { hashPlannerPlan } from "./planner-approval";
import { buildLockedPlanSnapshot } from "./plan-lock";
import { upsertHole, type HoleLibrary } from "./hole-library";
import { defaultProgramId } from "./planner-types";
import type { PlannerProjectMetadata } from "./planner-types";
import { buildBlankProject } from "./hole-library";
import type { SavedHoleProject } from "./storage";

export const DEMO_PROGRAM_NAME = "RC2 Institutional Demo Program";

function planRecords(baseMd: number, dip: number, az: number, steps = 6) {
  return Array.from({ length: steps }, (_, i) => ({
    md: baseMd + i * 50,
    dip: dip + i * 0.3,
    azimuth: az + i * 0.5,
  }));
}

function baseMeta(
  status: PlannerProjectMetadata["status"],
  overrides: Partial<PlannerProjectMetadata> = {}
): PlannerProjectMetadata {
  const programId = defaultProgramId(DEMO_PROGRAM_NAME);
  return {
    coordinateMode: "grid",
    northReference: "grid",
    plannedAt: "2026-06-01T08:00:00.000Z",
    createdFromPlanner: true,
    status,
    planType: "standard",
    programId,
    programName: DEMO_PROGRAM_NAME,
    planRevision: 1,
    projectCoordinateSystem: {
      mode: "grid",
      gridName: "MGA2020 Zone 55",
      epsgCode: "EPSG:7855",
      magneticDeclinationDeg: 8.2,
      notes: "Demo coordinate metadata — verify independently before field use.",
    },
    collar: { easting: 500000, northing: 7000000, elevation: 420 },
    ...overrides,
  };
}

function demoHole(
  id: string,
  name: string,
  meta: Partial<PlannerProjectMetadata>,
  extra: Partial<SavedHoleProject> = {}
): SavedHoleProject {
  const records = planRecords(0, -58, 92);
  return {
    ...buildBlankProject(name, DEMO_PROGRAM_NAME, id),
    planRecords: records,
    actualRecords: [{ md: 0, dip: -58, azimuth: 92 }],
    // Collar-relative local offsets (grid position = collar + offset).
    target: {
      e: 120,
      n: 180,
      d: 180,
      md: records[records.length - 1]!.md,
      tolerance: 6,
      maxDls: 3,
      nextInterval: 30,
    },
    plannerMeta: baseMeta(meta.status ?? "planned", meta),
    ...extra,
  };
}

export function buildInstitutionalDemoProgram(): SavedHoleProject[] {
  const programId = defaultProgramId(DEMO_PROGRAM_NAME);
  const now = "2026-06-10T10:00:00.000Z";

  const standard1 = demoHole("demo-rc2-01", "RC2-001", {
    status: "planned",
    collar: {
      easting: 500000,
      northing: 7000000,
      elevation: 420,
      latitude: -27.4698,
      longitude: 152.9721,
    },
  });

  const standard2 = demoHole("demo-rc2-02", "RC2-002", {
    status: "draft",
    collar: { easting: 500030, northing: 7000020, elevation: 419 },
  });

  const standard3 = demoHole("demo-rc2-03", "RC2-003", {
    status: "approved",
    approvedAt: "2026-06-05T12:00:00.000Z",
    approvedBy: "Demo Geologist",
    collar: { easting: 500060, northing: 7000040, elevation: 418 },
    approvalSnapshot: {
      approvedBy: "Demo Geologist",
      role: "Senior Geologist",
      approvedAt: "2026-06-05T12:00:00.000Z",
      statusAtApproval: "planned",
      planHash: "",
      qaHash: "{}",
      coordinateSystemHash: "{}",
      planRevision: 1,
      warningsAtApproval: [],
      hardErrorsAtApproval: [],
    },
  });
  standard3.plannerMeta!.approvalSnapshot!.planHash = hashPlannerPlan(standard3);

  const motherPlan = planRecords(0, -55, 88, 8);
  const motherActual = motherPlan.slice(0, 5);
  const mother: SavedHoleProject = {
    ...buildBlankProject("RC2-MOTHER", DEMO_PROGRAM_NAME, "demo-rc2-mother"),
    planRecords: motherPlan,
    actualRecords: motherActual,
    // Collar-relative local offsets (grid position = collar + offset).
    target: {
      e: 100,
      n: 200,
      d: 200,
      md: motherPlan[motherPlan.length - 1]!.md,
      tolerance: 6,
      maxDls: 3,
      nextInterval: 30,
    },
    plannerMeta: baseMeta("active", {
      activatedAt: "2026-06-08T06:00:00.000Z",
      approvedAt: "2026-06-07T09:00:00.000Z",
      approvedBy: "Demo Supervisor",
      collar: { easting: 500100, northing: 7000100, elevation: 417 },
      executionStatus: { state: "drilling" },
    }),
  };
  const locked = buildLockedPlanSnapshot(mother, { version: 1, activeHoleId: mother.holeId, holes: [mother] });
  if (locked) {
    mother.plannerMeta!.lockedPlan = locked;
    mother.plannerMeta!.approvalSnapshot = {
      approvedBy: "Demo Supervisor",
      approvedAt: "2026-06-07T09:00:00.000Z",
      statusAtApproval: "planned",
      planHash: locked.planHash,
      qaHash: locked.approvalHash ?? locked.planHash,
      coordinateSystemHash: JSON.stringify(locked.projectCoordinateSystem),
      planRevision: 1,
      warningsAtApproval: ["Demo QA watch — clearance pair within program threshold."],
      hardErrorsAtApproval: [],
    };
  }

  const daughter1: SavedHoleProject = {
    ...demoHole(
      "demo-rc2-d1",
      "RC2-MOTHER-D1",
      {
        status: "planned",
        planType: "daughter",
        collar: { easting: 500105, northing: 7000105, elevation: 417 },
      },
      {
        holeRole: "daughter",
        parentHoleId: "demo-rc2-mother",
        kickoffMd: 150,
        planRecords: planRecords(150, -52, 95, 4),
      }
    ),
  };

  const daughter2: SavedHoleProject = {
    ...demoHole(
      "demo-rc2-d2",
      "RC2-MOTHER-D2",
      {
        status: "approved",
        planType: "daughter",
        approvedAt: "2026-06-09T08:00:00.000Z",
        approvedBy: "Demo Geologist",
        collar: { easting: 500108, northing: 7000108, elevation: 417 },
      },
      {
        holeRole: "daughter",
        parentHoleId: "demo-rc2-mother",
        kickoffMd: 180,
        planRecords: planRecords(180, -50, 100, 4),
      }
    ),
  };

  void programId;
  void now;

  return [standard1, standard2, standard3, mother, daughter1, daughter2];
}

export function loadInstitutionalDemoProgram(library: HoleLibrary): HoleLibrary {
  let next = library;
  for (const hole of buildInstitutionalDemoProgram()) {
    const exists = next.holes.some((h) => h.holeId === hole.holeId);
    if (!exists) {
      next = upsertHole(next, hole);
    }
  }
  return next;
}

export function demoProgramHoleCounts() {
  const holes = buildInstitutionalDemoProgram();
  return {
    total: holes.length,
    standard: holes.filter((h) => h.plannerMeta?.planType !== "daughter").length,
    daughters: holes.filter((h) => h.plannerMeta?.planType === "daughter").length,
    active: holes.filter((h) => h.plannerMeta?.status === "active").length,
    approved: holes.filter((h) => h.plannerMeta?.status === "approved").length,
  };
}
