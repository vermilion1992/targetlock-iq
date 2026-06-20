"use client";

import { HoleModeAdvisoryPanel } from "@/components/dashboard/HoleModeAdvisoryPanel";
import { HeroSubHeader } from "@/components/dashboard/HeroSubHeader";
import { InfoTip } from "@/components/layout/InfoTip";
import { round } from "@/lib/drilling/format";
import {
  ACTION_PLAN_HEADER_KICKER,
  ACTION_PLAN_PANEL_TIP,
  actionGuidanceTip,
  formatRecoveryActionDisplay,
  NEXT_INTERVAL_AIM_HEADING,
  nextCheckDepthMd,
  nextIntervalAimExplainer,
  nextIntervalAimTooltip,
} from "@/lib/drilling/action-plan-copy";
import {
  azimuthInstruction,
  dipInstruction,
} from "@/lib/drilling/recommendation";
import type { RecoveryAction, SteeringFeasibility } from "@/lib/drilling/steering-types";
import type { SteeringPolicyMatch } from "@/lib/drilling/steering-settings";
import type { HoleModeAssessment } from "@/lib/drilling/hole-mode";
import type { Recommendation } from "@/lib/drilling/types";

type Props = {
  recommendation: Recommendation | null;
  steering: SteeringFeasibility | null;
  holeModeAssessment?: HoleModeAssessment | null;
  steeringPolicy?: SteeringPolicyMatch | null;
};

function actionClass(action: RecoveryAction | string): string {
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
    case "Steering review recommended":
      return "action-steer";
    case "Supervisor review":
    case "Supervisor review required":
      return "action-supervisor";
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

function ActionPlanHeader({ confidenceLabel }: { confidenceLabel?: string | null }) {
  return (
    <HeroSubHeader
      kicker={ACTION_PLAN_HEADER_KICKER}
      title={
        <>
          Action plan <InfoTip tip={ACTION_PLAN_PANEL_TIP} />
        </>
      }
      meta={
        confidenceLabel ? (
          <span className="targetlock-mini-tag">{confidenceLabel} confidence</span>
        ) : null
      }
    />
  );
}

export function ActionPlanPanel({
  recommendation,
  steering,
  holeModeAssessment,
  steeringPolicy,
}: Props) {
  if (!recommendation) {
    return (
      <article className="targetlock-settings-form-card targetlock-action-plan">
        <ActionPlanHeader />
        <div className="targetlock-settings-form-card-body">
          <div className="targetlock-empty">
            <p className="targetlock-empty-title">No survey data yet</p>
            <p className="targetlock-empty-text">
              Load a planned trajectory and actual surveys — or press <strong>Load sample</strong>{" "}
              — to generate the action plan.
            </p>
          </div>
        </div>
      </article>
    );
  }

  const internalAction = (steering?.simple.currentAction ??
    recommendation.classification.label) as RecoveryAction;
  const currentAction = formatRecoveryActionDisplay(
    internalAction,
    steering?.bestMethodId
  );
  const defaultGuidance = steering?.simple.bestMethod?.trim() ?? "";
  const ruleGuidance = steeringPolicy?.message?.trim() ?? "";
  const actionGuidance = ruleGuidance || defaultGuidance;
  const nextAimTip = nextIntervalAimTooltip(recommendation, steering);
  const missDetail =
    recommendation.miss <= recommendation.tolerance
      ? `Inside ${round(recommendation.tolerance, 1)} m envelope`
      : `Tolerance ${round(recommendation.tolerance, 1)} m`;
  const dlsAmount = Number.isFinite(recommendation.dlsRequired)
    ? `${round(recommendation.dlsRequired, 2)}°`
    : "--";
  const confidenceLabel =
    holeModeAssessment && holeModeAssessment.mode !== "angle" && steering?.recoveryConfidence
      ? steering.recoveryConfidence
      : recommendation.classification.confidence;

  const nextIntervalM =
    steeringPolicy?.nextIntervalM ?? recommendation.target.nextInterval;

  return (
    <article className="targetlock-settings-form-card targetlock-action-plan">
      <ActionPlanHeader confidenceLabel={confidenceLabel} />

      <div className="targetlock-settings-form-card-body">
      <HoleModeAdvisoryPanel assessment={holeModeAssessment ?? null} />

      <div className={`targetlock-action-hero ${actionClass(internalAction)}`}>
        <div className="targetlock-action-hero-head">
          <span className="targetlock-action-hero-label">Current action</span>
          <strong className="targetlock-action-hero-value">
            {currentAction}
          </strong>
        </div>
        {steeringPolicy ? (
          <p className="targetlock-action-hero-rule">
            Steering rule — {steeringPolicy.ruleLabel}
          </p>
        ) : null}
        {actionGuidance ? (
          <div className="targetlock-action-hero-method">
            {actionGuidance}{" "}
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
          {nextIntervalAimExplainer(nextIntervalM)}
        </p>
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
            amount={nextCheckDepthMd(recommendation.current.md, nextIntervalM)}
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
      </div>
      </div>
    </article>
  );
}
