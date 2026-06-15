"use client";

import type { PlannerHoleQaSummary } from "@/lib/drilling/planner-types";

type Badge = PlannerHoleQaSummary["badge"];

const LABELS: Record<Badge, string> = {
  ok: "OK",
  watch: "Watch",
  risk: "Risk",
  blocked: "Blocked",
};

const CLASS: Record<Badge, string> = {
  ok: "planner-qa-badge--ok",
  watch: "planner-qa-badge--watch",
  risk: "planner-qa-badge--risk",
  blocked: "planner-qa-badge--blocked",
};

type Props = {
  badge: Badge;
  title?: string;
};

export function PlannerQaBadge({ badge, title }: Props) {
  return (
    <span
      className={`planner-qa-badge ${CLASS[badge]}`}
      title={title}
    >
      {LABELS[badge]}
    </span>
  );
}
