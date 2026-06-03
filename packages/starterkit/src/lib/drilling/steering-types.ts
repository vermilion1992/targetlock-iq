export type SteeringMethodId =
  | "natural"
  | "parameter"
  | "shorten_interval"
  | "motor_navi"
  | "devidrill"
  | "wedge_branch";

export type RecoveryAction =
  | "On track"
  | "Watch"
  | "Correct now"
  | "Steering review"
  | "Wedge or branch review";

export type RecoveryConfidence = "High" | "Medium" | "Low";

export type CapabilityProfile = {
  id: SteeringMethodId;
  label: string;
  dlsMin: number;
  dlsMax: number;
  confidence: RecoveryConfidence;
  isSteeringMethod: boolean;
  note: string;
  feasiblePhrase: string;
  reviewPhrase: string;
};

export type IntervalBehaviour = {
  mdFrom: number;
  mdTo: number;
  length: number;
  plannedLiftDrop: number;
  plannedSwing: number;
  actualLiftDrop: number;
  actualSwing: number;
  liftDropDelta: number;
  swingDelta: number;
  outsideTolerance: boolean;
};

export type RejoinDlsOption = {
  depthMd: number;
  label: string;
  requiredDls: number;
  feasible: boolean;
};

export type MethodFeasibility = {
  id: SteeringMethodId;
  label: string;
  feasible: boolean;
  phrase: string;
  dlsRangeLabel: string;
  confidence: RecoveryConfidence;
  note: string;
};

export type RecoveryGuidanceSimple = {
  currentAction: RecoveryAction;
  bestMethod: string;
  nextAim: string;
  confidence: RecoveryConfidence;
  escalation: string;
};

export type SteeringFeasibility = {
  intervals: IntervalBehaviour[];
  latestInterval: IntervalBehaviour | null;
  currentAction: RecoveryAction;
  bestMethodId: SteeringMethodId;
  bestMethodLabel: string;
  recoveryConfidence: RecoveryConfidence;
  escalationDepthMd: number | null;
  escalationPhrase: string;
  nextAimPhrase: string;
  requiredDlsToTarget: number;
  trendPhrase: string;
  rejoinByDepth: RejoinDlsOption[];
  methods: MethodFeasibility[];
  pointOfNoReturnMd: number | null;
  assumptionsNote: string;
  simple: RecoveryGuidanceSimple;
};
