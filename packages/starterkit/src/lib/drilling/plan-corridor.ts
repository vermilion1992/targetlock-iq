import { shortestAngle } from "./geometry";
import { round } from "./format";
import { interpolateAtMd } from "./desurvey";
import type { Recommendation, SurveyRecord, SurveyStation } from "./types";

export type PlanCorridorConfig = {
  intervalM: number;
  expectedLiftDropDeg: number;
  expectedSwingDeg: number;
  allowedDipDevDeg: number;
  allowedAziDevDeg: number;
  positionOffsetM: number;
  positionWidenPer100m?: number;
};

export const DEFAULT_PLAN_CORRIDOR: PlanCorridorConfig = {
  intervalM: 30,
  expectedLiftDropDeg: 0.3,
  expectedSwingDeg: 0.3,
  allowedDipDevDeg: 0.3,
  allowedAziDevDeg: 0.3,
  positionOffsetM: 3,
  positionWidenPer100m: 0.5,
};

export type PlanCorridorStatus = {
  latestIntervalInside: boolean;
  outsidePlannedCorridor: boolean;
  targetStillRecoverable: boolean;
  planOffsetM: number;
  allowedPositionOffsetM: number;
  latestLiftDropDelta: number;
  latestSwingDelta: number;
  simpleNotes: string[];
  detailPhrase: string;
};

export function allowedPositionOffsetAtMd(
  corridor: PlanCorridorConfig,
  md: number
): number {
  const widen = corridor.positionWidenPer100m ?? 0;
  return corridor.positionOffsetM + (md / 100) * widen;
}

/** Derive corridor defaults from planned survey records (first interval + CSV tolerances). */
export function derivePlanCorridorFromPlan(
  planRecords: SurveyRecord[],
  intervalM = 30
): PlanCorridorConfig {
  const base = { ...DEFAULT_PLAN_CORRIDOR, intervalM };
  if (planRecords.length < 2) return base;

  const lifts: number[] = [];
  const swings: number[] = [];
  let dipTol: number | undefined;
  let aziTol: number | undefined;

  for (let i = 1; i < planRecords.length; i += 1) {
    const from = planRecords[i - 1]!;
    const to = planRecords[i]!;
    lifts.push(to.dip - from.dip);
    swings.push(shortestAngle(from.azimuth, to.azimuth));
    if (to.dipTolerance != null && Number.isFinite(to.dipTolerance)) {
      dipTol = to.dipTolerance;
    }
    if (to.aziTolerance != null && Number.isFinite(to.aziTolerance)) {
      aziTol = to.aziTolerance;
    }
  }

  const median = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  };

  return {
    ...base,
    expectedLiftDropDeg: median(lifts),
    expectedSwingDeg: median(swings),
    allowedDipDevDeg: dipTol ?? base.allowedDipDevDeg,
    allowedAziDevDeg: aziTol ?? base.allowedAziDevDeg,
  };
}

export function buildCorridorStatus(
  planStations: SurveyStation[],
  actualStations: SurveyStation[],
  corridor: PlanCorridorConfig | null | undefined,
  reco: Recommendation | null
): PlanCorridorStatus | null {
  if (!corridor || !reco || actualStations.length < 2 || !planStations.length) {
    return null;
  }

  const latest = actualStations[actualStations.length - 1]!;
  const previous = actualStations[actualStations.length - 2]!;
  const planFrom = interpolateAtMd(planStations, previous.md);
  const planTo = interpolateAtMd(planStations, latest.md);
  const plannedLiftDrop =
    planFrom && planTo ? planTo.dip - planFrom.dip : corridor.expectedLiftDropDeg;
  const plannedSwing =
    planFrom && planTo
      ? shortestAngle(planFrom.azimuth, planTo.azimuth)
      : corridor.expectedSwingDeg;
  const actualLiftDrop = latest.dip - previous.dip;
  const actualSwing = shortestAngle(previous.azimuth, latest.azimuth);
  const liftDropDelta = actualLiftDrop - plannedLiftDrop;
  const swingDelta = actualSwing - plannedSwing;

  const latestIntervalInside =
    Math.abs(liftDropDelta) <= corridor.allowedDipDevDeg &&
    Math.abs(swingDelta) <= corridor.allowedAziDevDeg;

  const allowedPositionOffsetM = allowedPositionOffsetAtMd(corridor, latest.md);
  const planOffsetM = reco.planOffset;
  const positionOutside = planOffsetM > allowedPositionOffsetM;

  const outsidePlannedCorridor = !latestIntervalInside || positionOutside;
  const targetStillRecoverable = reco.classification.label !== "Target at risk";

  const simpleNotes: string[] = [];
  if (outsidePlannedCorridor) {
    simpleNotes.push("Outside planned corridor");
  }
  if (targetStillRecoverable) {
    simpleNotes.push("Still recoverable");
  } else {
    simpleNotes.push("Target recoverability at risk");
  }
  if (outsidePlannedCorridor && targetStillRecoverable) {
    simpleNotes.push("Review if next survey does not improve");
  }

  const detailPhrase = [
    `Latest interval ${latestIntervalInside ? "inside" : "outside"} planned behaviour tolerance`,
    `(lift/drop Δ ${round(liftDropDelta, 2)}°, swing Δ ${round(swingDelta, 2)}°)`,
    `· offset ${round(planOffsetM, 1)} m vs corridor ${round(allowedPositionOffsetM, 1)} m`,
    `· target ${targetStillRecoverable ? "still recoverable" : "at risk"}`,
  ].join(" ");

  return {
    latestIntervalInside,
    outsidePlannedCorridor,
    targetStillRecoverable,
    planOffsetM,
    allowedPositionOffsetM,
    latestLiftDropDelta: liftDropDelta,
    latestSwingDelta: swingDelta,
    simpleNotes,
    detailPhrase,
  };
}
