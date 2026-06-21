import { buildStations } from "../desurvey";
import type {
  MethodFeasibility,
  RecoveryAction,
  SteeringFeasibility,
} from "../steering-types";
import type {
  Classification,
  Recommendation,
  SurveyStation,
  TargetConfig,
} from "../types";

type RecoOverrides = Partial<
  Omit<Recommendation, "current" | "target" | "classification">
> & {
  current?: Partial<SurveyStation>;
  target?: Partial<TargetConfig>;
  classification?: Partial<Classification>;
};

/**
 * Build a synthetic Recommendation for steering-rule unit tests.
 * Defaults describe a calm, on-track hole; override only the fields a test cares about.
 */
export function makeReco(overrides: RecoOverrides = {}): Recommendation {
  const base: Recommendation = {
    target: { md: 600, e: 0, n: 500, d: 433, tolerance: 6, maxDls: 3, nextInterval: 30 },
    current: { md: 100, dip: -60, azimuth: 90, e: 0, n: 0, d: 86.6, dls: 0, dogleg: 0 },
    currentPlan: null,
    remaining: 200,
    aimDip: -60,
    aimAzimuth: 90,
    dipChange: 0,
    aziChange: 0,
    dlsRequired: 1,
    maxDls: 3,
    currentVector: { e: 0, n: 0, d: 1 },
    desiredDirection: { e: 0, n: 0, d: 1 },
    doglegToTarget: 0,
    miss: 1,
    missVector: { e: 0, n: 0, d: 0 },
    tolerance: 6,
    planOffset: 0,
    straightRatio: 1,
    projection: { e: 0, n: 0, d: 0 },
    classification: { label: "On track", className: "on-track", confidence: "High" },
  };
  return {
    ...base,
    ...overrides,
    current: { ...base.current, ...(overrides.current ?? {}) },
    target: { ...base.target, ...(overrides.target ?? {}) },
    classification: { ...base.classification, ...(overrides.classification ?? {}) },
  };
}

/** Flat plan: dip -60°, azimuth 90°, straight from collar to 600 m. */
export const flatPlanStations: SurveyStation[] = buildStations([
  { md: 0, dip: -60, azimuth: 90 },
  { md: 150, dip: -60, azimuth: 90 },
  { md: 600, dip: -60, azimuth: 90 },
]);

/**
 * A current station off the flat plan by the requested dip/azimuth deltas at a given MD.
 * dipDelta/aziDelta are signed degrees relative to the plan (-60 / 90).
 */
export function currentOffPlan(
  md: number,
  dipDelta: number,
  aziDelta: number
): SurveyStation {
  return {
    md,
    dip: -60 + dipDelta,
    azimuth: 90 + aziDelta,
    e: 0,
    n: 0,
    d: 0,
    dls: 0,
    dogleg: 0,
  };
}

/** All real classification className values produced by recommendation.ts. */
export const CLASS_NAMES = [
  "on-track",
  "watch",
  "correction",
  "steer",
  "risk",
] as const;

/** Geometric action floor that applySteeringPolicy is forbidden to soften below. */
export function geometricAction(className: string): RecoveryAction {
  switch (className) {
    case "on-track":
      return "On track";
    case "watch":
      return "Watch";
    case "correction":
      return "Correct now";
    case "steer":
      return "Steering review";
    case "risk":
      return "Wedge or branch review";
    default:
      return "Steering review";
  }
}

const ALL_METHOD_IDS = [
  "natural",
  "parameter",
  "shorten_interval",
  "motor_navi",
  "devidrill",
  "wedge_branch",
] as const;

export const SMOOTH_STEERING_METHOD_IDS = [
  "natural",
  "parameter",
  "motor_navi",
  "devidrill",
] as const;

function methodRow(id: MethodFeasibility["id"]): MethodFeasibility {
  return {
    id,
    label: id,
    feasible: true,
    phrase: `${id} feasible`,
    dlsRangeLabel: "0–3°/30 m",
    confidence: "Medium",
    note: "",
  };
}

/**
 * Build a complete SteeringFeasibility for applySteeringPolicy tests, with the
 * geometric current action seeded from the recommendation classification and all
 * methods initially feasible.
 */
export function makeSteering(
  reco: Recommendation,
  currentAction: RecoveryAction = geometricAction(reco.classification.className)
): SteeringFeasibility {
  const methods = ALL_METHOD_IDS.map(methodRow);
  return {
    intervals: [],
    latestInterval: null,
    currentAction,
    bestMethodId: "natural",
    bestMethodLabel: "Natural correction",
    recoveryConfidence: "Medium",
    escalationDepthMd: null,
    escalationPhrase: "Resurvey as planned.",
    nextAimPhrase: "Hold dip and azimuth",
    requiredDlsToTarget: reco.dlsRequired,
    trendPhrase: "Stable.",
    rejoinByDepth: [],
    methods,
    pointOfNoReturnMd: null,
    assumptionsNote: "test",
    simple: {
      currentAction,
      bestMethod: "Continue as planned.",
      nextAim: "Hold dip and azimuth",
      confidence: "Medium",
      escalation: "Resurvey as planned.",
    },
  };
}
