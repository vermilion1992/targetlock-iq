"use client";

import type { HoleModeAssessment } from "@/lib/drilling/hole-mode";

type Props = {
  assessment: HoleModeAssessment | null;
};

const DIRECTIONAL_LIMITATIONS =
  "TargetLock IQ does not currently calculate gravity toolface, magnetic toolface, motor yield, or directional-tool control settings. It provides trajectory decision support only. Near-vertical holes should be reviewed by the directional driller, supervisor, and site survey/geology team.";

export function HoleModeAdvisoryPanel({ assessment }: Props) {
  if (!assessment || assessment.severity === "normal") return null;

  const levelClass =
    assessment.severity === "risk" ? "caution" : "repeat_survey_recommended";

  return (
    <div
      className={`targetlock-survey-assessment targetlock-survey-assessment--${levelClass}`}
      role="status"
    >
      <div className="targetlock-survey-assessment-head">
        <span className="targetlock-survey-assessment-level">
          {assessment.mode === "near-vertical"
            ? "Near-vertical hole advisory"
            : "High-angle watch"}
        </span>
      </div>
      <p className="targetlock-survey-assessment-note">{assessment.message}</p>
      {assessment.mode === "near-vertical" ? (
        <p className="targetlock-survey-assessment-note targetlock-hole-mode-footnote">
          {DIRECTIONAL_LIMITATIONS}
        </p>
      ) : null}
    </div>
  );
}
