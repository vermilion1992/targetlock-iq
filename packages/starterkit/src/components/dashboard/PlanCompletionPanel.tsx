"use client";

import Link from "next/link";
import { round } from "@/lib/drilling/format";
import type { PlannerExecutionContext } from "@/lib/drilling/execution-bridge";
import type { SavedHoleProject } from "@/lib/drilling/storage";

const COMPLETION_CONFIRM =
  "Completion preserves the locked plan and actual surveys. Future edits should be made through a revision.";

type Props = {
  hole: SavedHoleProject;
  context: PlannerExecutionContext;
  onMarkCompleted?: () => void;
};

export function PlanCompletionPanel({
  hole,
  context,
  onMarkCompleted,
}: Props) {
  const snapshot = hole.plannerMeta?.completionSnapshot;

  if (context.status === "completed" && snapshot) {
    return (
      <article className="targetlock-panel">
        <div className="targetlock-panel-title">
          <h3>Plan completed</h3>
        </div>
        <dl className="planner-lock-dl">
          <div>
            <dt>Completed</dt>
            <dd>
              {new Date(snapshot.completedAt).toLocaleString("en-AU")}
              {snapshot.completedBy ? ` by ${snapshot.completedBy}` : ""}
            </dd>
          </div>
          <div>
            <dt>Final actual MD</dt>
            <dd>
              {snapshot.finalActualMd !== null
                ? `${round(snapshot.finalActualMd, 0)} m`
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Surveys</dt>
            <dd>{snapshot.actualSurveyCount}</dd>
          </div>
          <div>
            <dt>Final offset</dt>
            <dd>
              {snapshot.finalPlanOffsetM !== null
                ? `${round(snapshot.finalPlanOffsetM, 2)} m`
                : "—"}
            </dd>
          </div>
          {snapshot.finalTrackingStatus ? (
            <div>
              <dt>Tracking</dt>
              <dd>{snapshot.finalTrackingStatus}</dd>
            </div>
          ) : null}
        </dl>
        <Link
          href={`/targetlock/planner?holeId=${encodeURIComponent(context.holeId)}`}
          className="targetlock-btn targetlock-btn-sm"
        >
          Create revision in Planner
        </Link>
      </article>
    );
  }

  if (context.status !== "active" || !onMarkCompleted) return null;

  return (
    <article className="targetlock-panel">
      <div className="targetlock-panel-title">
        <h3>Complete plan</h3>
      </div>
      <p className="targetlock-panel-copy">{COMPLETION_CONFIRM}</p>
      <button
        type="button"
        className="targetlock-btn"
        onClick={onMarkCompleted}
      >
        Mark completed
      </button>
    </article>
  );
}
