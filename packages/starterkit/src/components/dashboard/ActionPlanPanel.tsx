"use client";

import { InfoTip } from "@/components/layout/InfoTip";
import { round } from "@/lib/drilling/format";
import {
  actionSentence,
  azimuthInstruction,
  dipInstruction,
} from "@/lib/drilling/recommendation";
import type { PlanCorridorStatus } from "@/lib/drilling/plan-corridor";
import type { SurveyUncertaintyAssessment } from "@/lib/drilling/survey-tool-profile";
import type { SteeringFeasibility } from "@/lib/drilling/steering-types";
import type { Recommendation } from "@/lib/drilling/types";

type Props = {
  recommendation: Recommendation | null;
  steering: SteeringFeasibility | null;
  corridorStatus?: PlanCorridorStatus | null;
  surveyAssessment?: SurveyUncertaintyAssessment | null;
};

function actionClass(action: string): string {
  switch (action) {
    case "On track":
      return "action-on-track";
    case "Watch":
      return "action-watch";
    case "Correct now":
      return "action-correct";
    case "Steering review":
      return "action-steer";
    default:
      return "action-risk";
  }
}

function actionGuidanceTip(action: string): string {
  switch (action) {
    case "On track":
      return "Latest survey and projected miss are within target tolerance — no correction required.";
    case "Watch":
      return "Early warning: confirm trend on the next survey before committing to a full correction.";
    case "Correct now":
      return "Off plan but recoverable within configured dogleg limits — apply the recommended aim.";
    case "Steering review":
      return "Correction likely needs directional tooling — involve supervisor or directional crew.";
    default:
      return "Smooth recovery is unlikely — review wedge, branch, or revised hole objective.";
  }
}

function InstructionChip({
  axis,
  delta,
  text,
}: {
  axis: "dip" | "azimuth";
  delta: number;
  text: string;
}) {
  const hold = !Number.isFinite(delta) || Math.abs(delta) < 0.05;
  const variant = hold
    ? "hold"
    : axis === "dip"
      ? delta < 0
        ? "drop"
        : "lift"
      : delta < 0
        ? "left"
        : "right";
  const arrow = hold ? "→" : axis === "dip" ? (delta < 0 ? "↘" : "↗") : delta < 0 ? "↰" : "↱";
  return (
    <div className={`targetlock-instruction-chip instruction-${variant}`}>
      <span className="targetlock-instruction-arrow" aria-hidden>
        {arrow}
      </span>
      <span>
        <span className="targetlock-instruction-axis">{axis}</span>
        <span className="targetlock-instruction-text">{text}</span>
      </span>
    </div>
  );
}

function MetricCell({
  label,
  amount,
  detail,
  tip,
}: {
  label: string;
  amount: string;
  detail?: string;
  tip?: string;
}) {
  return (
    <div className="targetlock-metric-cell">
      <span className="targetlock-metric-cell-label">
        {label}
        {tip ? <InfoTip tip={tip} /> : null}
      </span>
      <strong className="targetlock-metric-cell-value">{amount}</strong>
      {detail ? <span className="targetlock-metric-cell-detail">{detail}</span> : null}
    </div>
  );
}

