"use client";

import Link from "next/link";
import type { PlannerExecutionContext } from "@/lib/drilling/execution-bridge";

type Props = {
  context: PlannerExecutionContext;
  completedAt?: string;
  onMarkCompleted?: () => void;
};

const VARIANT_CLASS: Record<PlannerExecutionContext["bannerVariant"], string> = {
  "approved-active": "planner-exec-banner--ok",
  "stale-approval": "planner-exec-banner--warn",
  "no-approval": "planner-exec-banner--warn",
  "plan-changed": "planner-exec-banner--danger",
  "drilling-locked": "planner-exec-banner--info",
  "no-lock": "planner-exec-banner--warn",
  completed: "planner-exec-banner--muted",
};

function formatQaSummary(context: PlannerExecutionContext): string | null {
  const parts: string[] = [];
  if (context.qaHardErrorCount > 0) {
    parts.push(`${context.qaHardErrorCount} hard error(s)`);
  }
  if (context.qaWarningCount > 0) {
    parts.push(`${context.qaWarningCount} warning(s)`);
  }
  if (context.qaClearanceRiskCount > 0) {
    parts.push(`${context.qaClearanceRiskCount} clearance risk(s)`);
  }
  return parts.length ? parts.join(", ") : null;
}

export function PlannerExecutionBanner({
  context,
  completedAt,
  onMarkCompleted,
}: Props) {
  const approver =
    context.approvedBy && context.approvedAt
      ? `${context.approvedBy}, ${new Date(context.approvedAt).toLocaleDateString("en-AU")}`
      : "Not approved";

  const lockedDate = context.lockedAt
    ? new Date(context.lockedAt).toLocaleDateString("en-AU")
    : null;

  const qaSummary = formatQaSummary(context);

  return (
    <div
      className={`planner-exec-banner ${VARIANT_CLASS[context.bannerVariant]}`}
      role="status"
    >
      <div className="planner-exec-banner-main">
        <strong>
          {context.status === "completed" ? "Completed" : context.specStatusLabel}
        </strong>
        <span className="planner-exec-banner-sep">·</span>
        <span>R{context.planRevision}</span>
        {context.status === "completed" && completedAt ? (
          <>
            <span className="planner-exec-banner-sep">·</span>
            <span>
              {new Date(completedAt).toLocaleDateString("en-AU")}
            </span>
          </>
        ) : null}
        {lockedDate ? (
          <>
            <span className="planner-exec-banner-sep">·</span>
            <span>Locked {lockedDate}</span>
          </>
        ) : null}
        <span className="planner-exec-banner-sep">·</span>
        <span title={context.approvalDetail}>Approved: {approver}</span>
        {qaSummary ? (
          <>
            <span className="planner-exec-banner-sep">·</span>
            <span>QA: {qaSummary}</span>
          </>
        ) : null}
      </div>
      <div className="planner-exec-banner-actions">
        <Link
          href={`/targetlock/planner?holeId=${encodeURIComponent(context.holeId)}`}
          className="targetlock-btn targetlock-btn-sm"
        >
          Open Planner Review
        </Link>
        {context.status === "active" && onMarkCompleted ? (
          <button
            type="button"
            className="targetlock-btn targetlock-btn-sm targetlock-btn-ghost"
            onClick={onMarkCompleted}
          >
            Mark completed
          </button>
        ) : null}
      </div>
    </div>
  );
}
