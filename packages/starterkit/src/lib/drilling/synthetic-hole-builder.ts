import { parseSurveyCsv, surveysToCsv } from "./csv";
import { buildStations } from "./desurvey";
import { createHoleId } from "./hole-library";
import { planTargetFromStations } from "./recommendation";
import type { SavedHoleProject } from "./storage";
import { SAMPLE_PLAN_CSV } from "@/lib/sample-data";
import type { SurveyRecord, TargetConfig } from "./types";

export type SurveyRow = { md: number; dip: number; azimuth: number };

export type DriftPattern =
  | "on-plan"
  | "gradual-lift"
  | "gradual-drop"
  | "swing-left"
  | "swing-right"
  | "increasing-drift"
  | "sudden-jump";

export type SurveyNoise = {
  dipSigmaDeg: number;
  aziSigmaDeg: number;
};

export type SyntheticHoleParams = {
  holeName: string;
  siteName?: string;
  startDip: number;
  startAzimuth: number;
  targetMd: number;
  surveyInterval: number;
  plannedLiftDropPerInterval: number;
  plannedSwingPerInterval: number;
  driftPattern: DriftPattern;
  /** Magnitude per interval for drift patterns (degrees). */
  driftMagnitudePerInterval?: number;
  /** MD where tail drift begins (for gradual patterns on a plan). */
  deviateFromMd?: number;
  /** Sudden jump at MD (sudden-jump pattern). */
  jumpAtMd?: number;
  jumpDipDeg?: number;
  jumpAziDeg?: number;
  surveyNoise?: SurveyNoise | null;
  expectedOutcomeLabel?: string;
  maxDls?: number;
  targetTolerance?: number;
};

export const DEFAULT_SYNTHETIC_PARAMS: SyntheticHoleParams = {
  holeName: "Test Lab hole",
  siteName: "Synthetic test suite",
  startDip: -60,
  startAzimuth: 125,
  targetMd: 600,
  surveyInterval: 30,
  plannedLiftDropPerInterval: 0.3,
  plannedSwingPerInterval: 0.3,
  driftPattern: "on-plan",
  driftMagnitudePerInterval: 0.35,
  deviateFromMd: 330,
  jumpAtMd: 210,
  jumpDipDeg: 5,
  jumpAziDeg: 18,
  maxDls: 3,
  targetTolerance: 6,
};

/** Legacy sample plan rows for built-in test scenarios. */
export const LEGACY_PLAN_ROWS = parseSurveyCsv(SAMPLE_PLAN_CSV);

export function rowsToCsv(rows: SurveyRow[]): string {
  return surveysToCsv(rows);
}

/** Build plan stations from collar to target MD at fixed interval. */
export function buildSyntheticPlan(params: SyntheticHoleParams): SurveyRow[] {
  const {
    startDip,
    startAzimuth,
    targetMd,
    surveyInterval,
    plannedLiftDropPerInterval,
    plannedSwingPerInterval,
  } = params;
  const rows: SurveyRow[] = [];
  const steps = Math.max(1, Math.round(targetMd / surveyInterval));
  for (let i = 0; i <= steps; i += 1) {
    const md = Math.min(i * surveyInterval, targetMd);
    rows.push({
      md,
      dip: startDip + plannedLiftDropPerInterval * i,
      azimuth: startAzimuth + plannedSwingPerInterval * i,
    });
    if (md >= targetMd - 1e-6) break;
  }
  return rows;
}

/** Actual path = collar direction plus constant per-interval drift (legacy presets). */
export function driftRows(opts: {
  toMd: number;
  interval?: number;
  startDip?: number;
  startAzimuth?: number;
  dipPerInterval?: number;
  aziPerInterval?: number;
  jump?: { atMd: number; dip?: number; azimuth?: number };
}): SurveyRow[] {
  const {
    toMd,
    interval = 30,
    startDip = -60,
    startAzimuth = 125,
    dipPerInterval = 0,
    aziPerInterval = 0,
    jump,
  } = opts;
  const rows: SurveyRow[] = [];
  for (let md = 0, i = 0; md <= toMd + 1e-6; md += interval, i += 1) {
    let dip = startDip + dipPerInterval * i;
    let azimuth = startAzimuth + aziPerInterval * i;
    if (jump && Math.abs(md - jump.atMd) < 1e-6) {
      if (jump.dip !== undefined) dip += jump.dip;
      if (jump.azimuth !== undefined) azimuth += jump.azimuth;
    }
    rows.push({ md, dip, azimuth });
  }
  return rows;
}

/** Actual path tracking plan rows exactly up to `toMd`. */
export function onPlanRows(
  planRows: SurveyRow[],
  toMd: number
): SurveyRow[] {
  return planRows
    .filter((r) => r.md <= toMd + 1e-6)
    .map((r) => ({ md: r.md, dip: r.dip, azimuth: r.azimuth }));
}

/**
 * Tracks the plan to `toMd`, then adds per-interval lift/swing drift
 * starting at `deviateFromMd`.
 */
export function tailDriftRows(opts: {
  planRows: SurveyRow[];
  toMd: number;
  deviateFromMd: number;
  interval?: number;
  dipPerInterval?: number;
  aziPerInterval?: number;
}): SurveyRow[] {
  const {
    planRows,
    toMd,
    deviateFromMd,
    interval = 30,
    dipPerInterval = 0,
    aziPerInterval = 0,
  } = opts;
  return planRows.filter((r) => r.md <= toMd + 1e-6).map((r) => {
    const past = Math.max(0, (r.md - deviateFromMd) / interval);
    return {
      md: r.md,
      dip: r.dip + dipPerInterval * past,
      azimuth: r.azimuth + aziPerInterval * past,
    };
  });
}

