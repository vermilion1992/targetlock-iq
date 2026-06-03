"use client";

import type { PitchHighlight, PitchStep } from "@/lib/drilling/pitch-scenario";

type Props = {
  active: boolean;
  step: PitchStep;
  stepIndex: number;
  stepCount: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  onOpenGuide: () => void;
};

export function GuideTour({
  active,
  step,
  stepIndex,
  stepCount,
  onPrev,
  onNext,
  onExit,
  onOpenGuide,
}: Props) {
  if (!active) return null;

  return (
    <div className="guide-tour pitch-walkthrough" role="region" aria-label="Guided tour">
      <div className="guide-tour-inner pitch-walkthrough-inner">
        <div className="pitch-walkthrough-progress">
          <span>
            Step {stepIndex + 1} of {stepCount}
          </span>
          <div
            className="pitch-progress-bar"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={stepCount}
            aria-valuenow={stepIndex + 1}
            aria-label={`Tour progress, step ${stepIndex + 1} of ${stepCount}`}
          >
            <div
              className="pitch-progress-fill"
              style={{ width: `${((stepIndex + 1) / stepCount) * 100}%` }}
            />
          </div>
        </div>
        <h3 className="pitch-walkthrough-title">{step.title}</h3>
        <p className="pitch-walkthrough-narrative">{step.narrative}</p>
        {step.presenterTip && (
          <p className="pitch-walkthrough-tip">
            <strong>Tip:</strong> {step.presenterTip}
          </p>
        )}
        <div className="pitch-walkthrough-actions">
          <button type="button" className="targetlock-btn" onClick={onOpenGuide}>
            Overview
          </button>
          <button
            type="button"
            className="targetlock-btn"
            onClick={onPrev}
            disabled={stepIndex === 0}
          >
            Back
          </button>
          <button
            type="button"
            className="targetlock-btn targetlock-btn-primary"
            onClick={onNext}
          >
            {stepIndex >= stepCount - 1 ? "Finish tour" : "Next"}
          </button>
          <button type="button" className="targetlock-btn" onClick={onExit}>
            End tour
          </button>
        </div>
      </div>
    </div>
  );
}

export function guideFocusClass(
  highlight: PitchHighlight | undefined,
  current: PitchHighlight | undefined,
  tourActive: boolean
): string {
  if (!tourActive || !highlight || !current || highlight !== current) return "";
  return "guide-focus pitch-highlight";
}
