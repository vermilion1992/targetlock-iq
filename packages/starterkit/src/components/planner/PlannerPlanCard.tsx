"use client";

import type {
  PlannerHoleQaSummary,
  PlannerHoleSummary,
} from "@/lib/drilling/planner-types";
import type { PlannerPlanAction } from "./PlannerPlanTable";
import { PlannerQaBadge } from "./PlannerQaBadge";
import { PlannerStatusBadge } from "./PlannerStatusBadge";

type Props = {
  row: PlannerHoleSummary;
  selected?: boolean;
  qaBadge?: PlannerHoleQaSummary["badge"];
  onSelect: (holeId: string) => void;
  onAction: (holeId: string, action: PlannerPlanAction) => void;
};

function planTypeLabel(type: PlannerHoleSummary["planType"]): string {
  if (type === "daughter") return "Daughter";
  if (type === "import") return "Import";
  return "Standard";
}

export function PlannerPlanCard({
  row,
  selected,
  qaBadge,
  onSelect,
  onAction,
}: Props) {
  return (
    <article
      className={`planner-plan-card targetlock-panel${selected ? " selected" : ""}`}
      onClick={() => onSelect(row.holeId)}
    >
      <div className="planner-plan-card-header">
        <h3>{row.holeName}</h3>
        <div className="planner-plan-card-badges">
          {qaBadge ? <PlannerQaBadge badge={qaBadge} /> : null}
          <PlannerStatusBadge status={row.status} />
        </div>
      </div>
      <dl className="planner-plan-card-meta">
        <div>
          <dt>Type</dt>
          <dd>{planTypeLabel(row.planType)}</dd>
        </div>
        <div>
          <dt>Program</dt>
          <dd>{row.programName ?? "Unassigned"}</dd>
        </div>
        <div>
          <dt>Collar / KO</dt>
          <dd>{row.collarOrKickoff}</dd>
        </div>
        <div>
          <dt>Planned TD</dt>
          <dd>{row.plannedTd !== null ? `${row.plannedTd.toFixed(0)} m` : "—"}</dd>
        </div>
        <div>
          <dt>Stations</dt>
          <dd>{row.stationCount}</dd>
        </div>
      </dl>
      {row.warnings.length ? (
        <p className="planner-plan-card-warnings">{row.warnings[0]}</p>
      ) : null}
      <div className="planner-plan-card-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="targetlock-btn targetlock-btn-secondary"
          onClick={() => onAction(row.holeId, "open")}
        >
          Open
        </button>
        <button
          type="button"
          className="targetlock-btn targetlock-btn-sm"
          onClick={() => onAction(row.holeId, "review")}
        >
          Review
        </button>
      </div>
    </article>
  );
}
