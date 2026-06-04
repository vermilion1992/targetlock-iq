"use client";

import { resolveGuideTab } from "@/lib/drilling/guide-flows";
import type { AdvancedTab, GuideStep } from "@/lib/drilling/guide-types";

const TAB_LABELS: Record<AdvancedTab, string> = {
  trajectory: "Trajectory",
  "branch-program": "Branch program",
  steering: "Steering feasibility",
  qaqc: "QA/QC",
  decisions: "Decisions",
  math: "Math reference",
  "method-purpose": "Method & Purpose",
  roadmap: "Roadmap",
  validation: "Validation",
  setup: "Setup / assumptions",
};

type Props = {
  active: boolean;
  step: GuideStep;
  stepIndex: number;
  stepCount: number;
  flowTitle?: string;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  onRestart: () => void;
  onOpenGuideCenter: () => void;
  onOpenTab?: () => void;
  onLoadDemo?: () => void;
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
  onRestart,
  onOpenGuideCenter,
  onOpenTab,
  onLoadDemo,
}: Props) {
  if (!active) return null;

  const tab = resolveGuideTab(step);
  const tabLabel = tab ? TAB_LABELS[tab] : null;

  return (
    <div className="guide-tour pitch-walkthrough" role="region" aria-label="Guided walkthrough">
      <div className="guide-tour-inner pitch-walkthrough-inner">
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
          <button type="button" className="targetlock-btn" onClick={onOpenGuideCenter}>
            Guide center
          </button>
          {tabLabel && onOpenTab ? (
            <button type="button" className="targetlock-btn" onClick={onOpenTab}>
              Open {tabLabel}
            </button>
          ) : null}
          {step.demoAction && onLoadDemo ? (
            <button type="button" className="targetlock-btn" onClick={onLoadDemo}>
              {step.demoAction.label}
            </button>
          ) : null}
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
            className="targetlock-btn targetlock-btn-primary"
            onClick={onNext}
          >
            {stepIndex >= stepCount - 1 ? "Finish guide" : "Next"}
          </button>
          <button type="button" className="targetlock-btn" onClick={onRestart}>
            Restart
          </button>
          <button type="button" className="targetlock-btn" onClick={onExit}>
            Exit guide
          </button>
        </div>
      </div>
    </div>
  );
}
