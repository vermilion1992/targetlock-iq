"use client";

import type { ReactNode } from "react";
import { TargetLockFormCard } from "@/components/targetlock/TargetLockFormCard";

type Props = {
  kicker: string;
  title: ReactNode;
  copy?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function PlannerStepCard({
  kicker,
  title,
  copy,
  actions,
  children,
  className,
}: Props) {
  return (
    <TargetLockFormCard
      kicker={kicker}
      title={title}
      actions={actions}
      className={`planner-step-card${className ? ` ${className}` : ""}`}
    >
      {copy ? <p className="targetlock-form-card-copy">{copy}</p> : null}
      {children}
    </TargetLockFormCard>
  );
}
