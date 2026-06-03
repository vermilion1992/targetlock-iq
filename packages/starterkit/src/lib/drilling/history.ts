import type { Recommendation } from "./types";
import { round } from "./format";
import { dipInstruction, azimuthInstruction } from "./recommendation";

export type DecisionHistoryType =
  | "data_loaded"
  | "survey_added"
  | "survey_replaced"
  | "survey_removed"
  | "target_updated"
  | "use_plan_target"
  | "report_exported"
  | "recommendation_snapshot"
  | "supervisor_decision";

export type DecisionHistoryEntry = {
  id: string;
  timestamp: string;
  type: DecisionHistoryType;
  summary: string;
  detail?: string;
  md?: number;
  statusLabel?: string;
  actionTaken?: string;
};

export function createHistoryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatRecommendationSnapshot(reco: Recommendation): string {
  return [
    `Status: ${reco.classification.label}`,
    `MD ${round(reco.current.md, 0)} m | Dip ${round(reco.current.dip, 1)}° | Azi ${round(reco.current.azimuth, 1)}°`,
    `Projected miss ${round(reco.miss, 1)} m | Plan offset ${round(reco.planOffset, 1)} m`,
    `Next aim: ${round(reco.aimDip, 1)}° dip, ${round(reco.aimAzimuth, 1)}° azi`,
    `${dipInstruction(reco.dipChange)}; ${azimuthInstruction(reco.aziChange)}`,
  ].join("\n");
}

export function entryForSurvey(
  type: "survey_added" | "survey_replaced" | "survey_removed",
  md: number,
  dip: number,
  azimuth: number,
  actionTaken?: string
): Omit<DecisionHistoryEntry, "id" | "timestamp"> {
  const labels = {
    survey_added: "Survey added",
    survey_replaced: "Survey replaced",
    survey_removed: "Survey removed",
  };
  return {
    type,
    summary: `${labels[type]} at MD ${round(md, 1)} m`,
    detail: `Dip ${round(dip, 1)}°, azimuth ${round(azimuth, 1)}°`,
    md,
    actionTaken,
  };
}
