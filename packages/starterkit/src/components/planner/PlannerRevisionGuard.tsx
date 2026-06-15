"use client";

type Props = {
  blockedReason: string;
  onCreateRevision?: () => void;
};

export function PlannerRevisionGuard({ blockedReason, onCreateRevision }: Props) {
  return (
    <article className="targetlock-panel planner-revision-guard">
      <div className="targetlock-panel-title">
        <h3>Plan protected</h3>
      </div>
      <p className="targetlock-panel-copy">{blockedReason}</p>
      {onCreateRevision ? (
        <button
          type="button"
          className="targetlock-btn"
          onClick={onCreateRevision}
        >
          Create revision
        </button>
      ) : null}
    </article>
  );
}
