"use client";

import type { ActualVsPlannedResult } from "@/lib/drilling/actual-vs-plan";
import { round } from "@/lib/drilling/format";

type Props = {
  result: ActualVsPlannedResult;
};

const STRIP_LABEL: Record<
  Extract<ActualVsPlannedResult["status"], "watch" | "off-plan" | "review-plan">,
  string
> = {
  watch: "Watch — deviation from locked plan",
  "off-plan": "Off plan — outside locked tolerance",
  "review-plan": "Review — locked plan needs attention",
};

export function ActualVsPlannedStrip({ result }: Props) {
  if (
    result.status !== "watch" &&
    result.status !== "off-plan" &&
    result.status !== "review-plan"
  ) {
    return null;
  }

  const offset =
    result.latestPlanOffsetM !== null
      ? `${round(result.latestPlanOffsetM, 1)} m offset`
      : null;
  const progress =
    result.progressPct !== null ? `${result.progressPct}% drilled` : null;
  const parts = [STRIP_LABEL[result.status], offset, progress].filter(Boolean);

  return (
    <div
      className={`planner-avp-strip planner-avp-strip--${result.status}`}
      role="status"
    >
      {parts.join(" · ")}
    </div>
  );
}
