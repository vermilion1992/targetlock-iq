"use client";

type Props = {
  disabled: boolean;
  onSave: () => void;
  onSaveAndReview: () => void;
};

export function PlannerActions({ disabled, onSave, onSaveAndReview }: Props) {
  return (
    <article className="targetlock-panel planner-step-panel">
      <div className="targetlock-panel-title">
        <h2>Save plan</h2>
      </div>
      <p className="targetlock-panel-copy">
        Save the planned hole with the collar and target coordinates entered in this workflow.
        Review readiness and approve before handoff to TargetLock.
      </p>
      <div className="targetlock-btn-row">
        <button
          type="button"
          className="targetlock-btn targetlock-btn-secondary"
          disabled={disabled}
          onClick={onSave}
        >
          Save plan
        </button>
        <button
          type="button"
          className="targetlock-btn targetlock-btn-primary"
          disabled={disabled}
          onClick={onSaveAndReview}
        >
          Save and review
        </button>
      </div>
    </article>
  );
}
