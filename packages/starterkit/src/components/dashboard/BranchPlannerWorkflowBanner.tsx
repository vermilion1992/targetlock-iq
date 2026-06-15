"use client";

import Link from "next/link";
import type { BranchPlannerContext } from "@/lib/drilling/planner-branch-context";

type Props = {
  context: BranchPlannerContext;
  variant?: "panel" | "compact";
};

export function BranchPlannerWorkflowBanner({
  context,
  variant = "panel",
}: Props) {
  const plannerHref = `/targetlock/planner?holeId=${encodeURIComponent(context.plannerLinkHoleId)}`;
  const programLabel = context.programName?.trim() || "this program";

  return (
    <div
      className={`branch-planner-workflow-banner branch-planner-workflow-banner--${variant}`}
      role="note"
    >
      <div className="branch-planner-workflow-banner-main">
        <strong>Plan in Hole Planner · execute here</strong>
        <p>
          {context.planningReadOnly
            ? `Targets and daughter plans for ${programLabel} are managed in Hole Planner. Use this tab for live kickoff ranking, program maps, and daughter surveying.`
            : `For institutional program planning (QA, clearance, approval, exports), use Hole Planner. This tab is for execution-time branch context on the rig.`}
        </p>
      </div>
      <div className="branch-planner-workflow-banner-actions">
        <Link href={plannerHref} className="targetlock-btn targetlock-btn-sm">
          Open in Hole Planner
        </Link>
      </div>
    </div>
  );
}
