"use client";

import Link from "next/link";
import type { PlannerExecutionContext } from "@/lib/drilling/execution-bridge";
import { truncatePlanHash } from "@/lib/drilling/plan-lock";

type Props = {
  context: PlannerExecutionContext;
};

export function PlanLockStatusPanel({ context }: Props) {
  return (
    <article className="targetlock-panel planner-lock-panel">
      <div className="targetlock-panel-title">
        <h3>Plan lock status</h3>
      </div>
      <dl className="planner-lock-dl">
        <div>
          <dt>Status</dt>
          <dd>{context.lockLabel}</dd>
        </div>
        <div>
          <dt>Detail</dt>
          <dd>{context.lockDetail}</dd>
        </div>
        {context.lockedAt ? (
          <div>
            <dt>Locked at</dt>
            <dd>{new Date(context.lockedAt).toLocaleString("en-AU")}</dd>
          </div>
        ) : null}
        {context.lockedPlanHash ? (
          <div>
            <dt>Plan hash</dt>
            <dd>
              <code>{truncatePlanHash(context.lockedPlanHash, 16)}</code>
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Approval</dt>
          <dd>{context.approvalLabel}</dd>
        </div>
        {context.planDrifted ? (
          <p className="planner-review-qa-blocker">
            Current plan differs from the locked execution snapshot.
          </p>
        ) : null}
      </dl>
      <Link
        href={`/targetlock/planner?holeId=${encodeURIComponent(context.holeId)}`}
        className="targetlock-btn targetlock-btn-sm"
      >
        Create revision in Planner
      </Link>
    </article>
  );
}
