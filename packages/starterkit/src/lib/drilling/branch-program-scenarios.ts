import { parseSurveyCsv } from "./csv";
import {
  kickoffStationFromMother,
  offsetTargetFromKickoff,
  requiredDaughterHeading,
} from "./branch-program";
import type {
  BranchProgram,
  BranchProgramScenario,
  BranchTarget,
  DaughterHole,
} from "./branch-program-types";
import {
  LEGACY_PLAN_ROWS,
  onPlanRows,
  rowsToCsv,
  tailDriftRows,
  type SurveyRow,
} from "./synthetic-hole-builder";
import { SAMPLE_PLAN_CSV } from "@/lib/sample-data";
import type { SurveyRecord } from "./types";

const MOTHER_PLAN = parseSurveyCsv(SAMPLE_PLAN_CSV);
const INTERVAL = 30;

function demoDaughter(
  partial: Omit<DaughterHole, "daughterHoleId"> & { daughterHoleId?: string }
): DaughterHole {
  const slug = partial.daughterId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    ...partial,
    daughterHoleId: partial.daughterHoleId ?? `demo-${slug}`,
  };
}

function buildDaughterLeg(opts: {
  daughterId: string;
  kickoffMd: number;
  motherActual: SurveyRecord[];
  target: BranchTarget;
  legLengthM?: number;
  dipBiasPerInterval?: number;
  aziBiasPerInterval?: number;
}): SurveyRecord[] {
  const {
    kickoffMd,
    motherActual,
    target,
    legLengthM = 180,
    dipBiasPerInterval = 0,
    aziBiasPerInterval = 0,
  } = opts;
  const kickoff = kickoffStationFromMother(motherActual, kickoffMd);
  if (!kickoff) return [];
  const heading = requiredDaughterHeading(kickoff, target);
  const rows: SurveyRow[] = [];
  const steps = Math.ceil(legLengthM / INTERVAL);
  for (let i = 0; i <= steps; i += 1) {
    const md = kickoffMd + i * INTERVAL;
    const t = steps > 0 ? i / steps : 1;
    rows.push({
      md,
      dip: kickoff.dip + (heading.dip - kickoff.dip) * t + dipBiasPerInterval * i,
      azimuth:
        kickoff.azimuth +
        (((heading.azimuth - kickoff.azimuth + 540) % 360) - 180) * t +
        aziBiasPerInterval * i,
    });
  }
  return rows;
}

function motherActualOnPlan(toMd: number): SurveyRecord[] {
  return onPlanRows(LEGACY_PLAN_ROWS, toMd) as SurveyRecord[];
}

function motherActualDrift(toMd: number, dipPer = 0.12, aziPer = 0.35): SurveyRecord[] {
  return tailDriftRows({
    planRows: LEGACY_PLAN_ROWS,
    toMd,
    deviateFromMd: 120,
    interval: INTERVAL,
    dipPerInterval: dipPer,
    aziPerInterval: aziPer,
  }) as SurveyRecord[];
}

function motherActualMiss(toMd: number): SurveyRecord[] {
  return tailDriftRows({
    planRows: LEGACY_PLAN_ROWS,
    toMd,
    deviateFromMd: 180,
    interval: INTERVAL,
    dipPerInterval: 0.45,
    aziPerInterval: 0.55,
  }) as SurveyRecord[];
}

function targetFromKickoffBias(
  kickoffMd: number,
  motherActual: SurveyRecord[],
  distanceM: number,
  dipOffset: number,
  aziOffset: number,
  id: string,
  label: string,
  purpose?: BranchTarget["purpose"]
): BranchTarget {
  const kickoff = kickoffStationFromMother(motherActual, kickoffMd)!;
  const pos = offsetTargetFromKickoff(kickoff, distanceM, dipOffset, aziOffset);
  return {
    id,
    label,
    e: pos.e,
    n: pos.n,
    d: pos.d,
    type: "point",
    priority: 1,
    toleranceM: 8,
    purpose,
  };
}

