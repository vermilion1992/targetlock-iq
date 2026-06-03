import { buildStations } from "./desurvey";
import { calculateRecommendation } from "./recommendation";
import { computeSteeringFeasibility } from "./steering-feasibility";
import type { CapabilityAssumptions } from "./capability-assumptions";
import type { PlanCorridorConfig } from "./plan-corridor";
import type { SteeringFeasibility } from "./steering-types";
import type {
  Recommendation,
  SurveyRecord,
  SurveyStation,
  TargetConfig,
} from "./types";

export type ComputedHole = {
  planStations: SurveyStation[];
  actualStations: SurveyStation[];
  recommendation: Recommendation | null;
  steering: SteeringFeasibility | null;
};

export function computeHole(
  planRecords: SurveyRecord[],
  actualRecords: SurveyRecord[],
  target: TargetConfig,
  recoveryAssumptions?: Partial<CapabilityAssumptions> | null,
  planCorridor?: PlanCorridorConfig | null
): ComputedHole {
  const planStations = buildStations(planRecords);
  const actualStations = buildStations(actualRecords);
  const recommendation = calculateRecommendation(planStations, actualStations, target);
  const steering = computeSteeringFeasibility(
    recommendation,
    planStations,
    actualStations,
    recoveryAssumptions,
    planCorridor
  );
  return { planStations, actualStations, recommendation, steering };
}

export const DEFAULT_TARGET: TargetConfig = {
  md: 600,
  e: 0,
  n: 0,
  d: 0,
  tolerance: 6,
  maxDls: 3,
  nextInterval: 30,
};
