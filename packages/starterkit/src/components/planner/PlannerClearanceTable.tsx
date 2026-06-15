"use client";

import type { PlannerClearancePair } from "@/lib/drilling/planner-types";

type Props = {
  pairs: PlannerClearancePair[];
  selectedPairKey?: string | null;
  onSelectPair: (pair: PlannerClearancePair) => void;
  onViewOnMap: (pair: PlannerClearancePair) => void;
};

function pairKey(pair: PlannerClearancePair): string {
  return `${pair.holeAId}:${pair.holeBId}:${pair.relationship}`;
}

const SEVERITY_CLASS: Record<string, string> = {
  risk: "planner-clearance-row--risk",
  watch: "planner-clearance-row--watch",
};

export function PlannerClearanceTable({
  pairs,
  selectedPairKey,
  onSelectPair,
  onViewOnMap,
}: Props) {
  const flagged = pairs.filter((p) => p.severity !== "ok");

  if (!flagged.length) {
    return (
      <p className="targetlock-panel-copy">
        No clearance risks detected for this program.
      </p>
    );
  }

  return (
    <div className="planner-table-wrap">
      <table className="planner-table planner-clearance-table">
        <thead>
          <tr>
            <th>Hole A</th>
            <th>Hole B</th>
            <th>Relationship</th>
            <th>Min dist (m)</th>
            <th>Sep factor</th>
            <th>MD A</th>
            <th>MD B</th>
            <th>Severity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {flagged.map((pair) => {
            const key = pairKey(pair);
            return (
              <tr
                key={key}
                className={[
                  SEVERITY_CLASS[pair.severity] ?? "",
                  selectedPairKey === key ? "selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onSelectPair(pair)}
              >
                <td>{pair.holeAName}</td>
                <td>{pair.holeBName}</td>
                <td>{pair.relationship}</td>
                <td>{pair.minDistanceM.toFixed(1)}</td>
                <td>
                  {pair.separationFactor != null
                    ? pair.separationFactor.toFixed(1)
                    : "—"}
                </td>
                <td>{pair.mdA.toFixed(0)}</td>
                <td>{pair.mdB.toFixed(0)}</td>
                <td>
                  <span className={`planner-qa-badge planner-qa-badge--${pair.severity}`}>
                    {pair.severity}
                  </span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="targetlock-link-btn"
                    onClick={() => onViewOnMap(pair)}
                  >
                    View on Map
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {flagged.map((pair) => (
        <p key={`${pairKey(pair)}-msg`} className="planner-clearance-message">
          {pair.message}
        </p>
      ))}
    </div>
  );
}
