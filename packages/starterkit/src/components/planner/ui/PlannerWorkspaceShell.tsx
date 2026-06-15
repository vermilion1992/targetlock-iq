"use client";

import type { ReactNode } from "react";

type Props = {
  header: ReactNode;
  nav: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function PlannerWorkspaceShell({ header, nav, children, footer }: Props) {
  return (
    <div className="planner-workspace">
      <div className="planner-workspace-body">
        <nav className="planner-workspace-nav" aria-label="Planner workflow">
          {nav}
        </nav>
        <div className="planner-workspace-center">
          {header}
          <main className="planner-main targetlock-tabpanel">{children}</main>
          {footer ? <footer className="planner-footer">{footer}</footer> : null}
        </div>
      </div>
    </div>
  );
}
