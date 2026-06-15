"use client";

import type { PlannerGuideStep } from "@/lib/drilling/planner-guide-flow";

type Props = {
  active: boolean;
  step: PlannerGuideStep;
  stepIndex: number;
  stepCount: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  /** Restarts the tour from the first step. */
  onRestart: () => void;
};

/** Bottom tour panel for the planner — reuses the dashboard guide styling. */
export function PlannerGuideTour({
  active,
  step,
  stepIndex,
  stepCount,
  onPrev,
  onNext,
  onExit,
  onRestart,
}: Props) {
  if (!active) return null;

  return (
    <div
      className="guide-tour pitch-walkthrough"
      role="region"
      aria-label="Planner guided tour"
    >
      <div className="guide-tour-inner pitch-walkthrough-inner">
        <button
          type="button"
          className="guide-tour-close"
          onClick={onExit}
          aria-label="Exit tour"
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className="pitch-walkthrough-progress">
          <span>
            Planner tour · Step {stepIndex + 1} of {stepCount}
          </span>
          <div
            className="pitch-progress-bar"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={stepCount}
            aria-valuenow={stepIndex + 1}
            aria-label={`Planner tour progress, step ${stepIndex + 1} of ${stepCount}`}
          >
            <div
              className="pitch-progress-fill"
              style={{ width: `${((stepIndex + 1) / stepCount) * 100}%` }}
            />
          </div>
        </div>
        <h3 className="pitch-walkthrough-title">{step.title}</h3>
        <dl className="guide-tour-fields">
          <div className="guide-tour-field">
            <dt>Purpose</dt>
            <dd>{step.purpose}</dd>
          </div>
          <div className="guide-tour-field">
            <dt>Look at</dt>
            <dd>{step.lookAt}</dd>
          </div>
          <div className="guide-tour-field">
            <dt>Why it matters</dt>
            <dd>{step.whyItMatters}</dd>
          </div>
        </dl>
        {step.caution ? (
          <p className="guide-tour-caution" role="note">
            <strong>Note:</strong> {step.caution}
          </p>
        ) : null}
        <div className="pitch-walkthrough-actions guide-tour-actions">
          <div className="guide-tour-actions-context">
            <button type="button" className="targetlock-btn" onClick={onRestart}>
              Restart tour
            </button>
          </div>
          <div className="guide-tour-actions-nav">
            <button
              type="button"
              className="targetlock-btn"
              onClick={onPrev}
              disabled={stepIndex === 0}
            >
              Previous
            </button>
            <button
              type="button"
              className="targetlock-btn targetlock-btn-primary guide-tour-next"
              onClick={onNext}
            >
              {stepIndex >= stepCount - 1 ? "Finish tour" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
