"use client";

import { InfoTip } from "@/components/layout/InfoTip";
import { round } from "@/lib/drilling/format";
import {
  ACTION_PLAN_PANEL_TIP,
  actionGuidanceTip,
  changeFromLatestSurveyLabel,
  formatRecoveryActionDisplay,
  NEXT_INTERVAL_AIM_HEADING,
  nextCheckDepthMd,
  nextIntervalAimExplainer,
  nextIntervalAimTooltip,
} from "@/lib/drilling/action-plan-copy";
import {
  actionSentence,
  azimuthInstruction,
  dipInstruction,
} from "@/lib/drilling/recommendation";
import type { SteeringFeasibility } from "@/lib/drilling/steering-types";
import type { Recommendation } from "@/lib/drilling/types";

type Props = {
  recommendation: Recommendation | null;
  steering: SteeringFeasibility | null;
};

function actionClass(action: string): string {
  switch (action) {
    case "On track":
      return "action-on-track";
    case "Watch":
    case "Shorten interval":
      return "action-watch";
    case "Correct now":
    case "Correction advisable":
      return "action-correct";
    case "Steering review":
      return "action-steer";
    default:
      return "action-risk";
  }
}

function InstructionChip({
  delta,
  text,
}: {
  delta: number;
  text: string;
}) {
  const hold = !Number.isFinite(delta) || Math.abs(delta) < 0.05;
  const variant = hold
    ? "hold"
    : delta < 0
      ? "drop"
      : "lift";
  const arrow = hold ? "→" : delta < 0 ? "↘" : "↗";
  return (
    <div className={`targetlock-instruction-chip instruction-${variant}`}>
      <span className="targetlock-instruction-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="targetlock-instruction-text">{text}</span>
    </div>
  );
}

function AzimuthChip({
  delta,
  text,
}: {
  delta: number;
  text: string;
}) {
  const hold = !Number.isFinite(delta) || Math.abs(delta) < 0.05;
  const variant = hold ? "hold" : delta < 0 ? "left" : "right";
  const arrow = hold ? "→" : delta < 0 ? "↰" : "↱";
  return (
    <div className={`targetlock-instruction-chip instruction-${variant}`}>
      <span className="targetlock-instruction-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="targetlock-instruction-text">{text}</span>
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
}: Props) {
  if (!recommendation) {
    return (
      <article className="targetlock-panel targetlock-action-plan">
        <div className="targetlock-panel-title">
          <h2>
            Action plan{" "}
            <InfoTip tip={ACTION_PLAN_PANEL_TIP} />
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

  const internalAction = steering?.simple.currentAction ?? recommendation.classification.label;
  const currentAction = formatRecoveryActionDisplay(
    internalAction,
    steering?.bestMethodId
  );
  const bestMethod = steering?.simple.bestMethod;
  const escalation = steering?.simple.escalation;
  const nextAimTip = nextIntervalAimTooltip(recommendation, steering);
  const changeLabel = changeFromLatestSurveyLabel(
    recommendation.dipChange,
    recommendation.aziChange
  );
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
          <InfoTip tip={ACTION_PLAN_PANEL_TIP} />
        </h2>
        <span className="targetlock-mini-tag">
          {recommendation.classification.confidence} confidence
        </span>
      </div>

      <div className={`targetlock-action-hero ${actionClass(currentAction)}`}>
        <div className="targetlock-action-hero-head">
          <span className="targetlock-action-hero-label">Current action</span>
          <strong className="targetlock-action-hero-value">
            {currentAction}
          </strong>
        </div>
        {bestMethod ? (
          <div className="targetlock-action-hero-method">
            {bestMethod}{" "}
            <InfoTip tip={actionGuidanceTip(internalAction)} />
          </div>
        ) : null}
      </div>

      <div className="targetlock-instruction targetlock-action-instruction">
        <span className="targetlock-instruction-label">
          {NEXT_INTERVAL_AIM_HEADING}
          <InfoTip tip={nextAimTip} />
        </span>
        <p className="targetlock-instruction-explainer">
          {nextIntervalAimExplainer(recommendation.target.nextInterval)}
        </p>
        <span className="targetlock-instruction-sublabel">Change from latest survey</span>
        <div className="targetlock-instruction-chips">
          <InstructionChip
            delta={recommendation.dipChange}
            text={dipInstruction(recommendation.dipChange)}
          />
          <AzimuthChip
            delta={recommendation.aziChange}
            text={azimuthInstruction(recommendation.aziChange)}
          />
        </div>
      </div>

      <div className="targetlock-metrics-strip targetlock-action-metrics">
        <div className="targetlock-metrics-strip-grid" role="group" aria-label="Aim and risk metrics">
          <MetricCell
            label="Dip aim for next interval"
            amount={`${round(recommendation.aimDip, 1)}°`}
          />
          <MetricCell
            label="Azimuth aim for next interval"
            amount={`${round(recommendation.aimAzimuth, 1)}°`}
          />
          <MetricCell
            label="Next check depth"
            amount={nextCheckDepthMd(
              recommendation.current.md,
              recommendation.target.nextInterval
            )}
            tip="Depth to resurvey after drilling the next interval — then update TargetLock with the new station."
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
        <p className="targetlock-metric-change-detail">{changeLabel}</p>
      </div>

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
