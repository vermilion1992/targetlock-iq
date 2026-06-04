import {
  DEFAULT_CAPABILITY_ASSUMPTIONS,
  normalizeCapabilityAssumptions,
  profilesFromAssumptions,
  type CapabilityAssumptions,
} from "./capability-assumptions";
import { DEFAULT_CAPABILITY_PROFILES } from "./capability-profiles";
import { round } from "./format";
import {
  doglegDeg,
  EPS,
  shortestAngle,
  vectorFromDipAz,
} from "./geometry";
import { interpolateAtMd } from "./desurvey";
import { azimuthInstruction, dipInstruction } from "./recommendation";
import type {
  CapabilityProfile,
  IntervalBehaviour,
  MethodFeasibility,
  RecoveryAction,
  RecoveryConfidence,
  RejoinDlsOption,
  SteeringFeasibility,
  SteeringMethodId,
} from "./steering-types";
import type { PlanCorridorConfig } from "./plan-corridor";
import type { Recommendation, SurveyStation, TargetConfig } from "./types";

export const STEERING_ASSUMPTIONS_NOTE =
  "Configurable assumptions only. Feasibility depends on ground, rods, rig, tool, pump, hole size, depth, survey quality, contractor experience, and geologist/supervisor approval.";

const SMOOTH_METHOD_IDS: SteeringMethodId[] = [
  "natural",
  "parameter",
  "motor_navi",
  "devidrill",
];

function intervalToleranceDeg(intervalLength: number, maxDls: number): number {
  if (intervalLength <= EPS) return 0.5;
  return Math.max(0.35, (maxDls * intervalLength) / 30 * 0.45);
}

export function liftDropLabel(delta: number): string {
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.05) return "Hold";
  return delta < 0 ? `Drop ${Math.abs(delta).toFixed(1)}°` : `Lift ${Math.abs(delta).toFixed(1)}°`;
}

export function swingLabel(delta: number): string {
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.05) return "Hold";
  return delta < 0 ? `Swing left ${Math.abs(delta).toFixed(1)}°` : `Swing right ${Math.abs(delta).toFixed(1)}°`;
}

export function buildIntervalBehaviours(
  planStations: SurveyStation[],
  actualStations: SurveyStation[],
  maxDls: number,
  planCorridor?: PlanCorridorConfig | null
): IntervalBehaviour[] {
  if (actualStations.length < 2 || !planStations.length) return [];

  const rows: IntervalBehaviour[] = [];
  for (let i = 1; i < actualStations.length; i += 1) {
    const from = actualStations[i - 1];
    const to = actualStations[i];
    const length = to.md - from.md;
    if (length <= EPS) continue;

    const planFrom = interpolateAtMd(planStations, from.md);
    const planTo = interpolateAtMd(planStations, to.md);
    const plannedLiftDrop =
      planFrom && planTo ? planTo.dip - planFrom.dip : 0;
    const plannedSwing =
      planFrom && planTo ? shortestAngle(planFrom.azimuth, planTo.azimuth) : 0;
    const actualLiftDrop = to.dip - from.dip;
    const actualSwing = shortestAngle(from.azimuth, to.azimuth);
    const dipTol = planCorridor?.allowedDipDevDeg ?? intervalToleranceDeg(length, maxDls);
    const aziTol = planCorridor?.allowedAziDevDeg ?? intervalToleranceDeg(length, maxDls);
    const liftDropDelta = actualLiftDrop - plannedLiftDrop;
    const swingDelta = actualSwing - plannedSwing;

    rows.push({
      mdFrom: from.md,
      mdTo: to.md,
      length,
      plannedLiftDrop,
      plannedSwing,
      actualLiftDrop,
      actualSwing,
      liftDropDelta,
      swingDelta,
      outsideTolerance:
        Math.abs(liftDropDelta) > dipTol || Math.abs(swingDelta) > aziTol,
    });
  }
  return rows;
}

export function requiredDlsToRejoinPlan(
  current: SurveyStation,
  planStations: SurveyStation[],
  rejoinMd: number
): number {
  const planAt = interpolateAtMd(planStations, rejoinMd);
  if (!planAt) return Infinity;
  const currentVec = vectorFromDipAz(current.dip, current.azimuth);
  const planVec = vectorFromDipAz(planAt.dip, planAt.azimuth);
  const dogleg = doglegDeg(currentVec, planVec);
  const depth = Math.max(EPS, rejoinMd - current.md);
  return dogleg / (depth / 30);
}

function mapRecoveryAction(reco: Recommendation): RecoveryAction {
  switch (reco.classification.className) {
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
      return reco.remaining <= 0 ? "Wedge or branch review" : "Steering review";
  }
}

