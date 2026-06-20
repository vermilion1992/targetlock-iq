"use client";

import { PlannerStepCard } from "./PlannerStepCard";

type Props = {
  disabled: boolean;
  onSave: () => void;
  onSaveAndReview: () => void;
};

export function PlannerActions({ disabled, onSave, onSaveAndReview }: Props) {
  return (
    <PlannerStepCard
      kicker="Handoff"
      title="Save plan"
      copy="Save the planned hole with the collar and target coordinates entered in this workflow. Review readiness and approve before handoff to TargetLock."
    >
      <div className="targetlock-settings-form-actions">
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
    </PlannerStepCard>
  );
}
