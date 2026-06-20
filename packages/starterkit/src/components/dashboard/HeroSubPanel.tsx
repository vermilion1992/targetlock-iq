"use client";

import type { ReactNode } from "react";
import { HeroSubHeader } from "@/components/dashboard/HeroSubHeader";

type Props = {
  /** Small blue uppercase label above the title. */
  kicker: string;
  title: ReactNode;
  meta?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

/**
 * Settings-style sub-panel: a white card whose head uses the shared
 * HeroSubHeader (blue kicker + vertical blue accent), matching the dashboard
 * Action plan / chart panels and the hole planner reference sections.
 */
export function HeroSubPanel({
  kicker,
  title,
  meta,
  className,
  bodyClassName,
  children,
}: Props) {
  return (
    <article
      className={`targetlock-settings-form-card${className ? ` ${className}` : ""}`}
    >
      <HeroSubHeader kicker={kicker} title={title} meta={meta} />
      <div
        className={`targetlock-settings-form-card-body${
          bodyClassName ? ` ${bodyClassName}` : ""
        }`}
      >
        {children}
      </div>
    </article>
  );
}
