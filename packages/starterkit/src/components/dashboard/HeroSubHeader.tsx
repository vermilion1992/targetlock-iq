"use client";

import type { ReactNode } from "react";

type Props = {
  kicker: string;
  title: ReactNode;
  meta?: ReactNode;
};

/** Settings-style sub-header: blue kicker, title, optional meta, vertical blue accent. */
export function HeroSubHeader({ kicker, title, meta }: Props) {
  return (
    <header className="targetlock-settings-form-card-head targetlock-hero-sub-header">
      <div className="targetlock-form-card-head-text">
        <p className="targetlock-settings-form-card-kicker">{kicker}</p>
        <h3 className="targetlock-settings-form-card-title">{title}</h3>
      </div>
      {meta ?? null}
    </header>
  );
}