function confidenceFromAction(
  action: RecoveryAction,
  reco: Recommendation
): RecoveryConfidence {
  if (action === "On track") return "High";
  if (action === "Watch") return reco.classification.confidence as RecoveryConfidence;
  if (action === "Correct now") {
    return reco.dlsRequired <= reco.maxDls ? "Medium" : "Low";
  }
  return "Low";
}

function methodFeasibilityRow(
  profile: CapabilityProfile,
  requiredDls: number,
  wedgeReviewThresholdDls: number
): MethodFeasibility {
  const feasible =
    profile.id === "shorten_interval"
      ? true
      : profile.id === "wedge_branch"
        ? requiredDls > wedgeReviewThresholdDls
        : requiredDls <= profile.dlsMax + EPS;
  const phrase = feasible ? profile.feasiblePhrase : profile.reviewPhrase;
  return {
    id: profile.id,
    label: profile.label,
    feasible,
    phrase,
    dlsRangeLabel: `${profile.dlsMin}–${profile.dlsMax}°/30 m`,
    confidence: profile.confidence,
    note: profile.note,
  };
}

function pickBestMethod(
  requiredDls: number,
  action: RecoveryAction,
  profiles: CapabilityProfile[]
): { id: SteeringMethodId; label: string } {
  if (action === "On track") {
    return { id: "natural", label: "Natural correction" };
  }
  if (action === "Watch") {
    return { id: "shorten_interval", label: "Shorten survey interval" };
  }
  if (action === "Wedge or branch review") {
    return { id: "wedge_branch", label: "Wedge / branch review" };
  }

  const smooth = profiles.filter(
    (p) => p.isSteeringMethod && p.id !== "wedge_branch" && requiredDls <= p.dlsMax + EPS
  );
  if (smooth.length) {
    const best = smooth[0];
    return { id: best.id, label: best.label };
  }
  if (requiredDls > 5) {
    return { id: "devidrill", label: "DeviDrill review" };
  }
  return { id: "motor_navi", label: "Motor / Navi review" };
}

function estimatePointOfNoReturn(
  currentMd: number,
  targetMd: number,
  current: SurveyStation,
  planStations: SurveyStation[],
  profiles: CapabilityProfile[]
): number | null {
  if (targetMd <= currentMd + EPS) return null;
  const maxSmoothDls = Math.max(
    ...profiles
      .filter((p) => SMOOTH_METHOD_IDS.includes(p.id))
      .map((p) => p.dlsMax)
  );
  const step = 15;
  for (let md = currentMd + step; md <= targetMd; md += step) {
    const dls = requiredDlsToRejoinPlan(current, planStations, md);
    if (dls > maxSmoothDls + 0.25) return md - step;
  }
  return null;
}

function buildTrendPhrase(intervals: IntervalBehaviour[]): string {
  const latest = intervals[intervals.length - 1];
  if (!latest) return "Insufficient surveys for interval trend.";
  if (latest.outsideTolerance) {
    return `Latest interval (${round(latest.mdFrom, 0)}–${round(latest.mdTo, 0)} m) is outside planned lift/drop and swing tolerance.`;
  }
  return `Latest interval behaviour is within planned lift/drop and swing tolerance.`;
}

/** Rig-floor guidance under Current action — not the advanced methods table. */
export function buildActionHeroGuidance(
  action: RecoveryAction,
  reco: Recommendation,
  bestRow: MethodFeasibility | undefined
): string {
  const interval = round(reco.target.nextInterval, 0);
  const tolerance = round(reco.tolerance, 1);

  switch (action) {
    case "On track":
      return `Continue with the planned trajectory. Projected miss is inside the ${tolerance} m envelope — resurvey at ${interval} m as planned.`;
    case "Watch":
      return (
        bestRow?.phrase ??
        `Drift is developing — monitor the next survey and shorten the interval if miss worsens.`
      );
    case "Correct now":
      if (reco.dlsRequired <= reco.maxDls + EPS) {
        return `Aim over the next ${interval} m within the configured dogleg limit, then resurvey and recalculate.`;
      }
      return (
        bestRow?.phrase ??
        "Required correction exceeds the configured smooth DLS — review steering options before the next interval."
      );
    case "Steering review":
      return (
        bestRow?.phrase ??
        "Escalate for directional tooling review before drilling another full interval."
      );
    case "Wedge or branch review":
      return (
        bestRow?.phrase ??
        "Smooth in-hole recovery is unlikely — review wedge or branch options with supervisor and geology."
      );
    default:
      return bestRow?.phrase ?? "";
  }
}

