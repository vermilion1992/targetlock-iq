export type Vec3 = { e: number; n: number; d: number };

export type SurveyRecord = {
  md: number;
  dip: number;
  azimuth: number;
  tolerance?: number;
  dipTolerance?: number;
  aziTolerance?: number;
};

export type SurveyStation = SurveyRecord & {
  e: number;
  n: number;
  d: number;
  dls: number;
  dogleg: number;
};

export type TargetConfig = {
  md: number;
  e: number;
  n: number;
  d: number;
  tolerance: number;
  maxDls: number;
  nextInterval: number;
};

export type Classification = {
  label: string;
  className: string;
  confidence: string;
};

export type Recommendation = {
  target: TargetConfig;
  current: SurveyStation;
  currentPlan: SurveyStation | null;
  remaining: number;
  aimDip: number;
  aimAzimuth: number;
  dipChange: number;
  aziChange: number;
  dlsRequired: number;
  maxDls: number;
  currentVector: Vec3;
  desiredDirection: Vec3;
  doglegToTarget: number;
  miss: number;
  missVector: Vec3;
  tolerance: number;
  planOffset: number;
  straightRatio: number;
  projection: Vec3;
  classification: Classification;
};

export type CorrectionOption = {
  interval: number;
  label: string;
  aimDip: number;
  aimAzimuth: number;
  turn: number;
  dls: number;
  status: string;
};

export type QaFlag = {
  level: "ok" | "watch" | "risk";
  label: string;
  message: string;
};

export type DeviationPoint = {
  md: number;
  offset: number;
  dls: number;
};
