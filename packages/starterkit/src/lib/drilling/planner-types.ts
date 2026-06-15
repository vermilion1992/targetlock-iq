import type { ActualVsLockedPlanStatus } from "./actual-vs-plan";
import type { PlannerApprovalSnapshot } from "./planner-approval";
import type { SurveyRecord, TargetConfig } from "./types";



export type PlannerCoordinateMode = "collar-relative" | "grid" | "gps";

export type PlannerPlanType = "standard" | "daughter" | "import";

export type PlannerNorthReference = "grid" | "true" | "magnetic";

export type PlannerTargetInputMode = "collar-relative" | "grid" | "md-offset";

export type PlannerCollarSource =
  | "manual"
  | "imported"
  | "generated"
  | "daughter_kickoff";

export type PlannerCoordinateStatus = "complete" | "partial" | "missing";

export type PlannerPlanStatus =

  | "draft"

  | "planned"

  | "approved"

  | "active"

  | "completed"

  | "archived";

export type PlannerPlanPriority = "low" | "normal" | "high";



export type PlannerCollar = {

  easting: number;

  northing: number;

  elevation: number;

  latitude?: number;

  longitude?: number;

};



export type PlannerProjectCoordinateSystem = {

  mode: "local" | "grid" | "gps";

  projectOrigin?: {

    easting?: number;

    northing?: number;

    elevation?: number;

    latitude?: number;

    longitude?: number;

  };

  gridName?: string;

  epsgCode?: string;

  magneticDeclinationDeg?: number;

  gridConvergenceDeg?: number;

  notes?: string;

  plannerQa?: PlannerQaSettings;

};

export type PlannerQaSettings = {
  minHoleSeparationM: number;
  minMotherDaughterSeparationM: number;
  minSiblingDaughterSeparationM: number;
  sampleIntervalM: number;
  motherDaughterKickoffExclusionM: number;
  maxDls: number;
  maxDipChangePerIntervalDeg?: number;
  maxAzimuthChangePerIntervalDeg?: number;
  requireCoordinateMetadataBeforeApproval: boolean;
  /** Separation factor below this is a watch (uncertainty-aware clearance). */
  separationFactorWarn?: number;
  /** Separation factor below this is a risk. */
  separationFactorRisk?: number;
  /** Separation factor below this blocks approval. */
  separationFactorBlock?: number;
  /** Sigma multiplier for the simplified uncertainty model (2 ~ 95%). */
  uncertaintySigmaFactor?: number;
};

export type PlannerQaSeverity = "ok" | "watch" | "risk";

export type PlannerClearanceRelationship =
  | "standard-standard"
  | "mother-daughter"
  | "daughter-sibling"
  | "planned-vs-actual";

export type PlannerClearancePair = {
  holeAId: string;
  holeBId: string;
  holeAName: string;
  holeBName: string;
  relationship: PlannerClearanceRelationship;
  minDistanceM: number;
  mdA: number;
  mdB: number;
  severity: PlannerQaSeverity;
  message: string;
  /** Uncertainty-aware separation factor at closest approach (null when no uncertainty). */
  separationFactor?: number | null;
  /** Combined uncertainty radii of both holes at closest approach (m). */
  combinedRadiusM?: number;
};

export type PlannerDrillabilityIssue = {
  code: string;
  level: "error" | "warning";
  message: string;
  md?: number;
};

export type PlannerHoleQaSummary = {
  holeId: string;
  badge: "ok" | "watch" | "risk" | "blocked";
  drillability: { ok: boolean; issues: PlannerDrillabilityIssue[] };
  clearanceRiskCount: number;
};

export type PlannerQaReport = {
  programId: string;
  generatedAt: string;
  settings: PlannerQaSettings;
  clearancePairs: PlannerClearancePair[];
  holeSummaries: PlannerHoleQaSummary[];
  programSummary: {
    riskCount: number;
    watchCount: number;
    closestClearanceM: number | null;
    drillabilityIssueCount: number;
    blockedHoleCount: number;
  };
};



export type PlannerTarget = {

  md?: number;

  e: number;

  n: number;

  d: number;

  tolerance: number;

  inputMode: PlannerTargetInputMode;

};



export type PlannerConstraints = {

  surveyInterval: number;

  maxDls: number;

  /** Path design: straight (default), build-and-hold, or curve-to-target. */
  pathDesign?: import("./well-path-design").PathDesignType;

  /** Straight section length before the curve (build-and-hold only). */
  kickoffLengthM?: number;

  /** Build rate in deg/30 m (build-and-hold only; defaults to maxDls). */
  buildRateDegPer30m?: number;

};



export type PlannerDaughterKickoff = {

  motherHoleId: string;

  motherHoleName: string;

  kickoffMd: number;

  e: number;

  n: number;

  d: number;

  dip: number;

  azimuth: number;

};



export type PlannerDraft = {

  planId: string;

  projectName: string;

  planType: PlannerPlanType;

  coordinateMode: PlannerCoordinateMode;

  northReference: PlannerNorthReference;

  collar?: PlannerCollar;

  initialDip?: number;

  initialAzimuth?: number;

  holeName?: string;

  daughterKickoff?: PlannerDaughterKickoff;

  target: PlannerTarget;

  constraints: PlannerConstraints;

  planRecords: SurveyRecord[];

  warnings: string[];

  importCsvText?: string;

  /** Collar coordinate source / survey notes entered in Create */
  coordinateSourceNotes?: string;

  programId?: string;

  programName?: string;

  projectCoordinateSystem?: PlannerProjectCoordinateSystem;

  /** When editing an existing saved hole from the library */

  editingHoleId?: string;

};



