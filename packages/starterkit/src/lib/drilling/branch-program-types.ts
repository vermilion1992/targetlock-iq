import type { BranchApprovalSnapshot } from "./branch-program-approval";
import type { SurveyRecord } from "./types";

export type BranchMethod =
  | "wedge"
  | "motor-navi"
  | "devidrill-dcd"
  | "natural"
  | "planned-sidetrack"
  | "contractor-review";

export type DaughterStatus =
  | "draft"
  | "directional-review"
  | "geology-review"
  | "approved"
  | "drilling"
  | "complete"
  | "abandoned"
  /** @deprecated migrated to draft */
  | "planned";

export type HoleRole = "standard" | "mother" | "daughter";

export type BranchTargetType = "point" | "disk" | "plane" | "interval" | "window";

export type BranchTargetPurpose =
  | "infill"
  | "step-out"
  | "extension"
  | "resource-definition"
  | "wedge-recovery"
  | "geotechnical";

export type BranchTarget = {
  id: string;
  label: string;
  e: number;
  n: number;
  d: number;
  type: BranchTargetType;
  priority: number;
  toleranceM?: number;
  targetMdEstimate?: number;
  assignedDaughterId?: string;
  purpose?: BranchTargetPurpose;
};

export type KickoffPlannerDefaults = {
  mdMin: number;
  mdMax: number;
  stepM: number;
  preferredMethod?: BranchMethod | "contractor-review";
};

export type DaughterPlanRef = {
  daughterHoleId: string;
  daughterId: string;
  targetId: string;
  kickoffMd: number;
  method: BranchMethod;
  status: DaughterStatus;
  approval?: BranchApprovalSnapshot | null;
};

export type PersistedBranchProgram = {
  programId: string;
  name: string;
  site: string;
  targets: BranchTarget[];
  daughters: DaughterPlanRef[];
  activeDaughterHoleId?: string | null;
  kickoffPlannerDefaults?: KickoffPlannerDefaults;
};

/** Runtime daughter leg for charts / analysis (from library hole). */
export type DaughterHole = {
  daughterId: string;
  daughterHoleId: string;
  parentHoleId: string;
  kickoffMd: number;
  method: BranchMethod;
  planRecords: SurveyRecord[];
  actualRecords?: SurveyRecord[];
  status: DaughterStatus;
  targetId: string;
  approval?: BranchApprovalSnapshot | null;
};

export type BranchProgramMother = {
  holeId: string;
  planRecords: SurveyRecord[];
  actualRecords: SurveyRecord[];
};

/** UI / Scenario Lab view model. */
export type BranchProgram = {
  id: string;
  name: string;
  site: string;
  description?: string;
  expectedInsight?: string;
  inspect?: string;
  mother: BranchProgramMother;
  daughters: DaughterHole[];
  targets: BranchTarget[];
  kickoffWindow?: { mdMin: number; mdMax: number; stepM: number };
  persisted?: PersistedBranchProgram;
};

export type BranchProgramScenario = BranchProgram & {
  kind: "branch-program";
};

export function normalizeDaughterStatus(status: DaughterStatus): DaughterStatus {
  if (status === "planned") return "draft";
  return status;
}

export const DAUGHTER_STATUS_LABELS: Record<DaughterStatus, string> = {
  draft: "Draft",
  "directional-review": "Directional review",
  "geology-review": "Geology review",
  approved: "Approved",
  drilling: "Drilling",
  complete: "Complete",
  abandoned: "Abandoned",
  planned: "Draft",
};