function scenarioBase(
  partial: Omit<BranchProgramScenario, "kind" | "mother"> & {
    motherActual: SurveyRecord[];
    motherToMd?: number;
  }
): BranchProgramScenario {
  const toMd = partial.motherToMd ?? 600;
  const { motherActual, motherToMd: _md, ...rest } = partial;
  return {
    kind: "branch-program",
    mother: {
      holeId: "DDH-0247",
      planRecords: MOTHER_PLAN.filter((r) => r.md <= toMd),
      actualRecords: motherActual.filter((r) => r.md <= toMd),
    },
    ...rest,
  };
}

export const BRANCH_PROGRAM_SCENARIOS: BranchProgramScenario[] = [
  (() => {
    const motherActual = motherActualOnPlan(600);
    const kickoffMd = 450;
    const tEasy = targetFromKickoffBias(kickoffMd, motherActual, 120, -4, 8, "tgt-a", "Target A — easy");
    const tMarginal = targetFromKickoffBias(kickoffMd, motherActual, 140, 12, -22, "tgt-b", "Target B — marginal");
    tEasy.assignedDaughterId = "DDH-0247A";
    tMarginal.assignedDaughterId = "DDH-0247B";
    const daughters: DaughterHole[] = [
      demoDaughter({
        daughterId: "DDH-0247A",
        parentHoleId: "DDH-0247",
        kickoffMd,
        method: "natural",
        planRecords: buildDaughterLeg({
          daughterId: "DDH-0247A",
          kickoffMd,
          motherActual,
          target: tEasy,
          dipBiasPerInterval: -0.15,
          aziBiasPerInterval: 0.2,
        }),
        status: "planned",
        targetId: tEasy.id,
      }),
      demoDaughter({
        daughterId: "DDH-0247B",
        parentHoleId: "DDH-0247",
        kickoffMd,
        method: "devidrill-dcd",
        planRecords: buildDaughterLeg({
          daughterId: "DDH-0247B",
          kickoffMd,
          motherActual,
          target: tMarginal,
          dipBiasPerInterval: 0.55,
          aziBiasPerInterval: -0.45,
        }),
        status: "planned",
        targetId: tMarginal.id,
      }),
    ];
    return scenarioBase({
      motherActual,
      id: "branch-mother-two-daughters",
      name: "TEST · Mother + 2 daughters",
      site: "Branch program demo",
      description: "One mother hole with two daughter branches — one easy target, one marginal DLS.",
      expectedInsight: "Easy branch needs low DLS; marginal branch escalates to DeviDrill/wedge review.",
      inspect: "Branch program tab, branch table, kickoff comparison cards",
      daughters,
      targets: [tEasy, tMarginal],
      kickoffWindow: { mdMin: 390, mdMax: 510, stepM: 30 },
    });
  })(),

  (() => {
    const motherActual = motherActualDrift(600);
    const kickoffMd = 480;
    const target = targetFromKickoffBias(kickoffMd, motherActual, 130, 6, -14, "tgt-main", "Orebody pierce");
    target.assignedDaughterId = "DDH-0247A";
    return scenarioBase({
      motherActual,
      id: "branch-bad-kickoff",
      name: "TEST · Bad kickoff selection",
      site: "Branch program demo",
      description: "Same target — shallow vs deep kickoff ranks differently on required DLS.",
      expectedInsight: "Ranking shows why a deeper or shallower branch window matters.",
      inspect: "Branch program tab, kickoff comparison (Conservative / Shortest / Best alignment)",
      daughters: [
        demoDaughter({
          daughterId: "DDH-0247A",
          parentHoleId: "DDH-0247",
          kickoffMd,
          method: "motor-navi",
          planRecords: buildDaughterLeg({
            daughterId: "DDH-0247A",
            kickoffMd,
            motherActual,
            target,
          }),
          status: "planned",
          targetId: target.id,
        }),
      ],
      targets: [target],
      kickoffWindow: { mdMin: 360, mdMax: 540, stepM: 30 },
    });
  })(),

  (() => {
    const motherActual = motherActualOnPlan(600);
    const kickoffMd = 420;
    const target = targetFromKickoffBias(kickoffMd, motherActual, 100, 2, 3, "tgt-close", "Close target");
    target.assignedDaughterId = "DDH-0247A";
    return scenarioBase({
      motherActual,
      id: "branch-daughter-convergence",
      name: "TEST · Daughter toward mother",
      site: "Branch program demo",
      description: "Daughter path bends back toward mother — separation warning expected.",
      expectedInsight: "Minimum centre-to-centre distance drops below caution threshold.",
      inspect: "Branch program tab, separation column, program map",
      daughters: [
        demoDaughter({
          daughterId: "DDH-0247A",
          parentHoleId: "DDH-0247",
          kickoffMd,
          method: "wedge",
          planRecords: buildDaughterLeg({
            daughterId: "DDH-0247A",
            kickoffMd,
            motherActual,
            target,
            dipBiasPerInterval: 0.9,
            aziBiasPerInterval: -1.2,
            legLengthM: 150,
          }),
          status: "planned",
          targetId: target.id,
        }),
      ],
      targets: [target],
      kickoffWindow: { mdMin: 390, mdMax: 480, stepM: 30 },
    });
  })(),

  (() => {
    const motherActual = motherActualMiss(600);
    const kickoffMd = 510;
    const target = targetFromKickoffBias(kickoffMd, motherActual, 110, -8, 16, "tgt-recovery", "Wedge recovery target");
    target.purpose = "wedge-recovery";
    target.assignedDaughterId = "DDH-0247A";
    return scenarioBase({
      motherActual,
      id: "branch-wedge-recovery",
      name: "TEST · Wedge recovery",
      site: "Branch program demo",
      description: "Mother misses plan; daughter planned as recovery branch.",
      expectedInsight: "Recovery branch from actual mother survey at depth — not replanned mother.",
      inspect: "Branch program tab, mother actual vs plan in Trajectory tab",
      daughters: [
        demoDaughter({
          daughterId: "DDH-0247A",
          parentHoleId: "DDH-0247",
          kickoffMd,
          method: "wedge",
          planRecords: buildDaughterLeg({
            daughterId: "DDH-0247A",
            kickoffMd,
            motherActual,
            target,
            dipBiasPerInterval: -0.25,
            aziBiasPerInterval: 0.35,
          }),
          status: "approved",
          targetId: target.id,
        }),
      ],
      targets: [target],
      kickoffWindow: { mdMin: 450, mdMax: 570, stepM: 30 },
    });
  })(),

  (() => {
    const motherActual = motherActualOnPlan(600);
    const kickoffMd = 480;
    const targets: BranchTarget[] = [
      targetFromKickoffBias(kickoffMd, motherActual, 95, -6, 5, "tgt-1", "Pierce 1"),
      targetFromKickoffBias(kickoffMd, motherActual, 110, 0, -12, "tgt-2", "Pierce 2"),
      targetFromKickoffBias(kickoffMd, motherActual, 125, 8, 18, "tgt-3", "Pierce 3"),
    ];
    targets.forEach((t, i) => {
      t.assignedDaughterId = `DDH-0247${String.fromCharCode(65 + i)}`;
      t.purpose = "resource-definition";
      t.priority = i + 1;
    });
    const daughters: DaughterHole[] = targets.map((t, i) =>
      demoDaughter({
        daughterId: `DDH-0247${String.fromCharCode(65 + i)}`,
        parentHoleId: "DDH-0247",
        kickoffMd,
        method: i === 0 ? "natural" : i === 1 ? "motor-navi" : "devidrill-dcd",
        planRecords: buildDaughterLeg({
          daughterId: t.assignedDaughterId!,
          kickoffMd,
          motherActual,
          target: t,
          dipBiasPerInterval: i * 0.2,
          aziBiasPerInterval: (i - 1) * 0.35,
        }),
        status: "planned",
        targetId: t.id,
      })
    );
    return scenarioBase({
      motherActual,
      id: "branch-multi-target-rd",
      name: "TEST · Multi-target RD",
      site: "Branch program demo",
      description: "One mother, three daughters, three orebody pierce points.",
      expectedInsight: "Program map shows multiple branches and assigned targets.",
      inspect: "Branch program tab, program map, branch table",
      daughters,
      targets,
      kickoffWindow: { mdMin: 420, mdMax: 540, stepM: 30 },
    });
  })(),
];

