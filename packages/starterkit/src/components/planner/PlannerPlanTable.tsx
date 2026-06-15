"use client";

import type { HoleLibrary } from "@/lib/drilling/hole-library";
import { findHole } from "@/lib/drilling/hole-library";
import { evaluatePlanReadiness } from "@/lib/drilling/planner-readiness";
import { resolvePlannerApprovalStatus } from "@/lib/drilling/planner-approval";
import {
  evaluateCollarCoordinateStatus,
  evaluateTargetCoordinateStatus,
} from "@/lib/drilling/planner-coordinate-registry";
import type {
  PlannerCoordinateStatus,
  PlannerHoleQaSummary,
  PlannerHoleSummary,
} from "@/lib/drilling/planner-types";
import { PlannerQaBadge } from "./PlannerQaBadge";
import { PlannerStatusBadge } from "./PlannerStatusBadge";
import { PlannerCoordinateStatusBadge } from "./PlannerCoordinateStatusBadge";
import { PlannerEmptyState } from "./ui/PlannerEmptyState";
import { PlannerReadinessBadge } from "./ui/PlannerReadinessBadge";
import { PLANNER_ACTION_LABELS } from "@/lib/drilling/planner-status-display";

export type PlannerPlanAction =
  | "open"
  | "duplicate"
  | "revision"
  | "archive"
  | "review";

type Props = {
  rows: PlannerHoleSummary[];
  selectedHoleId?: string | null;
  qaByHoleId?: Map<string, PlannerHoleQaSummary>;
  library?: HoleLibrary;
  onSelect: (holeId: string) => void;
  onAction: (holeId: string, action: PlannerPlanAction) => void;
};

function planTypeLabel(type: PlannerHoleSummary["planType"]): string {
  if (type === "daughter") return "Daughter";
  if (type === "import") return "Import";
  return "Standard";
}

const COORD_STATUS_RANK: Record<PlannerCoordinateStatus, number> = {
  complete: 0,
  partial: 1,
  missing: 2,
};

function worstCoordinateStatus(
  a: PlannerCoordinateStatus,
  b: PlannerCoordinateStatus
): PlannerCoordinateStatus {
  return COORD_STATUS_RANK[a] >= COORD_STATUS_RANK[b] ? a : b;
}

export function PlannerPlanTable({
  rows,
  selectedHoleId,
  qaByHoleId,
  library,
  onSelect,
  onAction,
}: Props) {
  if (!rows.length) {
    return (
      <PlannerEmptyState message="No planner holes yet. Create a standard hole, daughter hole, or import a program." />
    );
  }

  return (
    <div className="targetlock-table-wrap targetlock-table-wrap--compact planner-plan-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Hole</th>
            <th>Type</th>
            <th>Status</th>
            <th>Readiness</th>
            <th>Coords</th>
            <th>QA</th>
            <th>Approval</th>
            <th>Rev</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const hole = library ? findHole(library, row.holeId) : null;
            const readiness =
              library && hole ? evaluatePlanReadiness(hole, library) : null;
            const collarCoord = hole ? evaluateCollarCoordinateStatus(hole) : null;
            const targetCoord = hole ? evaluateTargetCoordinateStatus(hole) : null;

            return (
              <tr
                key={row.holeId}
                className={selectedHoleId === row.holeId ? "selected" : undefined}
                onClick={() => onSelect(row.holeId)}
              >
                <td>
                  <strong>{row.holeName}</strong>
                  {row.warnings.length ? (
                    <span className="planner-warning-dot" title={row.warnings.join("; ")}>
                      !
                    </span>
                  ) : null}
                </td>
                <td>{planTypeLabel(row.planType)}</td>
                <td>
                  <PlannerStatusBadge
                    status={row.status}
                    library={library}
                    holeId={row.holeId}
                  />
                </td>
                <td>
                  {readiness ? (
                    <PlannerReadinessBadge
                      state={readiness.state}
                      score={readiness.score}
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {collarCoord && targetCoord ? (
                    <span
                      className="planner-coord-cell"
                      title={`Collar: ${collarCoord} · Target: ${targetCoord}`}
                    >
                      <PlannerCoordinateStatusBadge
                        status={worstCoordinateStatus(collarCoord, targetCoord)}
                      />
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {qaByHoleId?.get(row.holeId) ? (
                    <PlannerQaBadge badge={qaByHoleId.get(row.holeId)!.badge} />
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {library && hole ? (
                    <span
                      className={`planner-approval-badge planner-approval-badge--${resolvePlannerApprovalStatus(hole, library).state}`}
                    >
                      {resolvePlannerApprovalStatus(hole, library).label}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  R{row.planRevision ?? 1}
                  {row.nextRevisionHoleId ? " →" : ""}
                </td>
                <td>{new Date(row.updatedAt).toLocaleDateString()}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="planner-row-actions">
                    <button
                      type="button"
                      className="targetlock-btn targetlock-btn-sm targetlock-btn-primary"
                      onClick={() => onAction(row.holeId, "review")}
                    >
                      {PLANNER_ACTION_LABELS.review}
                    </button>
                    <select
                      className="planner-action-select"
                      defaultValue=""
                      aria-label={`More actions for ${row.holeName}`}
                      onChange={(e) => {
                        const action = e.target.value as PlannerPlanAction;
                        if (action) onAction(row.holeId, action);
                        e.target.value = "";
                      }}
                    >
                      <option value="">More…</option>
                      <option value="open">{PLANNER_ACTION_LABELS.open}</option>
                      <option value="duplicate">{PLANNER_ACTION_LABELS.duplicate}</option>
                      <option value="revision">{PLANNER_ACTION_LABELS["create-revision"]}</option>
                      {row.status !== "archived" ? (
                        <option value="archive">{PLANNER_ACTION_LABELS.archive}</option>
                      ) : null}
                    </select>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
