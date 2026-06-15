"use client";

import type { ReactNode } from "react";

type Props = {
  label?: string;
  children: ReactNode;
  compact?: boolean;
};

export function PlannerActionGroup({ label, children, compact }: Props) {
  return (
    <div
      className={`planner-action-group${compact ? " planner-action-group--compact" : ""}`}
    >
      {label ? <span className="planner-action-group-label">{label}</span> : null}
      <div className="targetlock-btn-row">{children}</div>
    </div>
  );
}
