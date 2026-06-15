"use client";

import type { HoleLibrary } from "@/lib/drilling/hole-library";
import { resolvePlannerApprovalStatus } from "@/lib/drilling/planner-approval";
import { canApprovePlannerHole } from "@/lib/drilling/planner-qa";
import { plannerStatus } from "@/lib/drilling/planner-status";
import type { SavedHoleProject } from "@/lib/drilling/storage";
import type { PlannerTab } from "./PlannerShell";

type Props = {
  hole: SavedHoleProject | null;
  library: HoleLibrary;
  onTabChange: (tab: PlannerTab) => void;
  onOpenApprove: () => void;
  onMarkActiveAndOpen: () => void;
  onOpenTargetLock: () => void;
  onCreateRevision: () => void;
  onArchive: () => void;
  onExportPackage?: () => void;
};

export function PlannerReviewActionsPanel({
  hole,
  library,
  onTabChange,
  onOpenApprove,
  onMarkActiveAndOpen,
  onOpenTargetLock,
  onCreateRevision,
  onArchive,
  onExportPackage,
}: Props) {
  if (!hole) {
    return (
      <article className="targetlock-panel planner-side-panel">
        <div className="targetlock-panel-title">
          <h3>Decisions</h3>
        </div>
        <p className="targetlock-panel-copy">
          Select a plan from Plans or finish creating a plan to review and approve.
        </p>
      </article>
    );
  }

  const status = plannerStatus(hole);
  const validation = resolvePlannerApprovalStatus(hole, library);
  const approvalGate = canApprovePlannerHole(hole, library);
  const canApproveNow =
    (status === "planned" || (status === "approved" && validation.state === "stale")) &&
    approvalGate.allowed;

  return (
    <article className="targetlock-panel planner-side-panel">
      <div className="targetlock-panel-title">
        <h3>Decisions</h3>
        <span
          className={`planner-approval-badge planner-approval-badge--${validation.state}`}
        >
          {validation.label}
        </span>
      </div>
      <p className="targetlock-panel-copy">{validation.detail}</p>

      <div className="targetlock-btn-row planner-review-decision-actions">
        {canApproveNow ? (
          <button
            type="button"
            className="targetlock-btn targetlock-btn-primary"
            onClick={onOpenApprove}
          >
            {validation.state === "stale" ? "Re-approve plan" : "Approve plan"}
          </button>
        ) : null}
        {status === "approved" ? (
          <button
            type="button"
            className="targetlock-btn targetlock-btn-primary"
            onClick={onMarkActiveAndOpen}
          >
            Mark active &amp; open TargetLock
          </button>
        ) : null}
        {(status === "active" || status === "completed") ? (
          <button
            type="button"
            className="targetlock-btn"
            onClick={onOpenTargetLock}
          >
            Open in TargetLock
          </button>
        ) : null}
        <button type="button" className="targetlock-btn" onClick={onCreateRevision}>
          Create revision
        </button>
        {onExportPackage && hole.planRecords.length ? (
          <button type="button" className="targetlock-btn" onClick={onExportPackage}>
            Export package
          </button>
        ) : null}
        {status !== "archived" ? (
          <button
            type="button"
            className="targetlock-btn targetlock-btn-danger"
            onClick={onArchive}
          >
            Archive plan
          </button>
        ) : null}
      </div>

      <p className="targetlock-helper">
        Exports and reports are in the{" "}
        <button
          type="button"
          className="planner-inline-link"
          onClick={() => onTabChange("package")}
        >
          Package tab
        </button>
        .
      </p>
    </article>
  );
}
