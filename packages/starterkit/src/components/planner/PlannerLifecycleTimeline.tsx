"use client";

import { buildPlanRevisionLineage } from "@/lib/drilling/plan-revision";
import type { HoleLibrary } from "@/lib/drilling/hole-library";
import { plannerStatus } from "@/lib/drilling/planner-status";
import type { PlannerPlanStatus } from "@/lib/drilling/planner-types";
import type { SavedHoleProject } from "@/lib/drilling/storage";
import { PlannerSubPanel } from "./ui/PlannerSubPanel";

const LIFECYCLE_STEPS: PlannerPlanStatus[] = [
  "draft",
  "planned",
  "approved",
  "active",
  "completed",
];

type Props = {
  library: HoleLibrary;
  hole: SavedHoleProject | null;
  onSelectHole?: (holeId: string) => void;
};

function stepDate(hole: SavedHoleProject, step: PlannerPlanStatus): string | null {
  const meta = hole.plannerMeta;
  if (!meta) return null;
  switch (step) {
    case "planned":
      return meta.plannedAt ?? null;
    case "approved":
      return meta.approvedAt ?? null;
    case "active":
      return meta.activatedAt ?? meta.activatedFromPlannerAt ?? null;
    case "completed":
      return (
        meta.completionSnapshot?.completedAt ?? meta.completedAt ?? null
      );
    default:
      return null;
  }
}

function formatStepDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-AU");
}

export function PlannerLifecycleTimeline({
  library,
  hole,
  onSelectHole,
}: Props) {
  if (!hole?.plannerMeta) return null;

  const status = plannerStatus(hole);
  const revision = hole.plannerMeta.planRevision ?? 1;
  const lineage = buildPlanRevisionLineage(library, hole.holeId);
  const currentIdx = LIFECYCLE_STEPS.indexOf(
    status === "archived" ? "completed" : status
  );

  return (
    <PlannerSubPanel
      kicker="Track"
      title="Lifecycle"
      className="planner-lifecycle-timeline"
      meta={<span className="planner-lifecycle-revision">R{revision}</span>}
    >
      <ol className="planner-lifecycle-steps">
        {LIFECYCLE_STEPS.map((step, idx) => {
          const reached = currentIdx >= idx || status === "archived";
          const active = status === step;
          const date = stepDate(hole, step);
          return (
            <li
              key={step}
              className={`planner-lifecycle-step${reached ? " planner-lifecycle-step--reached" : ""}${active ? " planner-lifecycle-step--active" : ""}`}
            >
              <span className="planner-lifecycle-step-label">{step}</span>
              {date ? (
                <span className="planner-lifecycle-step-date">
                  {formatStepDate(date)}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {status === "archived" ? (
        <p className="targetlock-panel-copy">Archived</p>
      ) : null}
      {lineage && (lineage.previous.length > 0 || lineage.next) ? (
        <div className="planner-lifecycle-lineage">
          <p className="targetlock-panel-copy">Revision lineage</p>
          <ul className="planner-revision-list">
            {[...lineage.previous].reverse().map((item) => (
              <li key={item.holeId}>
                {onSelectHole ? (
                  <button
                    type="button"
                    className="planner-lineage-link"
                    onClick={() => onSelectHole(item.holeId)}
                  >
                    {item.holeName} (R{item.plannerMeta?.planRevision ?? 1})
                  </button>
                ) : (
                  <span>
                    {item.holeName} (R{item.plannerMeta?.planRevision ?? 1})
                  </span>
                )}
              </li>
            ))}
            <li>
              <strong>
                {hole.holeName} (R{revision}) — current
              </strong>
            </li>
            {lineage.next ? (
              <li>
                {onSelectHole ? (
                  <button
                    type="button"
                    className="planner-lineage-link"
                    onClick={() => onSelectHole(lineage.next!.holeId)}
                  >
                    → {lineage.next.holeName} (R
                    {lineage.next.plannerMeta?.planRevision ?? "?"})
                  </button>
                ) : (
                  <span>
                    → {lineage.next.holeName} (R
                    {lineage.next.plannerMeta?.planRevision ?? "?"})
                  </span>
                )}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </PlannerSubPanel>
  );
}
