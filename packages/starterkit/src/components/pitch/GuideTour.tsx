"use client";

import type { GuideStep } from "@/lib/drilling/guide-types";

type Props = {
  active: boolean;
  step: GuideStep;
  stepIndex: number;
  stepCount: number;
  flowTitle?: string;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  onOpenGuideCenter: () => void;
};

export function GuideTour({
  active,
  step,
  stepIndex,
  stepCount,
  flowTitle,
  onPrev,
  onNext,
  onExit,
  onOpenGuideCenter,
}: Props) {
  if (!active) return null;

  return (
    <div className="guide-tour pitch-walkthrough" role="region" aria-label="Guided walkthrough">
      <div className="guide-tour-inner pitch-walkthrough-inner">
        <button
          type="button"
          className="guide-tour-close"
          onClick={onExit}
          aria-label="Exit guide"
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className="pitch-walkthrough-progress">
          <span>
            {flowTitle ? `${flowTitle} · ` : ""}
            Step {stepIndex + 1} of {stepCount}
          </span>
          <div
            className="pitch-progress-bar"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={stepCount}
            aria-valuenow={stepIndex + 1}
            aria-label={`Guide progress, step ${stepIndex + 1} of ${stepCount}`}
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
            <button type="button" className="targetlock-btn" onClick={onOpenGuideCenter}>
              Guide center
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
              {stepIndex >= stepCount - 1 ? "Finish guide" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
