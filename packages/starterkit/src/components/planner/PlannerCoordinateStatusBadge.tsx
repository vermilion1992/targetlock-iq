"use client";

import type { PlannerCoordinateStatus } from "@/lib/drilling/planner-types";

type Props = {
  status: PlannerCoordinateStatus;
};

export function PlannerCoordinateStatusBadge({ status }: Props) {
  return (
    <span className={`planner-coord-status planner-coord-status--${status}`}>
      {status}
    </span>
  );
}
