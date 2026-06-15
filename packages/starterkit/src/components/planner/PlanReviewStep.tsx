"use client";

import { resolveTargetEnu } from "@/lib/drilling/coordinate-system";
import { round } from "@/lib/drilling/format";
import type { PlannerDraft } from "@/lib/drilling/planner-types";

type Props = {
  draft: PlannerDraft;
};

export function PlanReviewStep({ draft }: Props) {
  const finalMd = draft.planRecords.at(-1)?.md;
  const targetResolved = resolveTargetEnu(draft);

  return (
    <article className="targetlock-panel planner-step-panel">
      <div className="targetlock-panel-title">
        <h2>Plan summary</h2>
      </div>

      <dl className="planner-review-grid">
        <div>
          <dt>Project</dt>
          <dd>{draft.projectName || "—"}</dd>
        </div>
        <div>
          <dt>Hole</dt>
          <dd>{draft.holeName || "—"}</dd>
        </div>
        <div>
          <dt>Plan type</dt>
          <dd>{draft.planType}</dd>
        </div>
        <div>
          <dt>Collar</dt>
          <dd>
            {draft.collar
              ? `E ${draft.collar.easting.toFixed(1)}  N ${draft.collar.northing.toFixed(1)}  RL ${draft.collar.elevation.toFixed(1)}`
              : draft.planType === "daughter"
                ? "From kickoff"
                : draft.coordinateMode === "collar-relative"
                  ? "Local origin"
                  : "—"}
          </dd>
        </div>
        <div>
          <dt>Target (local)</dt>
          <dd>
            E {targetResolved.e.toFixed(1)}  N {targetResolved.n.toFixed(1)}  D{" "}
            {targetResolved.d.toFixed(1)} m
          </dd>
        </div>
        <div>
          <dt>Coordinate mode</dt>
          <dd>{draft.coordinateMode}</dd>
        </div>
        <div>
          <dt>North reference</dt>
          <dd>{draft.northReference}</dd>
        </div>
        <div>
          <dt>Planned MD</dt>
          <dd>{finalMd !== undefined ? `${round(finalMd, 0)} m` : "—"}</dd>
        </div>
        <div>
          <dt>Station count</dt>
          <dd>{draft.planRecords.length}</dd>
        </div>
        <div>
          <dt>Max DLS limit</dt>
          <dd>{draft.constraints.maxDls}° / 30 m</dd>
        </div>
      </dl>

      {draft.warnings.length > 0 ? (
        <div className="planner-warnings-block" role="status">
          <h3>Warnings</h3>
          <ul>
            {draft.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="targetlock-panel-copy">No warnings — review values before publishing.</p>
      )}
    </article>
  );
}