export type PlannerProjectMetadata = {

  coordinateMode: PlannerCoordinateMode;

  northReference: PlannerNorthReference;

  collar?: PlannerCollar;

  collarSource?: PlannerCollarSource;

  targetInputMode?: PlannerTargetInputMode;

  plannedAt: string;

  createdFromPlanner: boolean;

  planType?: PlannerPlanType;

  status: PlannerPlanStatus;

  programId?: string;

  programName?: string;

  planRevision?: number;

  parentPlanId?: string;

  previousRevisionHoleId?: string;

  nextRevisionHoleId?: string;

  revisionReason?: string;

  approvedBy?: string;

  approvedAt?: string;

  approvalSnapshot?: PlannerApprovalSnapshot | null;

  activatedAt?: string;

  completedAt?: string;

  plannerNotes?: string;

  objective?: string;

  priority?: PlannerPlanPriority;

  projectCoordinateSystem?: PlannerProjectCoordinateSystem;

  activatedFromPlannerAt?: string;

  activePlanHash?: string;

  lockedPlan?: PlannerLockedPlan;

  executionStatus?: PlannerExecutionStatus;

  completionSnapshot?: PlannerCompletionSnapshot;

};

export type PlannerCompletionSnapshot = {
  completedAt: string;
  completedBy?: string;
  finalActualMd: number | null;
  finalPlanOffsetM: number | null;
  finalTrackingStatus?: Exclude<
    ActualVsLockedPlanStatus,
    "no-locked-plan" | "not-started"
  >;
  actualSurveyCount: number;
  lockedPlanHash?: string;
  planRevision: number;
  reportSummary?: string;
};

export type PlannerLockedPlanQaSummary = {
  hardErrorCount: number;
  warningCount: number;
  clearanceRiskCount: number;
};

export type PlannerLockedPlan = {
  lockedAt: string;
  planHash: string;
  planRevision: number;
  approvalHash?: string;
  approvedBy?: string;
  approvedAt?: string;
  planRecords: SurveyRecord[];
  target: TargetConfig;
  projectCoordinateSystem?: PlannerProjectCoordinateSystem;
  qaSummary?: PlannerLockedPlanQaSummary;
};

export type PlannerExecutionState =
  | "not-started"
  | "drilling"
  | "paused"
  | "completed"
  | "revised";

export type PlannerExecutionStatus = {
  state: PlannerExecutionState;
  startedAt?: string;
  completedAt?: string;
  completedBy?: string;
  completionNotes?: string;
  pausedAt?: string;
  pausedReason?: string;
  revisedAt?: string;
  revisedToHoleId?: string;
  notes?: string;
};

export type PlanLockStatusState =
  | "locked-current"
  | "locked-stale"
  | "no-lock"
  | "no-approval"
  | "plan-changed"
  | "completed";

/** Derived program summary — not persisted on HoleLibrary */

export type PlannerProgram = {

  programId: string;

  name: string;

  siteName?: string;

  status: PlannerPlanStatus;

  holeCount: number;

  countsByStatus: Record<PlannerPlanStatus, number>;

  warnings: string[];

};



export type PlannerHoleSummary = {

  holeId: string;

  holeName: string;

  planType: "standard" | "daughter" | "import";

  programId?: string;

  programName?: string;

  status: PlannerPlanStatus;

  collarOrKickoff: string;

  targetMd: number | null;

  plannedTd: number | null;

  stationCount: number;

  maxDls: number | null;

  updatedAt: string;

  warnings: string[];

  actualSurveyCount?: number;

  latestActualMd?: number | null;

  latestOffset?: number | null;

  trackingStatus?: import("./actual-vs-plan").ActualVsLockedPlanStatus;

  executionState?: PlannerExecutionState;

  lockStatus?: PlanLockStatusState;

  planRevision?: number;

  completedAt?: string;

  nextRevisionHoleId?: string;

};



export type PlannerRelationshipNode = {

  holeId: string;

  holeName: string;

  planType: "standard" | "daughter";

  status: PlannerPlanStatus;

  children: PlannerRelationshipNode[];

  warning?: string;

};



export type PlannerStepId =

  | "project"

  | "collar"

  | "target"

  | "constraints"

  | "generate"

  | "review"

  | "publish";



export const PLANNER_STEPS: { id: PlannerStepId; label: string }[] = [

  { id: "project", label: "Program / identity" },

  { id: "collar", label: "Collar / kickoff" },

  { id: "target", label: "Target coordinates" },

  { id: "constraints", label: "Path constraints" },

  { id: "generate", label: "Generate plan" },

  { id: "review", label: "Review" },

  { id: "publish", label: "Save plan" },

];



export const DEFAULT_PLANNER_CONSTRAINTS: PlannerConstraints = {

  surveyInterval: 30,

  maxDls: 3,

};



export const PLANNER_STATUSES: PlannerPlanStatus[] = [

  "draft",

  "planned",

  "approved",

  "active",

  "completed",

  "archived",

];



export function createEmptyPlannerDraft(): PlannerDraft {

  return {

    planId: `plan-${Date.now()}`,

    projectName: "",

    planType: "standard",

    coordinateMode: "collar-relative",

    northReference: "grid",

    target: {

      e: 0,

      n: 0,

      d: 0,

      tolerance: 6,

      inputMode: "collar-relative",

    },

    constraints: { ...DEFAULT_PLANNER_CONSTRAINTS },

    planRecords: [],

    warnings: [],

  };

}



export function defaultProgramId(projectName: string): string {

  const slug = projectName

    .trim()

    .toLowerCase()

    .replace(/[^\w]+/g, "-")

    .replace(/^-|-$/g, "");

  return slug ? `program-${slug}` : `program-${Date.now()}`;

}


