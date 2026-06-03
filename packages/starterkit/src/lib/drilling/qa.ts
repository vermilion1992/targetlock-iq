import { round } from "./format";
import { shortestAngle } from "./geometry";
import type { PlanCorridorStatus } from "./plan-corridor";
import type { QaFlag, Recommendation, SurveyStation } from "./types";

export function buildQaFlags(
  reco: Recommendation,
  actualStations: SurveyStation[],
  corridorStatus?: PlanCorridorStatus | null
): QaFlag[] {
  const flags: QaFlag[] = [];
  const latest = actualStations[actualStations.length - 1];
  const previous = actualStations[actualStations.length - 2];
  const surveyInterval = previous ? latest.md - previous.md : latest.md;
  const aziWalk = previous
    ? Math.abs(shortestAngle(previous.azimuth, latest.azimuth))
    : 0;
  const dipWalk = previous ? Math.abs(latest.dip - previous.dip) : 0;

  if (surveyInterval > reco.target.nextInterval * 1.25) {
    flags.push({
      level: "watch",
      label: "Interval",
      message: `Last survey interval was ${round(surveyInterval, 1)} m. Consider shortening to ${round(reco.target.nextInterval, 0)} m or less while correcting.`,
    });
  } else {
    flags.push({
      level: "ok",
      label: "Interval",
      message: `Last survey interval is ${round(surveyInterval, 1)} m and inside the planned cadence.`,
    });
  }

  if (latest.dls > reco.maxDls) {
    flags.push({
      level: "risk",
      label: "DLS",
      message: `Actual DLS is ${round(latest.dls, 2)}°/30 m, above the ${round(reco.maxDls, 2)}°/30 m steering limit.`,
    });
  } else if (latest.dls > reco.maxDls * 0.75) {
    flags.push({
      level: "watch",
      label: "DLS",
      message: `Actual DLS is ${round(latest.dls, 2)}°/30 m and approaching the configured limit.`,
    });
  } else {
    flags.push({
      level: "ok",
      label: "DLS",
      message: `Actual DLS is ${round(latest.dls, 2)}°/30 m.`,
    });
  }

  if (reco.planOffset > reco.tolerance * 2) {
    flags.push({
      level: "risk",
      label: "Plan",
      message: `Actual hole is ${round(reco.planOffset, 1)} m from plan at MD ${round(latest.md, 0)} m.`,
    });
  } else if (reco.planOffset > reco.tolerance) {
    flags.push({
      level: "watch",
      label: "Plan",
      message: `Actual hole is ${round(reco.planOffset, 1)} m from plan and outside target tolerance.`,
    });
  } else {
    flags.push({
      level: "ok",
      label: "Plan",
      message: `Actual hole is ${round(reco.planOffset, 1)} m from the planned trajectory.`,
    });
  }

  if (reco.dlsRequired > reco.maxDls) {
    flags.push({
      level: "risk",
      label: "Recover",
      message: `Required DLS to point back at target is ${round(reco.dlsRequired, 2)}°/30 m, above the configured limit.`,
    });
  } else {
    flags.push({
      level: "ok",
      label: "Recover",
      message: `Required DLS is ${round(reco.dlsRequired, 2)}°/30 m and inside the configured limit.`,
    });
  }

  if (reco.miss > reco.tolerance * 3) {
    flags.push({
      level: "risk",
      label: "Target",
      message: `No-action projection misses by ${round(reco.miss, 1)} m against a ${round(reco.tolerance, 1)} m envelope.`,
    });
  } else if (reco.miss > reco.tolerance) {
    flags.push({
      level: "watch",
      label: "Target",
      message: `No-action projection is outside target by ${round(reco.miss - reco.tolerance, 1)} m.`,
    });
  } else {
    flags.push({
      level: "ok",
      label: "Target",
      message: `No-action projection is inside the target envelope.`,
    });
  }

  if (aziWalk > 4 || dipWalk > 2) {
    flags.push({
      level: "watch",
      label: "Trend",
      message: `Last interval changed ${round(dipWalk, 1)}° dip and ${round(aziWalk, 1)}° azimuth. Watch for continuing drift.`,
    });
  }

  if (corridorStatus?.outsidePlannedCorridor && corridorStatus.targetStillRecoverable) {
    flags.push({
      level: "watch",
      label: "Corridor",
      message: `Outside planned path corridor (${round(corridorStatus.planOffsetM, 1)} m from plan) but target still recoverable — review next survey.`,
    });
  } else if (corridorStatus?.outsidePlannedCorridor) {
    flags.push({
      level: "risk",
      label: "Corridor",
      message: `Outside planned path corridor at MD ${round(latest.md, 0)} m.`,
    });
  }

  return flags;
}
