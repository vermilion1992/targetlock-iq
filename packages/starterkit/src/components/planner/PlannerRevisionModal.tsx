"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  holeName: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

export function PlannerRevisionModal({ open, holeName, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setReason("");
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="tl-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="planner-revision-title"
      onClick={onClose}
    >
      <div className="tl-modal tl-modal--confirm" onClick={(e) => e.stopPropagation()}>
        <header className="tl-modal-header">
          <div className="tl-modal-header-text">
            <h2 id="planner-revision-title">Create revision — {holeName}</h2>
            <p className="tl-modal-lead">
              Creates a new draft revision. The current plan stays locked for audit.
            </p>
          </div>
          <button type="button" className="tl-modal-close" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="tl-modal-body">
          <label className="targetlock-survey-field targetlock-survey-field--full">
            <span>Reason (optional)</span>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this revision needed?"
            />
          </label>
        </div>
        <footer className="tl-modal-footer">
          <button ref={cancelRef} type="button" className="targetlock-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="targetlock-btn targetlock-btn-primary"
            onClick={() => {
              onConfirm(reason);
              onClose();
            }}
          >
            Create revision
          </button>
        </footer>
      </div>
    </div>
  );
}
