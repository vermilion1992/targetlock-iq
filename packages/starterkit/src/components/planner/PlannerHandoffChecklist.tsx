"use client";

import { useMemo, useState } from "react";
import type { HoleLibrary } from "@/lib/drilling/hole-library";
import {
  buildOpenInTargetLockSummary,
  evaluateHandoffReadiness,
} from "@/lib/drilling/planner-handoff";
import { plannerStatus } from "@/lib/drilling/planner-status";
import type { SavedHoleProject } from "@/lib/drilling/storage";
import { PlannerStatusBadge } from "./PlannerStatusBadge";
import { PlannerSubPanel } from "./ui/PlannerSubPanel";

type Props = {
  hole: SavedHoleProject | null;
  library: HoleLibrary;
  onMarkActiveAndOpen: () => void;
  disabled?: boolean;
};

export function PlannerHandoffChecklist({
  hole,
  library,
  onMarkActiveAndOpen,
  disabled,
}: Props) {
  const [coordinateReviewed, setCoordinateReviewed] = useState(false);
  const [coordinateWarningsReviewed, setCoordinateWarningsReviewed] = useState(false);
  const [packageExported, setPackageExported] = useState(false);
  const [bypassApproval, setBypassApproval] = useState(false);
  const [bypassSignoff, setBypassSignoff] = useState(false);

  const readiness = useMemo(() => {
    if (!hole) return null;
    return evaluateHandoffReadiness(hole, library, {
      coordinateMetadataReviewed: coordinateReviewed,
      coordinateWarningsReviewed: coordinateWarningsReviewed,
      packageBackupExported: packageExported,
      handoffBypassApproval: bypassApproval,
      handoffBypassSignoffNote: bypassSignoff,
    });
  }, [
    hole,
    library,
    coordinateReviewed,
    coordinateWarningsReviewed,
    packageExported,
    bypassApproval,
    bypassSignoff,
  ]);

  const handleCopySummary = async () => {
    if (!hole) return;
    const text = buildOpenInTargetLockSummary(hole, library);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!hole) {
    return (
      <PlannerSubPanel
        kicker="Handoff"
        title="Handoff checklist"
        className="planner-side-panel"
      >
        <p className="targetlock-panel-copy">
          Select a plan to review handoff readiness.
        </p>
      </PlannerSubPanel>
    );
  }

  const status = plannerStatus(hole);

  return (
    <PlannerSubPanel
      kicker="Handoff"
      title={`Handoff — ${hole.holeName}`}
      className="planner-side-panel planner-handoff-checklist"
      meta={
        <span
          className={`planner-handoff-ready planner-handoff-ready--${readiness?.ready ? "yes" : "no"}`}
        >
          {readiness?.ready ? "Ready" : "Blocked"}
        </span>
      }
    >
      <p className="targetlock-panel-copy">
        Status: <PlannerStatusBadge status={status} />
      </p>

      <ul className="planner-handoff-items">
        {readiness?.items.map((item) => (
          <li
            key={item.id}
            className={`planner-check-item planner-check-item--${item.passed ? "pass" : "fail"}`}
          >
            <span className="planner-check-item-label">
              {item.passed ? "✓" : "○"} {item.label}
              {!item.required ? " (recommended)" : ""}
            </span>
            {item.detail ? (
              <span className="planner-check-item-detail">{item.detail}</span>
            ) : null}
          </li>
        ))}
      </ul>

      <label className="planner-handoff-checkbox">
        <input
          type="checkbox"
          checked={coordinateReviewed}
          onChange={(e) => setCoordinateReviewed(e.target.checked)}
        />
        Coordinate metadata reviewed
      </label>

      {readiness?.items.some((i) => i.id === "coordinate_warnings" && i.required) ? (
        <label className="planner-handoff-checkbox planner-handoff-checkbox--warn">
          <input
            type="checkbox"
            checked={coordinateWarningsReviewed}
            onChange={(e) => setCoordinateWarningsReviewed(e.target.checked)}
          />
          Coordinate warnings reviewed
        </label>
      ) : null}

      <label className="planner-handoff-checkbox">
        <input
          type="checkbox"
          checked={packageExported}
          onChange={(e) => setPackageExported(e.target.checked)}
        />
        Hole package exported (backup)
      </label>

      <label className="planner-handoff-checkbox planner-handoff-checkbox--warn">
        <input
          type="checkbox"
          checked={bypassApproval}
          onChange={(e) => setBypassApproval(e.target.checked)}
        />
        Bypass approval requirement (intentional)
      </label>

      <label className="planner-handoff-checkbox planner-handoff-checkbox--warn">
        <input
          type="checkbox"
          checked={bypassSignoff}
          onChange={(e) => setBypassSignoff(e.target.checked)}
        />
        Bypass sign-off note requirement
      </label>

      <div className="planner-handoff-actions">
        <button
          type="button"
          className="targetlock-btn targetlock-btn-secondary"
          disabled={disabled}
          onClick={handleCopySummary}
        >
          Copy handoff summary
        </button>
        <button
          type="button"
          className="targetlock-btn targetlock-btn-primary"
          disabled={disabled || !readiness?.ready || status !== "approved"}
          onClick={onMarkActiveAndOpen}
        >
          Mark active and open
        </button>
      </div>

      {!readiness?.ready && readiness?.blockers.length ? (
        <p className="targetlock-panel-copy planner-handoff-hint">
          {readiness.blockers[0]}
        </p>
      ) : status !== "approved" ? (
        <p className="targetlock-panel-copy planner-handoff-hint">
          Approve the plan before marking it active for drilling.
        </p>
      ) : null}
    </PlannerSubPanel>
  );
}
