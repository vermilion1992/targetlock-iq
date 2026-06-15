"use client";

import type { HoleLibrary } from "@/lib/drilling/hole-library";
import { getPlannerStatusDisplay } from "@/lib/drilling/planner-status-display";
import type { PlannerPlanStatus } from "@/lib/drilling/planner-types";

type Props = {
  status: PlannerPlanStatus;
  library?: HoleLibrary;
  holeId?: string;
};

export function PlannerStatusBadge({ status, library, holeId }: Props) {
  if (library && holeId) {
    const hole = library.holes.find((h) => h.holeId === holeId);
    if (hole) {
      const display = getPlannerStatusDisplay(hole, library);
      return (
        <span
          className={`planner-status-badge ${display.cssClass}`}
          title={display.description}
        >
          {display.label}
        </span>
      );
    }
  }

  const fallbackClass: Record<PlannerPlanStatus, string> = {
    draft: "planner-status-badge--draft",
    planned: "planner-status-badge--planned",
    approved: "planner-status-badge--approved",
    active: "planner-status-badge--active",
    completed: "planner-status-badge--completed",
    archived: "planner-status-badge--archived",
  };

  const fallbackLabel: Record<PlannerPlanStatus, string> = {
    draft: "Draft",
    planned: "Planned",
    approved: "Approved",
    active: "Active",
    completed: "Completed",
    archived: "Archived",
  };

  return (
    <span className={`planner-status-badge ${fallbackClass[status]}`}>
      {fallbackLabel[status]}
    </span>
  );
}
