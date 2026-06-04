"use client";

import { InfoTip } from "@/components/layout/InfoTip";
import type { DecisionHistoryEntry } from "@/lib/drilling/history";

type Props = {
  entries: DecisionHistoryEntry[];
  onClear?: () => void;
};

export function DecisionHistoryPanel({ entries, onClear }: Props) {
  return (
    <article className="targetlock-panel advanced-only">
      <div className="targetlock-panel-title">
        <h2>
          Decision history{" "}
          <InfoTip tip="Chronological log of surveys, recommendations, target changes, and exports for this session. Stored locally with the hole package." />
        </h2>
        <span className="targetlock-mini-tag">{entries.length} events</span>
      </div>
      {entries.length === 0 ? (
        <p className="targetlock-panel-copy">
          No decisions recorded yet. Add a survey or load data to start the log.
        </p>
      ) : (
        <div className="targetlock-scroll-pane">
          <ol className="targetlock-history-list">
            {entries.map((entry) => {
              const time = new Date(entry.timestamp).toLocaleString("en-AU", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <li
                  key={entry.id}
                  className={`border-l-2 border-[var(--tl-blue)] py-1 pl-3 ${
                    entry.type === "supervisor_decision" ? "targetlock-history-supervisor" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <strong className="text-sm">{entry.summary}</strong>
                    <span className="text-xs text-[var(--tl-muted)]">{time}</span>
                  </div>
                  {entry.statusLabel && (
                    <span className="targetlock-mini-tag mt-1">
                      {entry.statusLabel}
                    </span>
                  )}
                  {entry.detail && (
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-[var(--tl-muted)]">
                      {entry.detail}
                    </pre>
                  )}
                  {entry.actionTaken && (
                    <p className="mt-1 text-xs text-[var(--tl-ink)]">
                      Action: {entry.actionTaken}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {onClear && entries.length > 0 && (
        <button
          type="button"
          className="targetlock-btn targetlock-btn-after-stack"
          onClick={() => void onClear?.()}
          aria-label="Clear decision history for this session"
        >
          Clear history
        </button>
      )}
    </article>
  );
}
