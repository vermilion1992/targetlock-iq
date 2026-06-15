"use client";

import Link from "next/link";
import type { ActualVsPlannedResult } from "@/lib/drilling/actual-vs-plan";
import type { PlannerExecutionContext } from "@/lib/drilling/execution-bridge";
import { round } from "@/lib/drilling/format";
import { PlannerStatusBadge } from "./PlannerStatusBadge";

type Props = {
  context: PlannerExecutionContext;
  actualVsPlanned: ActualVsPlannedResult;
};

export function PlannerExecutionStatusPanel({
  context,
  actualVsPlanned,
}: Props) {
  return (
    <article className="targetlock-panel">
      <div className="targetlock-panel-title">
        <h3>Field execution</h3>
        <PlannerStatusBadge status={context.status} />
      </div>
      <dl className="planner-lock-dl">
        <div>
          <dt>Execution state</dt>
          <dd>{context.executionState}</dd>
        </div>
        <div>
          <dt>Lock status</dt>
          <dd>{context.lockLabel}</dd>
        </div>
        <div>
          <dt>Actual surveys</dt>
          <dd>{actualVsPlanned.actualSurveyCount}</dd>
        </div>
        <div>
          <dt>Latest actual MD</dt>
          <dd>
            {actualVsPlanned.drilledMd !== null
              ? `${round(actualVsPlanned.drilledMd, 0)} m`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Latest offset</dt>
          <dd>
            {actualVsPlanned.latestOffset !== null
              ? `${round(actualVsPlanned.latestOffset, 2)} m`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Tracking status</dt>
          <dd>
            <span className={`planner-avp-badge planner-avp-badge--${actualVsPlanned.status}`}>
              {actualVsPlanned.status === "on-plan"
                ? "On plan"
                : actualVsPlanned.status === "not-started"
                  ? "Not started"
                  : actualVsPlanned.status === "watch"
                    ? "Watch"
                    : actualVsPlanned.status === "off-plan"
                      ? "Off plan"
                      : actualVsPlanned.status === "review-plan"
                        ? "Review plan"
                        : actualVsPlanned.status}
            </span>
          </dd>
        </div>
      </dl>
      <Link href="/targetlock" className="targetlock-btn targetlock-btn-sm">
        Open dashboard
      </Link>
    </article>
  );
}
