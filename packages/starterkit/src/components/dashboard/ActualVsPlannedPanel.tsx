"use client";

import type { ActualVsPlannedResult } from "@/lib/drilling/actual-vs-plan";
import type { PlannerExecutionContext } from "@/lib/drilling/execution-bridge";
import { round } from "@/lib/drilling/format";

type Props = {
  result: ActualVsPlannedResult;
  context: PlannerExecutionContext;
};

const STATUS_LABEL: Record<ActualVsPlannedResult["status"], string> = {
  "no-locked-plan": "No locked plan",
  "not-started": "Not started",
  "on-plan": "On plan",
  watch: "Watch",
  "off-plan": "Off plan",
  "review-plan": "Review plan",
};

export function ActualVsPlannedPanel({ result, context }: Props) {
  if (result.status === "no-locked-plan") return null;

  return (
    <article className="targetlock-panel planner-avp-panel">
      <div className="targetlock-panel-title">
        <h3>Actual vs locked plan</h3>
        <span
          className={`planner-avp-badge planner-avp-badge--${result.status} planner-avp-severity--${result.severity}`}
        >
          {STATUS_LABEL[result.status]}
        </span>
      </div>
      <p className="targetlock-panel-copy">{result.summary}</p>
      <p className="targetlock-helper planner-avp-reminder">
        Compared against locked planner snapshot R{context.planRevision}, not the
        editable current plan.
      </p>
      <dl className="planner-lock-dl">
        <div>
          <dt>Latest actual MD</dt>
          <dd>
            {result.latestActualMd !== null
              ? `${round(result.latestActualMd, 0)} m`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Planned TD</dt>
          <dd>
            {result.plannedTd !== null ? `${round(result.plannedTd, 0)} m` : "—"}
          </dd>
        </div>
        <div>
          <dt>Progress</dt>
          <dd>{result.progressPct !== null ? `${result.progressPct}%` : "—"}</dd>
        </div>
        <div>
          <dt>Offset from locked plan</dt>
          <dd>
            {result.latestPlanOffsetM !== null
              ? `${round(result.latestPlanOffsetM, 2)} m`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Latest actual DLS</dt>
          <dd>
            {result.latestActualDls !== null
              ? `${round(result.latestActualDls, 2)}°/30m`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Planned DLS at MD</dt>
          <dd>
            {result.latestPlannedDls !== null
              ? `${round(result.latestPlannedDls, 2)}°/30m`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Dip delta vs locked</dt>
          <dd>
            {result.latestDipDeltaDeg !== null
              ? `${round(result.latestDipDeltaDeg, 2)}°`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Azimuth delta vs locked</dt>
          <dd>
            {result.latestAzimuthDeltaDeg !== null
              ? `${round(result.latestAzimuthDeltaDeg, 2)}°`
              : "—"}
          </dd>
        </div>
      </dl>
      {result.warnings.length ? (
        <ul className="planner-avp-warnings">
          {result.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
