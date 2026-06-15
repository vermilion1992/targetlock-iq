"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  as?: "h2" | "h3";
};

export function TargetLockSectionHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  badge,
  as: Heading = "h2",
}: Props) {
  return (
    <header className="targetlock-section-header">
      <div className="targetlock-section-header-text">
        {eyebrow ? (
          <span className="targetlock-section-header-eyebrow">{eyebrow}</span>
        ) : null}
        <div className="targetlock-panel-title">
          <Heading>{title}</Heading>
          {badge}
        </div>
        {subtitle ? (
          <p className="targetlock-panel-copy targetlock-section-header-copy">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="targetlock-section-header-actions">{actions}</div> : null}
    </header>
  );
}
