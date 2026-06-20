"use client";

import type { PlannerHoleQaSummary } from "@/lib/drilling/planner-types";
import { PlannerQaBadge } from "./PlannerQaBadge";
import { PlannerSubPanel } from "./ui/PlannerSubPanel";

type Props = {
  summaries: PlannerHoleQaSummary[];
  holeNames?: Record<string, string>;
  selectedHoleId?: string | null;
  onSelectHole: (holeId: string) => void;
};

export function PlannerDrillabilityPanel({
  summaries,
  holeNames = {},
  selectedHoleId,
  onSelectHole,
}: Props) {
  const selected = summaries.find((s) => s.holeId === selectedHoleId);

  return (
    <PlannerSubPanel
      className="planner-drillability-panel"
      kicker="QA"
      title="Drillability"
    >
      <ul className="planner-drillability-hole-list">
        {summaries.map((summary) => (
          <li key={summary.holeId}>
            <button
              type="button"
              className={`planner-drillability-hole-btn${
                selectedHoleId === summary.holeId ? " active" : ""
              }`}
              onClick={() => onSelectHole(summary.holeId)}
            >
              <span>{holeNames[summary.holeId] ?? summary.holeId}</span>
              <PlannerQaBadge badge={summary.badge} />
            </button>
          </li>
        ))}
      </ul>

      {selected ? (
        <div className="planner-drillability-issues">
          {selected.drillability.issues.length === 0 ? (
            <p className="targetlock-panel-copy">No drillability issues.</p>
          ) : (
            selected.drillability.issues.map((issue) => (
              <div
                key={`${issue.code}-${issue.message}`}
                className={`planner-drillability-issue planner-drillability-issue--${issue.level}`}
              >
                <strong>{issue.level === "error" ? "Error" : "Warning"}</strong>
                <p>{issue.message}</p>
              </div>
            ))
          )}
        </div>
      ) : (
        <p className="targetlock-panel-copy">Select a hole to view drillability checks.</p>
      )}
    </PlannerSubPanel>
  );
}
