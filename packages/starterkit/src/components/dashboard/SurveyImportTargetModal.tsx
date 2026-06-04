"use client";

import { useEffect, useRef } from "react";
import { listImportTargets } from "@/lib/drilling/branch-program-library";
import type { HoleLibrary } from "@/lib/drilling/hole-library";

type Props = {
  open: boolean;
  library: HoleLibrary;
  activeHoleId: string;
  importType: "plan" | "actual";
  fileName: string;
  onSelect: (holeId: string) => void;
  onCancel: () => void;
};

export function SurveyImportTargetModal({
  open,
  library,
  activeHoleId,
  importType,
  fileName,
  onSelect,
  onCancel,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const targets = listImportTargets(library, activeHoleId);
  const importLabel = importType === "plan" ? "hole plan" : "survey results";

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const showPicker = targets.length > 1;

  return (
    <div
      className="tl-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-target-title"
      onClick={onCancel}
    >
      <div className="tl-modal tl-modal--guide tl-modal--import-target" onClick={(e) => e.stopPropagation()}>
        <header className="tl-modal-header">
          <div className="tl-modal-header-text">
            <h2 id="import-target-title">Choose import target</h2>
            <p className="tl-modal-lead">
              This branch program has multiple hole legs. Assign the validated {importLabel} to the
              correct leg so daughter surveys are not loaded into the mother hole.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="tl-modal-close"
            onClick={onCancel}
            aria-label="Close import target picker"
          >
            Close
          </button>
        </header>

        <div className="tl-modal-body tl-modal-body--flush">
          <p className="tl-modal-notice tl-modal-notice--info" role="status">
            File validated: <strong>{fileName}</strong>
          </p>

          <div className="tl-modal-panel">
            <section className="tl-modal-panel-section tl-modal-panel-section--last">
              <h3 className="tl-modal-panel-section-title">Import to</h3>
              <p className="tl-modal-panel-text">
                Select the hole leg that should receive these survey stations.
              </p>
              {showPicker ? (
                <div className="csv-import-action-grid csv-import-action-grid--single-col" role="list">
                  {targets.map((t) => (
                    <button
                      key={t.holeId}
                      type="button"
                      role="listitem"
                      className="csv-import-action-card"
                      onClick={() => onSelect(t.holeId)}
                    >
                      <span className="csv-import-action-card-title">{t.label}</span>
                      <span className="csv-import-action-card-meta">Import here</span>
                      <span className="csv-import-action-card-sub">
                        Load {importLabel} into this leg
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="tl-modal-subpanel">
                  <button
                    type="button"
                    className="targetlock-btn targetlock-btn-primary"
                    onClick={() => onSelect(targets[0]?.holeId ?? activeHoleId)}
                  >
                    Import to {targets[0]?.label ?? "active hole"}
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>

        <footer className="tl-modal-footer">
          <p className="tl-modal-footer-note">
            Cancel closes this picker without importing. If you opened import from the sidebar, you
            can still use <strong>Undo import</strong> there after a successful import.
          </p>
          <button type="button" className="targetlock-btn" onClick={onCancel}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
