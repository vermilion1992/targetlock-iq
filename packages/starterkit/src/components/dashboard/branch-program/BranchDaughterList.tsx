"use client";

import {
  DAUGHTER_STATUS_LABELS,
  type BranchProgram,
  type DaughterStatus,
} from "@/lib/drilling/branch-program-types";
import { methodLabel } from "@/lib/drilling/branch-program";
import { round } from "@/lib/drilling/format";

type Props = {
  program: BranchProgram;
  activeDaughterHoleId?: string | null;
  readOnly?: boolean;
  onSetActive: (daughterHoleId: string) => void;
  onArchive: (daughterHoleId: string) => void;
  onStatusChange: (daughterHoleId: string, status: DaughterStatus) => void;
};

export function BranchDaughterList({
  program,
  activeDaughterHoleId,
  readOnly = false,
  onSetActive,
  onArchive,
  onStatusChange,
}: Props) {
  return (
    <article className="targetlock-panel">
      <div className="targetlock-panel-title">
        <h2>Daughter holes</h2>
        <span className="targetlock-mini-tag">
          {program.daughters.length} leg{program.daughters.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="targetlock-panel-copy">
        Switch the active daughter to import surveys and review that leg in the hole library.
      </p>

      {program.daughters.length === 0 ? (
        <p className="branch-program-muted">
          No daughters yet — use the kickoff planner to save a draft daughter plan.
        </p>
      ) : (
        <ul className="targetlock-branch-card-list">
          {program.daughters.map((d) => {
            const isActive = activeDaughterHoleId === d.daughterHoleId;
            return (
              <li
                key={d.daughterHoleId}
                className={`targetlock-branch-card${isActive ? " is-active" : ""}`}
              >
                <div className="targetlock-branch-card-main">
                  <strong>{d.daughterId}</strong>
                  <span className="targetlock-branch-card-meta">
                    Kickoff {round(d.kickoffMd, 0)} m · {methodLabel(d.method)} ·{" "}
                    <span className={`branch-status branch-status--${d.status}`}>
                      {DAUGHTER_STATUS_LABELS[d.status] ?? d.status}
                    </span>
                  </span>
                </div>
                <div className="targetlock-branch-card-actions">
                  <button
                    type="button"
                    className={`targetlock-btn targetlock-btn-sm${isActive ? " targetlock-btn-primary" : ""}`}
                    onClick={() => onSetActive(d.daughterHoleId)}
                    aria-pressed={isActive}
                  >
                    {isActive ? "Active daughter" : "Set active"}
                  </button>
                  <select
                    value={d.status}
                    onChange={(ev) =>
                      onStatusChange(d.daughterHoleId, ev.target.value as DaughterStatus)
                    }
                    aria-label={`Status ${d.daughterId}`}
                    disabled={readOnly}
                  >
                    {Object.entries(DAUGHTER_STATUS_LABELS).map(([k, v]) =>
                      k === "planned" ? null : (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      )
                    )}
                  </select>
                  {!readOnly ? (
                    <button
                      type="button"
                      className="targetlock-btn targetlock-btn-sm"
                      onClick={() => onArchive(d.daughterHoleId)}
                    >
                      Archive
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
