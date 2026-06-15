import { parseSurveyCsv } from "./csv";
import { buildStations } from "./desurvey";
import { planTargetFromStations } from "./recommendation";
import { createHoleId } from "./hole-library";
import type { SavedHoleProject } from "./storage";
import { SAMPLE_PLAN_CSV } from "@/lib/sample-data";
import type { TargetConfig } from "./types";
import {
  convertSurveyRecordsReference,
  normalizeReferenceSystem,
  type ReferenceSystemConfig,
} from "./reference-system";
import {
  driftRows,
  LEGACY_PLAN_ROWS,
  onPlanRows,
  rowsToCsv,
  tailDriftRows,
} from "./synthetic-hole-builder";

/**
 * Built-in synthetic drilling scenarios so the app can be demonstrated and
 * tested without confidential client data. Each "hole" scenario shares a
 * single realistic plan (to 600 m); only the actual survey path varies, which
 * drives the classification, steering feasibility, and QA/QC behaviour.
 *
 * Expected outcomes are asserted in test-scenarios.test.ts — keep the data and
 * the docs (docs/targetlock-pitch/test-scenarios.md) in sync.
 */

export type ScenarioTag = { id: string; name: string };

export type TestScenarioKind = "hole" | "invalid-import";

export type TestScenario = {
  id: string;
  name: string;
  site: string;
  description: string;
  /** Expected overall status label from calculateRecommendation. */
  expectedStatus: string;
  /** What the operator should see / do. */
  expectedAction: string;
  /** Which panels to inspect to verify the scenario. */
  inspect: string;
  kind: TestScenarioKind;
  planCsv: string;
  actualCsv: string;
  /** Target overrides applied on top of the plan-derived target. */
  target?: Partial<TargetConfig>;
  /** Deliberately malformed CSV for the invalid-import demo. */
  invalidCsv?: string;
  /** RC2 reference-system config (defaults to grid/grid/grid when omitted). */
  referenceSystem?: ReferenceSystemConfig;
};

const PLAN = SAMPLE_PLAN_CSV;

const REFERENCE_SYSTEM_GRID_ROTATION_DEG = 10;

/** Plan in grid north; actual stored in true north (+10° azimuth). */
function referenceSystemScenarioCsvs(): { planCsv: string; actualCsv: string } {
  const actualRows = onPlanRows(LEGACY_PLAN_ROWS, 540).map((row) => ({
    ...row,
    azimuth: row.azimuth + REFERENCE_SYSTEM_GRID_ROTATION_DEG,
  }));
  return {
    planCsv: PLAN,
    actualCsv: rowsToCsv(actualRows),
  };
}

const REFERENCE_SYSTEM_CSVS = referenceSystemScenarioCsvs();

const NEAR_VERTICAL_PLAN_CSV = rowsToCsv(
  driftRows({
    toMd: 300,
    startDip: -88,
    dipPerInterval: 0.1,
    aziPerInterval: 0.2,
  })
);

const NEAR_VERTICAL_ACTUAL_CSV = rowsToCsv(
  driftRows({
    toMd: 270,
    startDip: -88,
    dipPerInterval: 0.15,
    aziPerInterval: 0.65,
  })
);

