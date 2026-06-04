import { branchPlanValidationStatus } from "./branch-program-approval";
import { kickoffStationFromMother } from "./branch-program";
import type { BranchApprovalSnapshot } from "./branch-program-approval";
import type { DaughterHole } from "./branch-program-types";
import type { CapabilityAssumptions } from "./capability-assumptions";
import type { TestScenario } from "./test-scenarios";
import type { SyntheticHoleParams } from "./synthetic-hole-builder";

/** Confirm copy before Scenario Lab or guide demo replaces active hole data. */
export function describeDestructiveScenarioLoad(label: string): string {
  return `Load scenario “${label}”? This replaces the active hole’s plan, surveys, target, and branch context with test data.`;
}

/** Confirm copy before clearing supervisor decision history. */
export function describeClearHistoryConfirm(): string {
  return "Clear all decision history for this hole? Survey data and targets are not affected.";
}

/** Confirm when exiting or restarting a guide after a demo scenario was loaded. */
export function describeGuideDemoExitConfirm(): string {
  return "Exit the guide and restore your hole data from before the tour started?";
}

export function describeGuideDemoRestartConfirm(): string {
  return "Restart the guide from step 1 and restore your pre-tour hole data?";
}

/** Cancel survey leg picker after CSV assistant validation. */
export function describeImportTargetCancelConfirm(): string {
  return "Cancel import? The validated file will not be applied. Any import-undo snapshot is cleared.";
}

/** Built-in invalid-import card is educational only — use CSV test pack in sidebar. */
export function canLoadBuiltInScenario(scenario: Pick<TestScenario, "kind">): boolean {
  return scenario.kind !== "invalid-import";
}

export type SyntheticValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateSyntheticHoleParams(
  params: SyntheticHoleParams
): SyntheticValidationResult {
  const name = params.holeName?.trim();
  if (!name) {
    return { ok: false, error: "Enter a hole name before generating a scenario." };
  }
  if (!Number.isFinite(params.targetMd) || params.targetMd < 30) {
    return { ok: false, error: "Target depth must be at least 30 m." };
  }
  if (!Number.isFinite(params.surveyInterval) || params.surveyInterval < 1) {
    return { ok: false, error: "Survey interval must be at least 1 m." };
  }
  if (!Number.isFinite(params.startDip) || params.startDip < -90 || params.startDip > 90) {
    return { ok: false, error: "Start dip must be between -90° and 90°." };
  }
  if (!Number.isFinite(params.startAzimuth)) {
    return { ok: false, error: "Start azimuth must be a valid number." };
  }
  if (params.targetMd <= params.surveyInterval) {
    return {
      ok: false,
      error: "Target depth must be greater than the survey interval.",
    };
  }
  return { ok: true };
}

/** Sanitize branch target coordinate fields (E/N/D, tolerance). */
export function sanitizeBranchCoordField(
  raw: string,
  previous: number,
  opts?: { min?: number; max?: number }
): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return previous;
  const min = opts?.min ?? -1e6;
  const max = opts?.max ?? 1e6;
  return Math.min(max, Math.max(min, n));
}

export function sanitizeBranchToleranceM(raw: string, previous: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return previous;
  return Math.max(0.1, n);
}

export type BranchExportReadiness = {
  ready: boolean;
  reason: string;
};

export function branchExportReadiness(opts: {
  daughter: DaughterHole;
  motherActualRecords: { md: number; dip: number; azimuth: number }[];
  approval?: BranchApprovalSnapshot | null;
  recoveryAssumptions: CapabilityAssumptions;
}): BranchExportReadiness {
  const { daughter, motherActualRecords, approval, recoveryAssumptions } = opts;
  if (!daughter.planRecords.length) {
    return {
      ready: false,
      reason: "Add a daughter plan (save kickoff draft) before exporting.",
    };
  }
  const kickoff = kickoffStationFromMother(motherActualRecords, daughter.kickoffMd);
  if (!kickoff) {
    return {
      ready: false,
      reason: "Mother actual surveys must cover the daughter kickoff MD.",
    };
  }
  const validation = branchPlanValidationStatus(approval, {
    kickoffMd: daughter.kickoffMd,
    assumptions: recoveryAssumptions,
    planHash: JSON.stringify(daughter.planRecords.map((r) => [r.md, r.dip, r.azimuth])),
  });
  if (validation.state === "unvalidated") {
    return {
      ready: true,
      reason: "Export available — branch plan not formally approved.",
    };
  }
  return { ready: true, reason: validation.detail };
}
