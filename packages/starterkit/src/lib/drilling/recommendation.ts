import { absDeg, round, sentenceStart } from "./format";
import {
  add,
  distance,
  dipAzFromVector,
  doglegDeg,
  EPS,
  normalizeVector,
  scale,
  shortestAngle,
  slerpDirection,
  subtract,
  vectorFromDipAz,
  vectorLength,
} from "./geometry";
import { positionOnPlanAtMd } from "./desurvey";
import type {
  Classification,
  CorrectionOption,
  Recommendation,
  SurveyStation,
  TargetConfig,
} from "./types";

export function dipInstruction(delta: number): string {
  if (!Number.isFinite(delta)) return "--";
  if (Math.abs(delta) < 0.05) return "Hold dip";
  return delta < 0 ? `Drop ${absDeg(delta, 1)}` : `Lift ${absDeg(delta, 1)}`;
}

export function azimuthInstruction(delta: number): string {
  if (!Number.isFinite(delta)) return "--";
  if (Math.abs(delta) < 0.05) return "Hold azimuth";
  return delta < 0 ? `Swing left ${absDeg(delta, 1)}` : `Swing right ${absDeg(delta, 1)}`;
}

function classify(reco: Omit<Recommendation, "classification">): Classification {
  if (reco.remaining <= 0) {
    return { label: "Target depth passed", className: "risk", confidence: "Review" };
  }
  if (reco.miss <= reco.tolerance) {
    return { label: "On track", className: "on-track", confidence: "High" };
  }
  if (reco.miss <= reco.tolerance * 1.5 && reco.dlsRequired <= reco.maxDls) {
    return { label: "Watch", className: "watch", confidence: "High" };
  }
  if (reco.dlsRequired <= reco.maxDls && reco.straightRatio <= 1.08) {
    return { label: "Correction needed", className: "correction", confidence: "Medium" };
  }
  if (reco.dlsRequired <= reco.maxDls * 1.75) {
    return { label: "Steering recommended", className: "steer", confidence: "Medium" };
  }
  return { label: "Target at risk", className: "risk", confidence: "Low" };
}

export function calculateRecommendation(
  planStations: SurveyStation[],
  actualStations: SurveyStation[],
  target: TargetConfig
): Recommendation | null {
  if (!planStations.length || !actualStations.length) return null;

  const current = actualStations[actualStations.length - 1];
  const currentPlan = positionOnPlanAtMd(planStations, current.md);
  const remaining = target.md - current.md;
  const currentPosition = { e: current.e, n: current.n, d: current.d };
  const targetPosition = { e: target.e, n: target.n, d: target.d };
  const currentVector = vectorFromDipAz(current.dip, current.azimuth);
  const deltaToTarget = subtract(targetPosition, currentPosition);
  const straightDistance = vectorLength(deltaToTarget);
  const desiredDirection = normalizeVector(deltaToTarget, currentVector);
  const doglegToTarget = doglegDeg(currentVector, desiredDirection);
  const dlsRequired = remaining > EPS ? doglegToTarget / (remaining / 30) : Infinity;
  const maxTurn = target.maxDls * (target.nextInterval / 30);
  const aimDirection =
    doglegToTarget > maxTurn
      ? slerpDirection(currentVector, desiredDirection, maxTurn / doglegToTarget)
      : desiredDirection;
  const aim = dipAzFromVector(aimDirection);
  const projection = add(
    currentPosition,
    scale(currentVector, Math.max(0, remaining))
  );
  const missVector = subtract(projection, targetPosition);
  const miss = vectorLength(missVector);
  const planOffset = currentPlan ? distance(current, currentPlan) : 0;

  const base = {
    target,
    current,
    currentPlan,
    remaining,
    aimDip: aim.dip,
    aimAzimuth: aim.azimuth,
    dipChange: aim.dip - current.dip,
    aziChange: shortestAngle(current.azimuth, aim.azimuth),
    dlsRequired,
    maxDls: target.maxDls,
    currentVector,
    desiredDirection,
    doglegToTarget,
    miss,
    missVector,
    tolerance: target.tolerance,
    planOffset,
    straightRatio: remaining > EPS ? straightDistance / remaining : Infinity,
    projection,
  };

  return { ...base, classification: classify(base) };
}

export function actionSentence(reco: Recommendation): string {
  const status = reco.classification.label;
  const dipMove = sentenceStart(dipInstruction(reco.dipChange).toLowerCase());
  const aziMove = azimuthInstruction(reco.aziChange).toLowerCase();

  if (status === "On track") {
    return `Projection is inside the ${round(reco.tolerance, 1)} m target envelope. Continue per plan and resurvey at the planned interval.`;
  }
  if (status === "Watch") {
    return `Monitor closely. For discussion: aim near ${round(reco.aimDip, 1)}° dip and ${round(reco.aimAzimuth, 1)}° azimuth over the next ${round(reco.target.nextInterval, 0)} m. Consider a shorter survey interval if drift continues.`;
  }
  if (status === "Correction needed") {
    return `A correction is advisable within the configured DLS window: ${dipMove} and ${aziMove} from the current direction. Confirm with site procedures before applying at the rig.`;
  }
  if (status === "Steering recommended") {
    return `Escalate for steering review. Natural correction may be marginal; assess directional tooling, a shorter survey interval, or revised target tolerance before drilling another full interval.`;
  }
  if (status === "Target depth passed") {
    return `Target MD has been reached or passed. Review actual intercept, target definition, and end-of-hole decision.`;
  }
  return `Target at risk. The projected correction exceeds the configured dogleg window; review branch, wedge, directional drilling, or revised hole objective.`;
}

export function buildCorrectionOptions(reco: Recommendation): CorrectionOption[] {
  if (reco.remaining <= 0) return [];
  const base = [15, 30, 60, reco.remaining].filter((value) => value > EPS);
  const intervals: number[] = [];

  base.forEach((interval) => {
    const rounded = Math.round(interval * 10) / 10;
    if (!intervals.some((item) => Math.abs(item - rounded) < 0.1)) intervals.push(rounded);
  });

  return intervals.map((interval) => {
    const maxTurn = reco.maxDls * (interval / 30);
    const turn = Math.min(reco.doglegToTarget, maxTurn);
    const turnRatio = reco.doglegToTarget < EPS ? 1 : turn / reco.doglegToTarget;
    const aimDirection = slerpDirection(
      reco.currentVector,
      reco.desiredDirection,
      turnRatio
    );
    const aim = dipAzFromVector(aimDirection);
    const fullyAimed = turn + 0.01 >= reco.doglegToTarget;
    const dls = interval > EPS ? turn / (interval / 30) : 0;

    return {
      interval,
      label:
        Math.abs(interval - reco.remaining) < 0.1
          ? `${round(interval, 0)} m to target`
          : `${round(interval, 0)} m`,
      aimDip: aim.dip,
      aimAzimuth: aim.azimuth,
      turn,
      dls,
      status: fullyAimed ? "Can point at target" : "Partial correction",
    };
  });
}

export function planTargetFromStations(
  planStations: SurveyStation[],
  requestedMd: number
): TargetConfig | null {
  const target = positionOnPlanAtMd(planStations, requestedMd);
  if (!target) return null;
  return {
    md: target.md,
    e: target.e,
    n: target.n,
    d: target.d,
    tolerance: Number.isFinite(target.tolerance) ? target.tolerance! : 6,
    maxDls: 3,
    nextInterval: 30,
  };
}
