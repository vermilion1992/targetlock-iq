import {
  clearExecutionLockFields,
  supersedeActivePlanWithRevision,
} from "./execution-bridge";
import {
  duplicateHole,
  findHole,
  upsertHole,
  type HoleLibrary,
} from "./hole-library";
import { isPlannerCreatedHole, plannerStatus } from "./planner-status";
import type { PlannerPlanStatus } from "./planner-types";
import type { SavedHoleProject } from "./storage";

const REVISION_SOURCE_STATUSES: PlannerPlanStatus[] = [
  "approved",
  "active",
  "completed",
];

export function canEditPlannerPlan(hole: SavedHoleProject): boolean {
  if (!isPlannerCreatedHole(hole)) return true;
  const status = plannerStatus(hole);
  return status === "draft" || status === "planned";
}

export function plannerPlanEditBlockedReason(
  hole: SavedHoleProject
): string | null {
  if (!isPlannerCreatedHole(hole)) return null;
  const status = plannerStatus(hole);
  if (status === "archived") {
    return `Plan "${hole.holeName}" is archived and cannot be edited.`;
  }
  if (status === "approved" || status === "active" || status === "completed") {
    return `This plan is ${status}. Create a revision to change it.`;
  }
  return null;
}

export function assertPlannerPlanEditable(hole: SavedHoleProject): void {
  const reason = plannerPlanEditBlockedReason(hole);
  if (reason) throw new Error(reason);
}

export type CreatePlannerRevisionOpts = {
  reason?: string;
  newHoleName?: string;
  createdAt?: string;
  carryActualRecords?: boolean;
};

export type CreatePlannerRevisionResult = {
  library: HoleLibrary;
  revisionHole: SavedHoleProject;
  sourceHole: SavedHoleProject;
};

export type PlanRevisionLineage = {
  root: SavedHoleProject | null;
  previous: SavedHoleProject[];
  current: SavedHoleProject;
  next: SavedHoleProject | null;
};

export function formatRevisionLineageSummary(
  library: HoleLibrary,
  holeId: string
): string | undefined {
  const lineage = buildPlanRevisionLineage(library, holeId);
  if (!lineage) return undefined;
  const parts: string[] = [];
  if (lineage.previous.length > 0) {
    parts.push(
      `Prior: ${lineage.previous.map((h) => `${h.holeName} R${h.plannerMeta?.planRevision ?? 1}`).join(" → ")}`
    );
  }
  parts.push(
    `Current: ${lineage.current.holeName} R${lineage.current.plannerMeta?.planRevision ?? 1}`
  );
  if (lineage.next) {
    parts.push(
      `Next: ${lineage.next.holeName} R${lineage.next.plannerMeta?.planRevision ?? "?"}`
    );
  }
  return parts.length > 1 || lineage.next ? parts.join(" | ") : undefined;
}

export function buildPlanRevisionLineage(
  library: HoleLibrary,
  holeId: string
): PlanRevisionLineage | null {
  const current = findHole(library, holeId);
  if (!current?.plannerMeta) return null;

  const previous: SavedHoleProject[] = [];
  const seen = new Set<string>([holeId]);
  let cursor = current.plannerMeta.previousRevisionHoleId;
  while (cursor && !seen.has(cursor)) {
    const prev = findHole(library, cursor);
    if (!prev) break;
    previous.push(prev);
    seen.add(cursor);
    cursor = prev.plannerMeta?.previousRevisionHoleId;
  }

  const root =
    previous.length > 0 ? previous[previous.length - 1]! : current;
  const nextId = current.plannerMeta.nextRevisionHoleId;
  const next = nextId ? findHole(library, nextId) ?? null : null;

  return { root, previous, current, next };
}

export function createPlannerRevision(
  library: HoleLibrary,
  sourceHoleId: string,
  opts: CreatePlannerRevisionOpts = {}
): CreatePlannerRevisionResult | null {
  const source = findHole(library, sourceHoleId);
  if (!source?.plannerMeta) return null;
  if (!isPlannerCreatedHole(source)) return null;

  const sourceStatus = plannerStatus(source);
  if (sourceStatus === "archived") return null;
  if (!REVISION_SOURCE_STATUSES.includes(sourceStatus)) return null;

  const now = opts.createdAt ?? new Date().toISOString();
  let workingLib = library;

  if (sourceStatus === "active") {
    const superseded = supersedeActivePlanWithRevision(workingLib, sourceHoleId);
    if (superseded) workingLib = superseded;
  }

  const refreshedSource = findHole(workingLib, sourceHoleId);
  if (!refreshedSource?.plannerMeta) return null;

  const revisionNum = (refreshedSource.plannerMeta.planRevision ?? 1) + 1;
  const name =
    opts.newHoleName?.trim() || `${refreshedSource.holeName} R${revisionNum}`;
  const duped = duplicateHole(workingLib, sourceHoleId, name);
  if (!duped) return null;

  const copy = duped.holes.find((h) => h.holeName === name);
  if (!copy) return null;

  const clearedMeta = clearExecutionLockFields({
    ...copy.plannerMeta!,
    status: "draft",
    planRevision: revisionNum,
    previousRevisionHoleId: sourceHoleId,
    parentPlanId:
      refreshedSource.plannerMeta.parentPlanId ?? refreshedSource.holeId,
    revisionReason: opts.reason?.trim() || undefined,
    nextRevisionHoleId: undefined,
    approvedBy: undefined,
    approvedAt: undefined,
    approvalSnapshot: undefined,
    completionSnapshot: undefined,
    plannedAt: now,
  });

  const revisionHole: SavedHoleProject = {
    ...copy,
    history: [],
    actualRecords: opts.carryActualRecords
      ? copy.actualRecords
      : copy.actualRecords.length
        ? [copy.actualRecords[0]!]
        : [],
    plannerMeta: clearedMeta,
    updatedAt: now,
  };

  let nextLib = upsertHole(duped, revisionHole);

  const sourceWithLink = findHole(nextLib, sourceHoleId);
  if (!sourceWithLink?.plannerMeta) return null;

  const linkedSource: SavedHoleProject = {
    ...sourceWithLink,
    plannerMeta: {
      ...sourceWithLink.plannerMeta,
      nextRevisionHoleId: revisionHole.holeId,
      ...(sourceStatus === "active"
        ? {
            executionStatus: {
              ...sourceWithLink.plannerMeta.executionStatus,
              state: "revised" as const,
              revisedAt: now,
              revisedToHoleId: revisionHole.holeId,
            },
          }
        : {}),
    },
    updatedAt: now,
  };

  nextLib = upsertHole(nextLib, linkedSource);
  nextLib = { ...nextLib, activeHoleId: library.activeHoleId };

  const savedRevision = findHole(nextLib, revisionHole.holeId);
  const savedSource = findHole(nextLib, sourceHoleId);
  if (!savedRevision || !savedSource) return null;

  return {
    library: nextLib,
    revisionHole: savedRevision,
    sourceHole: savedSource,
  };
}
