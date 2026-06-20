"use client";

import { useState } from "react";
import { buildPlanRevisionLineage } from "@/lib/drilling/plan-revision";
import type { HoleLibrary } from "@/lib/drilling/hole-library";
import type { SavedHoleProject } from "@/lib/drilling/storage";
import { PlannerStatusBadge } from "./PlannerStatusBadge";
import { PlannerSubPanel } from "./ui/PlannerSubPanel";

type Props = {
  library: HoleLibrary;
  hole: SavedHoleProject | null;
  onCreateRevision: (reason?: string) => void;
  onSelectHole?: (holeId: string) => void;
};

export function PlannerRevisionPanel({
  library,
  hole,
  onCreateRevision,
  onSelectHole,
}: Props) {
  const [reason, setReason] = useState("");

  if (!hole?.plannerMeta) {
    return (
      <PlannerSubPanel kicker="Track" title="Revisions" className="planner-side-panel">
        <p className="targetlock-panel-copy">
          Select a saved plan to view revision history.
        </p>
      </PlannerSubPanel>
    );
  }

  const lineage = buildPlanRevisionLineage(library, hole.holeId);
  const revision = hole.plannerMeta.planRevision ?? 1;
  const chain = lineage
    ? [...lineage.previous, lineage.current]
    : [hole];

  return (
    <PlannerSubPanel kicker="Track" title="Revisions" className="planner-side-panel">
      <p className="targetlock-panel-copy">
        Current revision: <strong>R{revision}</strong>
      </p>
      {chain.length > 1 || lineage?.next ? (
        <ul className="planner-revision-list">
          {chain.map((item) => (
            <li key={item.holeId}>
              {onSelectHole && item.holeId !== hole.holeId ? (
                <button
                  type="button"
                  className="planner-lineage-link"
                  onClick={() => onSelectHole(item.holeId)}
                >
                  {item.holeName}
                </button>
              ) : (
                <span>{item.holeName}</span>
              )}
              <PlannerStatusBadge status={item.plannerMeta?.status ?? "draft"} />
            </li>
          ))}
          {lineage?.next ? (
            <li>
              {onSelectHole ? (
                <button
                  type="button"
                  className="planner-lineage-link"
                  onClick={() => onSelectHole(lineage.next!.holeId)}
                >
                  → {lineage.next.holeName}
                </button>
              ) : (
                <span>→ {lineage.next.holeName}</span>
              )}
              <PlannerStatusBadge
                status={lineage.next.plannerMeta?.status ?? "draft"}
              />
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="targetlock-panel-copy">No prior revisions linked.</p>
      )}
      <label className="targetlock-field">
        <span>Revision reason (optional)</span>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this revision needed?"
        />
      </label>
      <button
        type="button"
        className="targetlock-btn targetlock-btn-secondary"
        onClick={() => onCreateRevision(reason.trim() || undefined)}
      >
        Create revision
      </button>
    </PlannerSubPanel>
  );
}
