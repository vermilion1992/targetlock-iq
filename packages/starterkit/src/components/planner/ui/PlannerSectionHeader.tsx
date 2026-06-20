"use client";

import { TargetLockSectionHeader } from "@/components/targetlock/TargetLockSectionHeader";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  as?: "h2" | "h3";
  accent?: boolean;
};

export function PlannerSectionHeader(props: Props) {
  return <TargetLockSectionHeader {...props} />;
}