"use client";

import { useState } from "react";
import { round } from "@/lib/drilling/format";
import type { PlannerCompletionSnapshot } from "@/lib/drilling/planner-types";
import type { SavedHoleProject } from "@/lib/drilling/storage";

type Props = {
  hole: SavedHoleProject;
  disabled?: boolean;
  onComplete: (completedBy: string, notes?: string) => void;
  onCreateRevision?: () => void;
};

const COMPLETION_CONFIRM =
  "Completion preserves the locked plan and actual surveys. Future edits should be made through a revision.";

function CompletedSummary({
  snapshot,
  hole,
  onCreateRevision,
}: {
  snapshot: PlannerCompletionSnapshot;
  hole: SavedHoleProject;
  onCreateRevision?: () => void;
}) {
  return (
    <>
      <p className="targetlock-panel-copy">
        {hole.holeName} was marked completed. Locked plan and actual surveys are
        preserved.
      </p>
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
          <dt>Survey count</dt>
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
            <dt>Tracking status</dt>
            <dd>{snapshot.finalTrackingStatus}</dd>
          </div>
        ) : null}
        {hole.plannerMeta?.executionStatus?.completionNotes ? (
          <div>
            <dt>Notes</dt>
            <dd>{hole.plannerMeta.executionStatus.completionNotes}</dd>
          </div>
        ) : null}
      </dl>
      {onCreateRevision ? (
        <button
          type="button"
          className="targetlock-btn targetlock-btn-ghost"
          onClick={onCreateRevision}
        >
          Create revision
        </button>
      ) : null}
    </>
  );
}

export function PlannerCompletionPanel({
  hole,
  disabled,
  onComplete,
  onCreateRevision,
}: Props) {
  const [completedBy, setCompletedBy] = useState("Field");
  const [notes, setNotes] = useState("");
  const status = hole.plannerMeta?.status;
  const snapshot = hole.plannerMeta?.completionSnapshot;

  if (status === "completed" && snapshot) {
    return (
      <article className="targetlock-panel">
        <div className="targetlock-panel-title">
          <h3>Plan completed</h3>
        </div>
        <CompletedSummary
          snapshot={snapshot}
          hole={hole}
          onCreateRevision={onCreateRevision}
        />
      </article>
    );
  }

  if (status !== "active") return null;

  const handleComplete = () => {
    if (!window.confirm(COMPLETION_CONFIRM)) return;
    onComplete(completedBy.trim(), notes.trim() || undefined);
  };

  return (
    <article className="targetlock-panel">
      <div className="targetlock-panel-title">
        <h3>Mark plan completed</h3>
      </div>
      <p className="targetlock-panel-copy">{COMPLETION_CONFIRM}</p>
      <label className="targetlock-field">
        <span>Completed by</span>
        <input
          type="text"
          value={completedBy}
          onChange={(e) => setCompletedBy(e.target.value)}
          disabled={disabled}
        />
      </label>
      <label className="targetlock-field">
        <span>Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          disabled={disabled}
        />
      </label>
      <button
        type="button"
        className="targetlock-btn"
        disabled={disabled || !completedBy.trim()}
        onClick={handleComplete}
      >
        Mark completed
      </button>
    </article>
  );
}