export function ActionPlanPanel({
  recommendation,
  steering,
  corridorStatus,
  surveyAssessment,
}: Props) {
  if (!recommendation) {
    return (
      <article className="targetlock-panel targetlock-action-plan">
        <div className="targetlock-panel-title">
          <h2>
            Action plan{" "}
            <InfoTip tip="The next move for the driller: what to do, how to aim, and when to escalate." />
          </h2>
        </div>
        <div className="targetlock-empty">
          <p className="targetlock-empty-title">No survey data yet</p>
          <p className="targetlock-empty-text">
            Load a planned trajectory and actual surveys — or press <strong>Load sample</strong>{" "}
            — to generate the action plan.
          </p>
        </div>
      </article>
    );
  }

  const currentAction = steering?.simple.currentAction ?? recommendation.classification.label;
  const bestMethod = steering?.simple.bestMethod;
  const escalation = steering?.simple.escalation;
  const missDetail =
    recommendation.miss <= recommendation.tolerance
      ? `Inside ${round(recommendation.tolerance, 1)} m envelope`
      : `Tolerance ${round(recommendation.tolerance, 1)} m`;
  const dlsAmount = Number.isFinite(recommendation.dlsRequired)
    ? `${round(recommendation.dlsRequired, 2)}°`
    : "--";

  return (
    <article className="targetlock-panel targetlock-action-plan">
      <div className="targetlock-panel-title">
        <h2>
          Action plan{" "}
          <InfoTip tip="The next move for the driller: what to do, how to aim, and when to escalate. Decision support only — site approval applies." />
        </h2>
        <span className="targetlock-mini-tag">
          {recommendation.classification.confidence} confidence
        </span>
      </div>

      <div className={`targetlock-action-hero ${actionClass(currentAction)}`}>
        <div className="targetlock-action-hero-head">
          <span className="targetlock-action-hero-label">Current action</span>
          <strong className="targetlock-action-hero-value">{currentAction}</strong>
        </div>
        {bestMethod ? (
          <p className="targetlock-action-hero-method">
            {bestMethod}{" "}
            <InfoTip tip={actionGuidanceTip(currentAction)} />
          </p>
        ) : null}
      </div>

      <div className="targetlock-instruction targetlock-action-instruction">
        <span className="targetlock-instruction-label">Driller instruction</span>
        <div className="targetlock-instruction-chips">
          <InstructionChip
            axis="dip"
            delta={recommendation.dipChange}
            text={dipInstruction(recommendation.dipChange)}
          />
          <InstructionChip
            axis="azimuth"
            delta={recommendation.aziChange}
            text={azimuthInstruction(recommendation.aziChange)}
          />
        </div>
      </div>

      <div className="targetlock-metrics-strip targetlock-action-metrics">
        <div className="targetlock-metrics-strip-grid" role="group" aria-label="Aim and risk metrics">
          <MetricCell
            label="Aim dip"
            amount={`${round(recommendation.aimDip, 1)}°`}
            detail={dipInstruction(recommendation.dipChange)}
          />
          <MetricCell
            label="Aim azimuth"
            amount={`${round(recommendation.aimAzimuth, 1)}°`}
            detail={azimuthInstruction(recommendation.aziChange)}
          />
          <MetricCell
            label="DLS required"
            amount={dlsAmount}
            detail={`Limit ${round(recommendation.maxDls, 2)}° / 30 m`}
            tip="Dogleg severity needed to point at target, against the configured max DLS."
          />
          <MetricCell
            label="Projected miss"
            amount={`${round(recommendation.miss, 1)} m`}
            detail={missDetail}
          />
        </div>
      </div>

      {(corridorStatus?.outsidePlannedCorridor ||
        (surveyAssessment && surveyAssessment.confidenceLevel !== "normal")) && (
        <div className="targetlock-action-advisory simple-only" role="status">
          {corridorStatus?.outsidePlannedCorridor
            ? corridorStatus.simpleNotes.map((note) => (
                <p key={note} className="targetlock-action-advisory-line">
                  {note}
                </p>
              ))
            : null}
          {surveyAssessment && surveyAssessment.confidenceLevel !== "normal" ? (
            <p className="targetlock-action-advisory-line">
              {surveyAssessment.recommendationNote}
            </p>
          ) : null}
        </div>
      )}

      <div className="targetlock-action-footer">
        {escalation ? (
          <p className="targetlock-action-escalation">
            <span className="targetlock-action-escalation-label">
              Escalate by{" "}
              <InfoTip tip="Depth by which to involve a supervisor or directional crew if the hole has not recovered. Estimated from current drift and DLS limits." />
            </span>
            {escalation}
          </p>
        ) : null}
        <p className={`targetlock-action-text action-${recommendation.classification.className}`}>
          {actionSentence(recommendation)}
        </p>
      </div>
    </article>
  );
}
