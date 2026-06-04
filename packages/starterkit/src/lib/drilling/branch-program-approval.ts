import {
  normalizeCapabilityAssumptions,
  type CapabilityAssumptions,
} from "./capability-assumptions";
import type { BranchMethod, DaughterStatus } from "./branch-program-types";
import type { KickoffStation } from "./branch-program";

type DaughterStatusFlow = DaughterStatus;

export type BranchApprovalSnapshot = {
  approvedBy: string;
  role: string;
  approvedAt: string;
  notes?: string;
  approvedMethod: BranchMethod;
  approvedKickoffMd: number;
  approvedTargetId: string;
  assumptionSnapshot: CapabilityAssumptions;
  kickoffE: number;
  kickoffN: number;
  kickoffD: number;
  kickoffDip: number;
  kickoffAzimuth: number;
  requiredDls: number;
  daughterPlanHash: string;
};

export type BranchPlanValidationState = "unvalidated" | "validated" | "stale";

export type BranchPlanValidationStatus = {
  state: BranchPlanValidationState;
  label: string;
  detail: string;
};

export function hashDaughterPlan(planRecords: { md: number; dip: number; azimuth: number }[]): string {
  return JSON.stringify(planRecords.map((r) => [r.md, r.dip, r.azimuth]));
}

export function buildApprovalSnapshot(opts: {
  approvedBy: string;
  role: string;
  notes?: string;
  approvedMethod: BranchMethod;
  approvedKickoffMd: number;
  approvedTargetId: string;
  assumptions: CapabilityAssumptions;
  kickoff: KickoffStation;
  requiredDls: number;
  planRecords: { md: number; dip: number; azimuth: number }[];
}): BranchApprovalSnapshot {
  return {
    approvedBy: opts.approvedBy.trim(),
    role: opts.role.trim(),
    approvedAt: new Date().toISOString(),
    notes: opts.notes?.trim(),
    approvedMethod: opts.approvedMethod,
    approvedKickoffMd: opts.approvedKickoffMd,
    approvedTargetId: opts.approvedTargetId,
    assumptionSnapshot: normalizeCapabilityAssumptions(opts.assumptions),
    kickoffE: opts.kickoff.e,
    kickoffN: opts.kickoff.n,
    kickoffD: opts.kickoff.d,
    kickoffDip: opts.kickoff.motherDip,
    kickoffAzimuth: opts.kickoff.motherAzimuth,
    requiredDls: opts.requiredDls,
    daughterPlanHash: hashDaughterPlan(opts.planRecords),
  };
}

export function branchPlanValidationStatus(
  approval: BranchApprovalSnapshot | null | undefined,
  current: {
    kickoffMd: number;
    assumptions: CapabilityAssumptions;
    planHash: string;
  }
): BranchPlanValidationStatus {
  if (!approval?.approvedBy) {
    return {
      state: "unvalidated",
      label: "Not approved",
      detail: "Branch plan has not been formally approved.",
    };
  }
  const assumptionsChanged =
    JSON.stringify(normalizeCapabilityAssumptions(approval.assumptionSnapshot)) !==
    JSON.stringify(normalizeCapabilityAssumptions(current.assumptions));
  const kickoffChanged = Math.abs(approval.approvedKickoffMd - current.kickoffMd) > 0.5;
  const planChanged = approval.daughterPlanHash !== current.planHash;

  if (assumptionsChanged || kickoffChanged || planChanged) {
    return {
      state: "stale",
      label: "Changed since approval",
      detail:
        "Current assumptions or branch plan differ from the approved branch plan. Re-review before drilling.",
    };
  }
  return {
    state: "validated",
    label: "Approved",
    detail: `Approved by ${approval.approvedBy} (${approval.role}).`,
  };
}

export const BRANCH_STATUS_FLOW: DaughterStatusFlow[] = [
  "draft",
  "directional-review",
  "geology-review",
  "approved",
  "drilling",
  "complete",
];

export function nextBranchStatus(current: DaughterStatus): DaughterStatus | null {
  const norm = current === "planned" ? "draft" : current;
  const idx = BRANCH_STATUS_FLOW.indexOf(norm as DaughterStatusFlow);
  if (idx < 0 || idx >= BRANCH_STATUS_FLOW.length - 1) return null;
  return BRANCH_STATUS_FLOW[idx + 1] ?? null;
}