/** Phase 2 — editable-ready presets (import as persisted library program). */
export const BRANCH_PROGRAM_P2_SCENARIOS: BranchProgramScenario[] = [
  (() => {
    const motherActual = motherActualOnPlan(600);
    const kickoffMd = 465;
    const target = targetFromKickoffBias(
      kickoffMd,
      motherActual,
      100,
      -2,
      6,
      "tgt-p2-a",
      "P2 approved pierce"
    );
    return scenarioBase({
      motherActual,
      id: "branch-p2-approved-daughter",
      name: "TEST · P2 approved daughter",
      site: "Branch program Phase 2",
      description: "Mother with one approved daughter branch for approval snapshot demos.",
      expectedInsight: "Approval panel shows validated state; export PDF includes sign-off.",
      inspect: "Branch program tab, approvals, PDF export",
      daughters: [
        demoDaughter({
          daughterId: "DDH-0247A",
          daughterHoleId: "ddh-0247a",
          parentHoleId: "DDH-0247",
          kickoffMd,
          method: "motor-navi",
          planRecords: buildDaughterLeg({
            daughterId: "DDH-0247A",
            kickoffMd,
            motherActual,
            target,
          }),
          status: "approved",
          targetId: target.id,
        }),
      ],
      targets: [target],
      kickoffWindow: { mdMin: 420, mdMax: 540, stepM: 30 },
    });
  })(),

  (() => {
    const motherActual = motherActualDrift(600, 0.1, 0.2);
    const kickoffMd = 480;
    const target = targetFromKickoffBias(
      kickoffMd,
      motherActual,
      130,
      5,
      -10,
      "tgt-p2-ko",
      "P2 kickoff compare"
    );
    return scenarioBase({
      motherActual,
      id: "branch-p2-kickoff-compare",
      name: "TEST · P2 kickoff comparison",
      site: "Branch program Phase 2",
      description: "Wide kickoff window for ranked comparison table and top-3 cards.",
      expectedInsight: "Kickoff planner ranks MD steps with mother and sibling separation.",
      inspect: "Kickoff planner, ranked table",
      daughters: [],
      targets: [target],
      kickoffWindow: { mdMin: 400, mdMax: 560, stepM: 10 },
    });
  })(),

  (() => {
    const motherActual = motherActualOnPlan(600);
    const kickoffMd = 500;
    const target = targetFromKickoffBias(
      kickoffMd,
      motherActual,
      45,
      -1,
      2,
      "tgt-p2-near",
      "P2 near-mother pierce"
    );
    return scenarioBase({
      motherActual,
      id: "branch-p2-near-mother",
      name: "TEST · P2 near mother",
      site: "Branch program Phase 2",
      description: "Daughter plan converges toward mother — separation warning.",
      expectedInsight: "Separation caution in branch table and simple strip.",
      inspect: "Branch table separation column, simple strip",
      daughters: [
        demoDaughter({
          daughterId: "DDH-0247N",
          parentHoleId: "DDH-0247",
          kickoffMd,
          method: "wedge",
          planRecords: buildDaughterLeg({
            daughterId: "DDH-0247N",
            kickoffMd,
            motherActual,
            target,
            dipBiasPerInterval: 0.4,
            aziBiasPerInterval: -0.5,
          }),
          status: "draft",
          targetId: target.id,
        }),
      ],
      targets: [target],
      kickoffWindow: { mdMin: 460, mdMax: 540, stepM: 30 },
    });
  })(),

  (() => {
    const motherActual = motherActualOnPlan(600);
    const kickoffMd = 480;
    const targets: BranchTarget[] = [
      targetFromKickoffBias(kickoffMd, motherActual, 90, -5, 4, "tgt-p2-1", "P2 pierce 1"),
      targetFromKickoffBias(kickoffMd, motherActual, 105, 0, -8, "tgt-p2-2", "P2 pierce 2"),
      targetFromKickoffBias(kickoffMd, motherActual, 120, 6, 14, "tgt-p2-3", "P2 pierce 3"),
    ];
    targets.forEach((t, i) => {
      t.purpose = i === 2 ? "geotechnical" : "resource-definition";
      t.priority = i + 1;
    });
    return scenarioBase({
      motherActual,
      id: "branch-p2-three-target",
      name: "TEST · P2 three-target program",
      site: "Branch program Phase 2",
      description: "Three point targets for target library and kickoff planner.",
      expectedInsight: "Target editor and kickoff ranking per target.",
      inspect: "Target library, kickoff planner target select",
      daughters: [],
      targets,
      kickoffWindow: { mdMin: 420, mdMax: 540, stepM: 30 },
    });
  })(),

  (() => {
    const motherActual = motherActualMiss(600);
    const kickoffMd = 510;
    const target = targetFromKickoffBias(
      kickoffMd,
      motherActual,
      110,
      8,
      -15,
      "tgt-p2-rec",
      "P2 recovery pierce"
    );
    return scenarioBase({
      motherActual,
      id: "branch-p2-abandoned-recovery",
      name: "TEST · P2 abandoned + recovery",
      site: "Branch program Phase 2",
      description: "Abandoned daughter plus draft recovery branch.",
      expectedInsight: "Daughter list shows abandoned and draft statuses.",
      inspect: "Daughter list, archive flow",
      daughters: [
        demoDaughter({
          daughterId: "DDH-0247X",
          parentHoleId: "DDH-0247",
          kickoffMd: 470,
          method: "wedge",
          planRecords: buildDaughterLeg({
            daughterId: "DDH-0247X",
            kickoffMd: 470,
            motherActual,
            target,
            legLengthM: 120,
          }),
          status: "abandoned",
          targetId: target.id,
        }),
        demoDaughter({
          daughterId: "DDH-0247R",
          parentHoleId: "DDH-0247",
          kickoffMd,
          method: "motor-navi",
          planRecords: buildDaughterLeg({
            daughterId: "DDH-0247R",
            kickoffMd,
            motherActual,
            target,
          }),
          status: "draft",
          targetId: target.id,
        }),
      ],
      targets: [target],
      kickoffWindow: { mdMin: 450, mdMax: 570, stepM: 30 },
    });
  })(),
];

export const ALL_BRANCH_PROGRAM_SCENARIOS: BranchProgramScenario[] = [
  ...BRANCH_PROGRAM_SCENARIOS,
  ...BRANCH_PROGRAM_P2_SCENARIOS,
];

export function findBranchScenario(id: string): BranchProgramScenario | undefined {
  return ALL_BRANCH_PROGRAM_SCENARIOS.find((s) => s.id === id);
}

export function branchScenarioToMotherProject(
  scenario: BranchProgram
): {
  holeName: string;
  siteName: string;
  planRecords: SurveyRecord[];
  actualRecords: SurveyRecord[];
} {
  return {
    holeName: scenario.mother.holeId,
    siteName: scenario.site,
    planRecords: scenario.mother.planRecords,
    actualRecords: scenario.mother.actualRecords,
  };
}

/** CSV export helper for debugging — not used in UI. */
export function daughterPlanCsv(daughter: DaughterHole): string {
  return rowsToCsv(daughter.planRecords);
}
