"use client";

import type { ExecutionAuditReport } from "@/lib/drilling/execution-audit";
import { round } from "@/lib/drilling/format";
import { truncatePlanHash } from "@/lib/drilling/plan-lock";

type Props = {
  audit: ExecutionAuditReport;
};

export function ExecutionAuditPanel({ audit }: Props) {
  return (
    <article className="targetlock-panel execution-audit-panel">
      <div className="targetlock-panel-title">
        <h3>Execution audit</h3>
        <span className={`planner-status-badge planner-status-badge--${audit.status}`}>
          {audit.status}
        </span>
      </div>
      <dl className="planner-lock-dl">
        <div>
          <dt>Lock status</dt>
          <dd>{audit.lockStatus}</dd>
        </div>
        <div>
          <dt>Approval</dt>
          <dd>
            {audit.approvedBy
              ? `${audit.approvedBy}${audit.approvedAt ? ` (${new Date(audit.approvedAt).toLocaleDateString("en-AU")})` : ""}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Execution state</dt>
          <dd>{audit.executionState}</dd>
        </div>
        <div>
          <dt>Latest actual MD</dt>
          <dd>
            {audit.latestActualMd !== null
              ? `${round(audit.latestActualMd, 0)} m`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Survey count</dt>
          <dd>{audit.actualSurveyCount}</dd>
        </div>
        <div>
          <dt>Latest tracking</dt>
          <dd>{audit.latestTrackingStatus ?? "—"}</dd>
        </div>
        <div>
          <dt>Completion</dt>
          <dd>
            {audit.completedAt
              ? `${audit.completedBy ?? "Field"} — ${new Date(audit.completedAt).toLocaleString("en-AU")}`
              : "In progress"}
          </dd>
        </div>
        {audit.lockedPlanHash ? (
          <div>
            <dt>Locked hash</dt>
            <dd>
              <code>{truncatePlanHash(audit.lockedPlanHash, 12)}</code>
            </dd>
          </div>
        ) : null}
        {audit.revisionLineage ? (
          <div>
            <dt>Revision lineage</dt>
            <dd className="execution-audit-lineage">{audit.revisionLineage}</dd>
          </div>
        ) : null}
      </dl>
      {audit.warnings.length > 0 ? (
        <ul className="execution-audit-warnings">
          {audit.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      <p className="targetlock-helper">
        {audit.events.length} audit event{audit.events.length === 1 ? "" : "s"} recorded.
      </p>
    </article>
  );
}
