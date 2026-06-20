"use client";

import type { ReactNode } from "react";
import { HeroSubHeader } from "@/components/dashboard/HeroSubHeader";

type Props = {
  kicker: string;
  title: ReactNode;
  meta?: ReactNode;
  lead?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function ChartPanel({ kicker, title, meta, lead, className, children }: Props) {
  return (
    <article
      className={`targetlock-settings-form-card targetlock-chart-panel${className ? ` ${className}` : ""}`}
    >
      <HeroSubHeader kicker={kicker} title={title} meta={meta} />
      <div className="targetlock-settings-form-card-body targetlock-chart-panel-body">
        {lead}
        {children}
      </div>
    </article>
  );
}