export const TEST_SCENARIOS: TestScenario[] = [
  {
    id: "on-plan",
    name: "TEST · On plan",
    site: "Synthetic test suite",
    description:
      "Actual survey follows the planned trajectory closely to 540 m. Proves the app does not over-warn when the hole is healthy.",
    expectedStatus: "On track",
    expectedAction: "Continue drilling; resurvey at the planned interval.",
    inspect: "Action plan (green / continue), KPIs (projected miss inside tolerance), QA/QC (all OK).",
    kind: "hole",
    planCsv: PLAN,
    actualCsv: rowsToCsv(onPlanRows(LEGACY_PLAN_ROWS, 540)),
  },
  {
    id: "gradual-drift",
    name: "TEST · Gradual drift",
    site: "Synthetic test suite",
    description:
      "Hole tracks plan to 330 m then gradually lifts and swings right. Shows early-warning behaviour before a correction is strictly required.",
    expectedStatus: "Watch",
    expectedAction: "Monitor closely and shorten the next survey interval if drift continues.",
    inspect: "Action plan (watch), KPIs (miss just outside tolerance), Steering feasibility (Watch).",
    kind: "hole",
    actualCsv: rowsToCsv(
      tailDriftRows({
        planRows: LEGACY_PLAN_ROWS,
        toMd: 450,
        deviateFromMd: 330,
        dipPerInterval: 0.35,
        aziPerInterval: 0.7,
      })
    ),
    planCsv: PLAN,
  },
  {
    id: "recoverable",
    name: "TEST · Recoverable correction",
    site: "Synthetic test suite",
    description:
      "Hole is off plan at 300 m but the required dogleg is still inside the configured limit. Parameter / natural correction should be sufficient.",
    expectedStatus: "Correction needed",
    expectedAction: "Correct now within the configured DLS limit.",
    inspect: "Action plan (correct now), Steering feasibility (Correct now; method within limits), Correction options.",
    kind: "hole",
    actualCsv: rowsToCsv(
      driftRows({ toMd: 300, dipPerInterval: 0.7, aziPerInterval: 1.7 })
    ),
    planCsv: PLAN,
  },
  {
    id: "steering-review",
    name: "TEST · Motor / Navi review",
    site: "Synthetic test suite",
    description:
      "Hole has drifted beyond smooth correction at the configured limit but is still recoverable with higher-DLS directional tooling.",
    expectedStatus: "Steering recommended",
    expectedAction: "Escalate for steering review (motor / Navi assumptions).",
    inspect: "Steering feasibility (Steering review; motor/Navi feasible), Math reference (required DLS).",
    kind: "hole",
    actualCsv: rowsToCsv(
      driftRows({ toMd: 330, dipPerInterval: 1.0, aziPerInterval: 2.6 })
    ),
    planCsv: PLAN,
  },
  {
    id: "wedge-branch",
    name: "TEST · Wedge / branch review",
    site: "Synthetic test suite",
    description:
      "Hole is beyond smooth recovery — the required dogleg exceeds even high-DLS steering. The app should recommend a wedge / branch review.",
    expectedStatus: "Target at risk",
    expectedAction: "Wedge or branch review recommended (review decision, not a guarantee).",
    inspect: "Steering feasibility (Wedge / branch review), Action plan (escalate), QA/QC (Recover / Target risk).",
    kind: "hole",
    actualCsv: rowsToCsv(
      driftRows({ toMd: 360, dipPerInterval: 1.5, aziPerInterval: 3.6 })
    ),
    planCsv: PLAN,
  },
  {
    id: "qa-jump",
    name: "TEST · QA survey jump",
    site: "Synthetic test suite",
    description:
      "A near-on-plan hole with one suspicious survey at 210 m (sudden dip and azimuth jump). Exercises survey QA/QC dogleg and trend flags.",
    expectedStatus: "any",
    expectedAction: "Investigate the suspicious survey before trusting the correction.",
    inspect: "QA/QC (DLS risk + trend watch on the last interval), Trajectory (kinked path).",
    kind: "hole",
    actualCsv: rowsToCsv(
      driftRows({
        toMd: 210,
        dipPerInterval: 0.1,
        aziPerInterval: 0.2,
        jump: { atMd: 210, dip: 5, azimuth: 18 },
      })
    ),
    planCsv: PLAN,
  },
  {
    id: "reference-system",
    name: "TEST · Reference system",
    site: "Synthetic test suite",
    description:
      "Plan azimuths are grid north (~125°); survey azimuths are stored in true north (~135°). Proves mixed-reference conversion before desurvey keeps geometry aligned.",
    expectedStatus: "On track",
    expectedAction: "Continue drilling; confirm grid rotation and declination match site procedures.",
    inspect:
      "Setup → Reference system panel (mixed-ref warning), Validation tab, exported PDF RC2 section.",
    kind: "hole",
    planCsv: REFERENCE_SYSTEM_CSVS.planCsv,
    actualCsv: REFERENCE_SYSTEM_CSVS.actualCsv,
    referenceSystem: {
      planReference: "grid",
      surveyReference: "true",
      outputReference: "grid",
      gridRotationDeg: REFERENCE_SYSTEM_GRID_ROTATION_DEG,
      magneticDeclinationDeg: 12,
    },
  },
  {
    id: "near-vertical",
    name: "TEST · Near-vertical",
    site: "Synthetic test suite",
    description:
      "Steep hole (|dip| ≥ 85°) planned to 300 m with azimuth drift on actual to 270 m. Proves near-vertical advisory and confidence downgrade without toolface math.",
    expectedStatus: "Watch, Correction needed, or On track",
    expectedAction:
      "Review near-vertical advisory; confirm survey quality before relying on standard correction guidance.",
    inspect:
      "Action plan advisory banner, confidence mini-tag, Setup → Reference system (defaults), exported PDF RC2 section.",
    kind: "hole",
    planCsv: NEAR_VERTICAL_PLAN_CSV,
    actualCsv: NEAR_VERTICAL_ACTUAL_CSV,
  },
  {
    id: "invalid-import",
    name: "TEST · Invalid CSV import",
    site: "Synthetic test suite",
    description:
      "A malformed CSV (wrong headers, no MD/dip/azimuth). Demonstrates the import validation and error messaging instead of loading a hole.",
    expectedStatus: "Import rejected",
    expectedAction: "Clear error message; no hole loaded.",
    inspect: "Hole data panel status line shows a parse error.",
    kind: "invalid-import",
    planCsv: PLAN,
    actualCsv: "",
    invalidCsv: "depth;inclination;bearing\n0;-60;125\n30;-59;126",
  },
];

export function findScenario(id: string): TestScenario | undefined {
  return TEST_SCENARIOS.find((s) => s.id === id);
}

export function scenarioTarget(scenario: TestScenario): TargetConfig {
  const planRecords = parseSurveyCsv(scenario.planCsv);
  const ref = normalizeReferenceSystem(scenario.referenceSystem);
  const planTrue = convertSurveyRecordsReference(planRecords, ref.planReference, ref);
  const stations = buildStations(planTrue);
  const finalPlan = stations[stations.length - 1]!;
  const fromPlan = planTargetFromStations(stations, finalPlan.md)!;
  return {
    ...fromPlan,
    maxDls: 3,
    nextInterval: 30,
    ...scenario.target,
  };
}

/** Build a hole project from a synthetic test scenario (hole scenarios only). */
export function buildProjectFromScenario(
  scenario: TestScenario,
  holeId?: string
): SavedHoleProject | null {
  if (scenario.kind !== "hole") return null;
  const planRecords = parseSurveyCsv(scenario.planCsv);
  const actualRecords = parseSurveyCsv(scenario.actualCsv);
  const id = holeId ?? createHoleId();
  return {
    version: 1,
    holeId: id,
    holeName: scenario.name,
    siteName: scenario.site,
    planRecords,
    actualRecords,
    target: scenarioTarget(scenario),
    mode: "simple",
    history: [],
    activeScenario: { id: scenario.id, name: scenario.name },
    updatedAt: new Date().toISOString(),
  };
}

/** Hole scenarios only — for the load-test-scenario picker. */
export function holeTestScenarios(): TestScenario[] {
  return TEST_SCENARIOS.filter((s) => s.kind === "hole");
}
