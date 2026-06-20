"use client";

import type { ReactNode } from "react";

type Props = {
  kicker?: string;
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  accent?: boolean;
  className?: string;
};

export function TargetLockFormCard({
  kicker,
  title,
  actions,
  children,
  accent = false,
  className,
}: Props) {
  return (
    <article
      className={`targetlock-form-card${accent ? " targetlock-form-card--accent" : ""}${className ? ` ${className}` : ""}`}
    >
      <header className="targetlock-form-card-head">
        <div className="targetlock-form-card-head-text">
          {kicker ? <p className="targetlock-form-card-kicker">{kicker}</p> : null}
          <h3 className="targetlock-form-card-title">{title}</h3>
        </div>
        {actions}
      </header>
      <div className="targetlock-form-card-body">{children}</div>
    </article>
  );
}
