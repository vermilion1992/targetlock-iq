"use client";

import { useState } from "react";
import { InfoTip } from "@/components/layout/InfoTip";
import type { QaFlag } from "@/lib/drilling/types";

type Props = {
  flags: QaFlag[];
};

function summaryStatus(flags: QaFlag[]): { label: string; className: string } {
  if (flags.some((f) => f.level === "risk")) return { label: "Risk", className: "qa-summary-risk" };
  if (flags.some((f) => f.level === "watch")) return { label: "Watch", className: "qa-summary-watch" };
  return { label: "Clear", className: "qa-summary-clear" };
}

export function QaPanel({ flags }: Props) {
  const [expanded, setExpanded] = useState(false);
  const status = summaryStatus(flags);
  const ranked = [...flags].sort((a, b) => {
    const order = { risk: 0, watch: 1, ok: 2 } as Record<string, number>;
    return (order[a.level] ?? 3) - (order[b.level] ?? 3);
  });
  const top = ranked.filter((f) => f.level !== "ok").slice(0, 2);
  const shown = expanded ? ranked : top;

  return (
    <article className="targetlock-panel targetlock-qa-panel">
      <div className="targetlock-panel-title">
        <h2>
          Survey QA/QC{" "}
          <InfoTip tip="Field checks for survey interval, dogleg, offset from plan, recovery feasibility, and target risk." />
        </h2>
        <span className={`targetlock-qa-summary-pill ${status.className}`}>{status.label}</span>
      </div>

      {top.length === 0 && !expanded ? (
        <p className="targetlock-qa-clear-note">
          No interval, dogleg, offset-from-plan, or target-risk flags on the latest survey.
        </p>
      ) : (
        <div className="targetlock-qa-panel-body">
          {shown.map((flag) => (
            <div key={flag.label} className={`targetlock-qa-item qa-${flag.level}`}>
              <strong>{flag.label}</strong>
              <p>{flag.message}</p>
            </div>
          ))}
        </div>
      )}

      {ranked.length > top.length ? (
        <button
          type="button"
          className="targetlock-link-btn"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? "Show fewer" : `Show all checks (${ranked.length})`}
        </button>
      ) : null}
    </article>
  );
}
