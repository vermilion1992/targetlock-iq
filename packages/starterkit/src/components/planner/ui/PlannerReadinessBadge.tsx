"use client";

type ReadinessState =
  | "ready"
  | "blocked"
  | "needs-review"
  | "active"
  | "completed"
  | string;

type Props = {
  state: ReadinessState;
  label?: string;
  score?: number;
};

export function PlannerReadinessBadge({ state, label, score }: Props) {
  const text =
    label ??
    `${state.replace(/-/g, " ")}${score !== undefined ? ` · ${score}/100` : ""}`;

  return (
    <span
      className={`planner-readiness-badge planner-readiness-badge--${state}`}
      title={text}
    >
      {text}
    </span>
  );
}
