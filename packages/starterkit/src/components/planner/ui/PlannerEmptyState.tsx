"use client";

import type { ReactNode } from "react";

type Props = {
  title?: string;
  message: string;
  actions?: ReactNode;
};

export function PlannerEmptyState({ title, message, actions }: Props) {
  return (
    <div className="planner-empty-state" role="status">
      {title ? <strong className="planner-empty-state-title">{title}</strong> : null}
      <p className="targetlock-panel-copy">{message}</p>
      {actions ? <div className="planner-empty-state-actions">{actions}</div> : null}
    </div>
  );
}