function buildEscalation(
  reco: Recommendation,
  action: RecoveryAction,
  pointOfNoReturnMd: number | null
): { depthMd: number | null; phrase: string } {
  const reviewMd = reco.current.md + reco.target.nextInterval;
  if (action === "On track") {
    return {
      depthMd: null,
      phrase: `Resurvey at ${round(reco.target.nextInterval, 0)} m as planned.`,
    };
  }
  if (action === "Watch") {
    return {
      depthMd: reviewMd,
      phrase: `Review by ${round(reviewMd, 0)} m if the next survey does not improve.`,
    };
  }
  if (pointOfNoReturnMd && pointOfNoReturnMd > reco.current.md) {
    return {
      depthMd: pointOfNoReturnMd,
      phrase: `Escalate by ${round(pointOfNoReturnMd, 0)} m if trend does not improve — smooth recovery becomes unlikely beyond this depth.`,
    };
  }
  return {
    depthMd: reviewMd,
    phrase: `Review by ${round(reviewMd, 0)} m if the next survey does not improve.`,
  };
}

export function buildSteeringFeasibility(
  reco: Recommendation,
  planStations: SurveyStation[],
  actualStations: SurveyStation[],
  profiles: CapabilityProfile[] = DEFAULT_CAPABILITY_PROFILES,
  wedgeReviewThresholdDls: number = DEFAULT_CAPABILITY_ASSUMPTIONS.wedgeReviewThresholdDls,
  planCorridor?: PlanCorridorConfig | null
): SteeringFeasibility {
  const intervals = buildIntervalBehaviours(
    planStations,
    actualStations,
    reco.maxDls,
    planCorridor
  );
  const latestInterval = intervals.length ? intervals[intervals.length - 1] : null;
  const currentAction = mapRecoveryAction(reco);
  const requiredDlsToTarget = reco.dlsRequired;
  const recoveryConfidence = confidenceFromAction(currentAction, reco);

  const rejoinDepths = [30, 60, 90, reco.remaining].filter(
    (d, i, arr) => d > EPS && arr.indexOf(d) === i
  );
  const rejoinByDepth: RejoinDlsOption[] = rejoinDepths.map((interval) => {
    const depthMd = reco.current.md + interval;
    const requiredDls = requiredDlsToRejoinPlan(reco.current, planStations, depthMd);
    const label =
      Math.abs(interval - reco.remaining) < 0.5
        ? `Target (${round(depthMd, 0)} m)`
        : `${round(interval, 0)} m`;
    return {
      depthMd,
      label,
      requiredDls,
      feasible: requiredDls <= reco.maxDls + EPS,
    };
  });

  const methods = profiles.map((p) =>
    methodFeasibilityRow(p, requiredDlsToTarget, wedgeReviewThresholdDls)
  );
  const best = pickBestMethod(requiredDlsToTarget, currentAction, profiles);
  const bestMethodRow = methods.find((m) => m.id === best.id);
  const pointOfNoReturnMd = estimatePointOfNoReturn(
    reco.current.md,
    reco.target.md,
    reco.current,
    planStations,
    profiles
  );
  const { depthMd: escalationDepthMd, phrase: escalationPhrase } = buildEscalation(
    reco,
    currentAction,
    pointOfNoReturnMd
  );

  const dip = dipInstruction(reco.dipChange);
  const azi = azimuthInstruction(reco.aziChange);
  const nextAimPhrase =
    dip === "Hold dip" && azi === "Hold azimuth"
      ? "Hold dip and azimuth"
      : `${dip}, ${azi.toLowerCase()}`;

  return {
    intervals,
    latestInterval,
    currentAction,
    bestMethodId: best.id,
    bestMethodLabel: best.label,
    recoveryConfidence,
    escalationDepthMd,
    escalationPhrase,
    nextAimPhrase,
    requiredDlsToTarget,
    trendPhrase: buildTrendPhrase(intervals),
    rejoinByDepth,
    methods,
    pointOfNoReturnMd,
    assumptionsNote: STEERING_ASSUMPTIONS_NOTE,
    simple: {
      currentAction,
      bestMethod: buildActionHeroGuidance(currentAction, reco, bestMethodRow),
      nextAim: nextAimPhrase,
      confidence: recoveryConfidence,
      escalation: escalationPhrase,
    },
  };
}

export function computeSteeringFeasibility(
  recommendation: Recommendation | null,
  planStations: SurveyStation[],
  actualStations: SurveyStation[],
  assumptions?: Partial<CapabilityAssumptions> | null,
  planCorridor?: PlanCorridorConfig | null
): SteeringFeasibility | null {
  if (!recommendation) return null;
  const normalized = normalizeCapabilityAssumptions(assumptions);
  const profiles = profilesFromAssumptions(normalized);
  return buildSteeringFeasibility(
    recommendation,
    planStations,
    actualStations,
    profiles,
    normalized.wedgeReviewThresholdDls,
    planCorridor
  );
}
