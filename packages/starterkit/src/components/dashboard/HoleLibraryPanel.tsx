"use client";

import { useState } from "react";
import { InfoTip } from "@/components/layout/InfoTip";
import type { SavedHoleProject } from "@/lib/drilling/storage";

type Props = {
  holes: SavedHoleProject[];
  activeHoleId: string;
  onSwitch: (holeId: string) => void;
  onNewSample: () => void;
  onNewBlank: () => void;
  onDuplicate: () => void;
  onDelete: () => boolean;
};

export function HoleLibraryPanel({
  holes,
  activeHoleId,
  onSwitch,
  onNewSample,
  onNewBlank,
  onDuplicate,
  onDelete,
}: Props) {
  const [message, setMessage] = useState<string | null>(null);

  const handleDelete = () => {
    if (holes.length <= 1) {
      setMessage("Keep at least one hole in the library.");
      return;
    }
    const hole = holes.find((h) => h.holeId === activeHoleId);
    const label = hole?.holeName ?? "this hole";
    if (!window.confirm(`Delete ${label}? Surveys and history for this hole will be removed.`)) {
      return;
    }
    const ok = onDelete();
    setMessage(ok ? `Deleted ${label}.` : "Could not delete hole.");
  };

  return (
    <article className="targetlock-panel advanced-only">
      <div className="targetlock-panel-title">
        <h2>
          Hole library{" "}
          <InfoTip tip="Save multiple holes on this device. Switch the active hole for surveys, targets, and exports. Data stays in browser storage." />
        </h2>
        <span className="targetlock-mini-tag">
          {holes.length} {holes.length === 1 ? "Hole" : "Holes"}
        </span>
      </div>

      <ul className="targetlock-hole-list" role="listbox" aria-label="Saved holes">
        {holes.map((hole) => {
          const active = hole.holeId === activeHoleId;
          const surveys = hole.actualRecords.length;
          return (
            <li key={hole.holeId}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                className={`targetlock-hole-item ${active ? "active" : ""}`}
                onClick={() => {
                  if (!active) onSwitch(hole.holeId);
                }}
              >
                <strong>{hole.holeName}</strong>
                {hole.siteName ? (
                  <span className="targetlock-hole-meta">{hole.siteName}</span>
                ) : null}
                <span className="targetlock-hole-meta">
                  {surveys} survey{surveys === 1 ? "" : "s"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="targetlock-btn-row">
        <button type="button" className="targetlock-btn targetlock-btn-primary" onClick={onNewSample}>
          New test hole
        </button>
        <button type="button" className="targetlock-btn" onClick={onNewBlank}>
          New blank hole
        </button>
        <button type="button" className="targetlock-btn" onClick={onDuplicate}>
          Duplicate
        </button>
        <button type="button" className="targetlock-btn" onClick={handleDelete}>
          Delete
        </button>
      </div>

      {message ? (
        <p className="targetlock-panel-footnote" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
      <p className="targetlock-panel-footnote">
        Rename the active hole in the fields above. Exports use the active hole only.
      </p>
    </article>
  );
}
