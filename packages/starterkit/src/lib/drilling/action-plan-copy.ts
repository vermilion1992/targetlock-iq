import { round } from "./format";
import {
  azimuthInstruction,
  dipInstruction,
} from "./recommendation";
import type {
  RecoveryAction,
  SteeringFeasibility,
  SteeringMethodId,
} from "./steering-types";
import type { Recommendation } from "./types";

export const NEXT_INTERVAL_AIM_HEADING = "Next interval aim";

export const NEXT_INTERVAL_AIM_TIP =
  "The aim is recalculated after every survey. It should not be repeated blindly if the next survey shows a different response.";

export const ACTION_PLAN_PANEL_TIP =
  "Decision support for the next survey interval: current status, next-interval aim, and escalation guidance. Not a permanent drilling directive — site approval applies.";

export const NEXT_INTERVAL_AIM_STATION_NOTE =
  "Next-interval aim. Re-survey and recalculate at the next station.";

const RECOVERY_LOOP_BASE =
  "Recovery is a repeated survey-control process: aim the next interval, survey again, then recalculate.";

const RECOVERY_LOOP_OFF_PLAN =
  "If the next survey does not improve the trend, shorten the interval or request steering review.";

export const FEASIBILITY_WITHIN_ASSUMPTIONS =
  "Correction appears within configured capability assumptions.";

export const FEASIBILITY_SHORTEN_OR_STEERING =
  "Consider shortening survey interval or requesting steering review.";

export const FEASIBILITY_WEDGE_BRANCH =
  "Wedge/branch review may be required.";

export function nextIntervalAimExplainer(nextIntervalM: number): string {
  const base =
    "Use this as the aim for the next survey interval. Re-survey and recalculate at the next station.";
  if (nextIntervalM > 0) {
    const n = round(nextIntervalM, 0);
    return `${base} Aim for the next ${n} m, then update TargetLock with the next survey.`;
  }
  return base;
}

export function formatRecoveryActionDisplay(
  action: RecoveryAction | string,
  bestMethodId?: SteeringMethodId | null
): string {
  if (action === "Watch" && bestMethodId === "shorten_interval") {
    return "Shorten interval";
  }
  if (action === "Correct now") return "Correction advisable";
  if (action === "Steering review") return "Steering review recommended";
  if (action === "Wedge or branch review") return "Wedge / branch review recommended";
  return action;
}

export function pdfNextIntervalAimLine(nextIntervalM: number): string {
  if (nextIntervalM > 0) {
    const n = round(nextIntervalM, 0);
    return `Next-interval aim for the next ${n} m. Re-survey and recalculate at the next station.`;
  }
  return "Next-interval aim for the next survey interval. Re-survey and recalculate at the next station.";
}

export function pdfRecoveryOneLiner(
  reco: Recommendation,
  steering: SteeringFeasibility | null | undefined
): string {
  const action = steering?.simple.currentAction ?? reco.classification.label;
  const displayAction = formatRecoveryActionDisplay(action, steering?.bestMethodId);
  const feasibility = feasibilityEscalationNote(reco, steering);
  if (feasibility) {
    return `${displayAction}. ${feasibility}`;
  }
  const tip = actionGuidanceTip(action);
  const firstSentence = tip.split(/(?<=[.!?])\s+/)[0] ?? tip;
  return `${displayAction}. ${firstSentence}`;
}

export function recoveryLoopNotes(reco: Recommendation): string[] {
  const notes = [RECOVERY_LOOP_BASE];
  const onTrack =
    reco.classification.className === "on-track" && reco.miss <= reco.tolerance;
  if (!onTrack) {
    notes.push(RECOVERY_LOOP_OFF_PLAN);
  }
  return notes;
}

/** Full Next interval aim InfoTip — recovery loop and DLS feasibility guidance. */
export function nextIntervalAimTooltip(
  reco: Recommendation,
  steering: SteeringFeasibility | null | undefined
): string {
  const parts = [NEXT_INTERVAL_AIM_TIP, ...recoveryLoopNotes(reco)];
  const feasibility = feasibilityEscalationNote(reco, steering);
  if (feasibility) parts.push(feasibility);
  return parts.join(" ");
}

export function feasibilityEscalationNote(
  reco: Recommendation,
  steering: SteeringFeasibility | null | undefined
): string | null {
  if (!Number.isFinite(reco.dlsRequired)) return null;

  const action = steering?.simple.currentAction;
  if (action === "Wedge or branch review") {
    return FEASIBILITY_WEDGE_BRANCH;
  }

  const wedgeRow = steering?.methods.find((m) => m.id === "wedge_branch");
  if (wedgeRow?.feasible) {
    return FEASIBILITY_WEDGE_BRANCH;
  }

  const pnr = steering?.pointOfNoReturnMd;
  if (
    pnr != null &&
    pnr > reco.current.md + reco.target.nextInterval * 0.5 &&
    pnr <= reco.current.md + reco.remaining
  ) {
    return FEASIBILITY_WEDGE_BRANCH;
  }

  if (reco.classification.className === "on-track" || reco.dlsRequired <= reco.maxDls + 0.05) {
    return FEASIBILITY_WITHIN_ASSUMPTIONS;
  }

  if (action === "Steering review") {
    return FEASIBILITY_SHORTEN_OR_STEERING;
  }

  const smoothFeasible = steering?.methods.some(
    (m) =>
      m.feasible &&
      (m.id === "natural" ||
        m.id === "parameter" ||
        m.id === "motor_navi" ||
        m.id === "devidrill")
  );
  if (smoothFeasible && (action === "Correct now" || action === "Watch")) {
    return FEASIBILITY_WITHIN_ASSUMPTIONS;
  }

  if (reco.dlsRequired > reco.maxDls * 1.75) {
    return FEASIBILITY_WEDGE_BRANCH;
  }

  return FEASIBILITY_SHORTEN_OR_STEERING;
}

export function nextCheckDepthMd(currentMd: number, nextIntervalM: number): string {
  if (!Number.isFinite(currentMd) || !Number.isFinite(nextIntervalM) || nextIntervalM <= 0) {
    return "—";
  }
  return `${round(currentMd + nextIntervalM, 1)} m`;
}

export function changeFromLatestSurveyLabel(dipChange: number, aziChange: number): string {
  const dip = dipInstruction(dipChange);
  const azi = azimuthInstruction(aziChange);
  if (dip === "Hold dip" && azi === "Hold azimuth") {
    return "Change from latest survey: hold dip and azimuth";
  }
  return `Change from latest survey: ${dip}, ${azi.toLowerCase()}`;
}

export function actionGuidanceTip(action: RecoveryAction | string): string {
  switch (action) {
    case "On track":
      return "Latest survey and projected miss are within target tolerance — continue the planned survey interval.";
    case "Watch":
      return "Early warning: confirm trend on the next survey before committing to a full correction.";
    case "Shorten interval":
      return "Keep the current interval for now but survey sooner on the next station to confirm drift.";
    case "Correct now":
    case "Correction advisable":
      return "Off plan but may still be recoverable within configured dogleg — review the recommended aim with site procedures.";
    case "Steering review":
      return "Required dogleg may exceed normal correction assumptions — involve supervisor or directional crew.";
    case "Wedge or branch review":
      return "Smooth recovery is unlikely — review wedge, branch, or revised hole objective.";
    default:
      return "Review status with site procedures before the next interval.";
  }
}
