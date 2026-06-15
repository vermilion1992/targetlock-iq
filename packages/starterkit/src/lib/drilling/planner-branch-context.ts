import type { BranchProgram } from "./branch-program-types";
import { findHole, type HoleLibrary } from "./hole-library";
import { isPlannerCreatedHole } from "./planner-status";
import type { SavedHoleProject } from "./storage";

export type BranchPlannerContext = {
  /** Active hole was created in Hole Planner */
  isPlannerHole: boolean;
  /** Targets, daughters, and branch approvals are managed in Planner */
  planningReadOnly: boolean;
  /** Hide dashboard "Start branch program" — use Planner instead */
  blockBranchInit: boolean;
  programName?: string;
  /** Hole ID for `/targetlock/planner?holeId=` deep link */
  plannerLinkHoleId: string;
  motherHoleId?: string;
};

function daughtersOfMother(
  library: HoleLibrary,
  motherHoleId: string
): SavedHoleProject[] {
  return library.holes.filter((h) => h.parentHoleId === motherHoleId);
}

function branchRefsHavePlannerDaughters(
  library: HoleLibrary,
  program: BranchProgram | null
): boolean {
  if (!program?.daughters.length) return false;
  return program.daughters.some((ref) => {
    const hole = findHole(library, ref.daughterHoleId);
    return hole != null && isPlannerCreatedHole(hole);
  });
}

function motherHasPlannerDaughters(
  library: HoleLibrary,
  motherHoleId: string,
  branchProgram: BranchProgram | null
): boolean {
  if (branchRefsHavePlannerDaughters(library, branchProgram)) return true;
  return daughtersOfMother(library, motherHoleId).some(isPlannerCreatedHole);
}

function resolveMotherHoleId(
  activeHole: SavedHoleProject,
  branchProgram: BranchProgram | null
): string | undefined {
  if (activeHole.holeRole === "mother") return activeHole.holeId;
  if (activeHole.parentHoleId) return activeHole.parentHoleId;
  if (branchProgram?.mother.holeId) return branchProgram.mother.holeId;
  return undefined;
}

/**
 * Resolves how the Branch program tab should behave when the hole library
 * also contains Hole Planner metadata. Institutional planning belongs in
 * Planner; the dashboard tab stays for execution-time context.
 */
export function resolveBranchPlannerContext(
  activeHole: SavedHoleProject | null,
  library: HoleLibrary | null,
  branchProgram: BranchProgram | null
): BranchPlannerContext | null {
  if (!activeHole || !library) return null;

  const motherHoleId = resolveMotherHoleId(activeHole, branchProgram);
  const mother =
    motherHoleId != null ? findHole(library, motherHoleId) : undefined;

  const isPlannerHole = isPlannerCreatedHole(activeHole);
  const motherIsPlanner = mother != null && isPlannerCreatedHole(mother);
  const hasPlannerDaughters =
    motherHoleId != null &&
    motherHasPlannerDaughters(library, motherHoleId, branchProgram);

  const planningReadOnly =
    isPlannerHole || motherIsPlanner || hasPlannerDaughters;

  const blockBranchInit =
    activeHole.holeRole === "mother" &&
    (motherIsPlanner || hasPlannerDaughters);

  const programName =
    activeHole.plannerMeta?.programName ??
    mother?.plannerMeta?.programName ??
    branchProgram?.name;

  const plannerLinkHoleId =
    activeHole.holeRole === "daughter" && activeHole.parentHoleId
      ? activeHole.parentHoleId
      : activeHole.holeId;

  return {
    isPlannerHole,
    planningReadOnly,
    blockBranchInit,
    programName,
    plannerLinkHoleId,
    motherHoleId,
  };
}
