"use client";

import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  copy: ReactNode;
  meta?: ReactNode;
  /** Action buttons rendered on the right of the hero (e.g. exports, create). */
  actions?: ReactNode;
};

export function AdvancedTabHero({ eyebrow, title, copy, meta, actions }: Props) {
  return (
    <header className="targetlock-settings-hero">
      <div>
        <p className="targetlock-settings-hero-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="targetlock-settings-hero-copy">{copy}</p>
      </div>
      {meta || actions ? (
        <div className="targetlock-settings-hero-meta">
          {meta}
          {actions ? (
            <div className="targetlock-settings-hero-actions">{actions}</div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
