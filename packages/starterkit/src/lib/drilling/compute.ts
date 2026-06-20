import { buildStations } from "./desurvey";
import { assessHoleMode } from "./hole-mode";
import { calculateRecommendation } from "./recommendation";
import {
  buildReferenceWarnings,
  convertSurveyRecordsReference,
  fromTrueAzimuth,
  normalizeReferenceSystem,
  type ReferenceSystemConfig,
  type ReferenceWarning,
} from "./reference-system";
import { computeSteeringFeasibility } from "./steering-feasibility";
import type { CapabilityAssumptions } from "./capability-assumptions";
import type { HoleModeAssessment } from "./hole-mode";
import { buildCorridorStatus } from "./plan-corridor";
import type { PlanCorridorConfig } from "./plan-corridor";
import {
  applySteeringPolicy,
  evaluateSteeringPolicy,
  normalizeSteeringSettings,
  type SteeringPolicyMatch,
  type SteeringSettings,
} from "./steering-settings";
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
  steeringPolicy: SteeringPolicyMatch | null;
  referenceWarnings: ReferenceWarning[];
  holeModeAssessment: HoleModeAssessment | null;
};

function convertRecommendationForDisplay(
  recommendation: Recommendation,
  config: ReferenceSystemConfig
): Recommendation {
  if (config.outputReference === "true") return recommendation;

  return {
    ...recommendation,
    current: {
      ...recommendation.current,
      azimuth: fromTrueAzimuth(
        recommendation.current.azimuth,
        config.outputReference,
        config
      ),
    },
    currentPlan: recommendation.currentPlan
      ? {
          ...recommendation.currentPlan,
          azimuth: fromTrueAzimuth(
            recommendation.currentPlan.azimuth,
            config.outputReference,
            config
          ),
        }
      : null,
    aimAzimuth: fromTrueAzimuth(
      recommendation.aimAzimuth,
      config.outputReference,
      config
    ),
  };
}

export function computeHole(
  planRecords: SurveyRecord[],
  actualRecords: SurveyRecord[],
  target: TargetConfig,
  recoveryAssumptions?: Partial<CapabilityAssumptions> | null,
  planCorridor?: PlanCorridorConfig | null,
  referenceSystem?: ReferenceSystemConfig | null,
  steeringSettings?: Partial<SteeringSettings> | null
): ComputedHole {
  const ref = normalizeReferenceSystem(referenceSystem);
  const referenceWarnings = buildReferenceWarnings(ref);
  const planTrue = convertSurveyRecordsReference(planRecords, ref.planReference, ref);
  const actualTrue = convertSurveyRecordsReference(actualRecords, ref.surveyReference, ref);

  const planStations = buildStations(planTrue);
  const actualStations = buildStations(actualTrue);
  const recommendationRaw = calculateRecommendation(planStations, actualStations, target);

  const holeModeAssessment = recommendationRaw
    ? assessHoleMode(recommendationRaw.current.dip)
    : null;

  const settings = normalizeSteeringSettings(steeringSettings);

  const steeringBase = computeSteeringFeasibility(
    recommendationRaw,
    planStations,
    actualStations,
    recoveryAssumptions,
    planCorridor,
    holeModeAssessment?.mode,
    settings.gear
  );

  const corridorStatus = buildCorridorStatus(
    planStations,
    actualStations,
    planCorridor,
    recommendationRaw
  );
  const steeringPolicy = evaluateSteeringPolicy(
    recommendationRaw,
    planStations,
    corridorStatus,
    settings
  );
  const steering =
    steeringBase && recommendationRaw ?
      applySteeringPolicy(steeringBase, recommendationRaw, steeringPolicy, settings.gear)
    : steeringBase;

  const recommendation = recommendationRaw
    ? convertRecommendationForDisplay(recommendationRaw, ref)
    : null;

  return {
    planStations,
    actualStations,
    recommendation,
    steering,
    steeringPolicy,
    referenceWarnings,
    holeModeAssessment,
  };
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
