"use client";

import type { ReactNode } from "react";
import { PlannerSectionHeader } from "./PlannerSectionHeader";

type Props = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  as?: "h2" | "h3";
  className?: string;
  children: ReactNode;
};

export function PlannerPanel({
  title,
  subtitle,
  actions,
  badge,
  as,
  className,
  children,
}: Props) {
  return (
    <article className={`targetlock-panel planner-panel${className ? ` ${className}` : ""}`}>
      {title ? (
        <PlannerSectionHeader
          title={title}
          subtitle={subtitle}
          actions={actions}
          badge={badge}
          as={as ?? "h2"}
        />
      ) : null}
      {children}
    </article>
  );
}