/** Apply drift pattern on top of a synthetic plan. */
export function buildSyntheticActual(
  plan: SurveyRow[],
  params: SyntheticHoleParams
): SurveyRow[] {
  const interval = params.surveyInterval;
  const mag = params.driftMagnitudePerInterval ?? 0.35;
  const toMd = plan[plan.length - 1]?.md ?? params.targetMd;
  const deviate = params.deviateFromMd ?? Math.floor(toMd * 0.55);

  switch (params.driftPattern) {
    case "on-plan":
      return onPlanRows(plan, toMd);
    case "gradual-lift":
      return tailDriftRows({
        planRows: plan,
        toMd,
        deviateFromMd: deviate,
        interval,
        dipPerInterval: mag,
        aziPerInterval: mag * 0.5,
      });
    case "gradual-drop":
      return tailDriftRows({
        planRows: plan,
        toMd,
        deviateFromMd: deviate,
        interval,
        dipPerInterval: -mag,
        aziPerInterval: mag * 0.5,
      });
    case "swing-left":
      return tailDriftRows({
        planRows: plan,
        toMd,
        deviateFromMd: deviate,
        interval,
        dipPerInterval: mag * 0.3,
        aziPerInterval: -mag,
      });
    case "swing-right":
      return tailDriftRows({
        planRows: plan,
        toMd,
        deviateFromMd: deviate,
        interval,
        dipPerInterval: mag * 0.3,
        aziPerInterval: mag,
      });
    case "increasing-drift":
      return plan
        .filter((r) => r.md <= toMd + 1e-6)
        .map((r, i) => ({
          md: r.md,
          dip: r.dip + (mag * i * i) / 40,
          azimuth: r.azimuth + (mag * i * i) / 25,
        }));
    case "sudden-jump": {
      const jumpMd = params.jumpAtMd ?? 210;
      const base = driftRows({
        toMd: jumpMd,
        interval,
        startDip: params.startDip,
        startAzimuth: params.startAzimuth,
        dipPerInterval: params.plannedLiftDropPerInterval * 0.1,
        aziPerInterval: params.plannedSwingPerInterval * 0.1,
      });
      const last = base[base.length - 1];
      if (!last) return onPlanRows(plan, toMd);
      return [
        ...base.slice(0, -1),
        {
          md: jumpMd,
          dip: last.dip + (params.jumpDipDeg ?? 5),
          azimuth: last.azimuth + (params.jumpAziDeg ?? 18),
        },
      ];
    }
    default:
      return onPlanRows(plan, toMd);
  }
}

export type Rng = () => number;

/** Optional survey noise; pass `rng` for deterministic tests. */
export function applySurveyNoise(
  rows: SurveyRow[],
  noise: SurveyNoise,
  rng: Rng = Math.random
): SurveyRow[] {
  return rows.map((r) => ({
    md: r.md,
    dip: r.dip + (rng() * 2 - 1) * noise.dipSigmaDeg,
    azimuth: r.azimuth + (rng() * 2 - 1) * noise.aziSigmaDeg,
  }));
}

export function targetFromPlanRecords(
  planRecords: SurveyRecord[],
  overrides?: Partial<TargetConfig>
): TargetConfig {
  const stations = buildStations(planRecords);
  const finalPlan = stations[stations.length - 1]!;
  const fromPlan = planTargetFromStations(stations, finalPlan.md)!;
  return {
    ...fromPlan,
    maxDls: 3,
    nextInterval: 30,
    ...overrides,
  };
}

export function syntheticHoleToProject(
  params: SyntheticHoleParams,
  holeId?: string
): SavedHoleProject {
  const planRows = buildSyntheticPlan(params);
  let actualRows = buildSyntheticActual(planRows, params);
  if (params.surveyNoise && params.surveyNoise.dipSigmaDeg > 0) {
    actualRows = applySurveyNoise(actualRows, params.surveyNoise);
  }
  const planRecords: SurveyRecord[] = planRows;
  const actualRecords: SurveyRecord[] = actualRows;
  const target = targetFromPlanRecords(planRecords, {
    maxDls: params.maxDls ?? 3,
    nextInterval: params.surveyInterval,
    tolerance: params.targetTolerance ?? 6,
  });
  const scenarioName = `Scenario lab · ${params.holeName}`;

  return {
    version: 1,
    holeId: holeId ?? createHoleId(),
    holeName: params.holeName,
    siteName: params.siteName ?? "Synthetic test suite",
    planRecords,
    actualRecords,
    target,
    mode: "simple",
    history: [],
    activeScenario: {
      id: "test-lab-custom",
      name: scenarioName,
    },
    updatedAt: new Date().toISOString(),
  };
}

export const DRIFT_PATTERN_LABELS: Record<DriftPattern, string> = {
  "on-plan": "On plan",
  "gradual-lift": "Gradual lift",
  "gradual-drop": "Gradual drop",
  "swing-left": "Swing left",
  "swing-right": "Swing right",
  "increasing-drift": "Increasing drift",
  "sudden-jump": "Sudden survey jump",
};
