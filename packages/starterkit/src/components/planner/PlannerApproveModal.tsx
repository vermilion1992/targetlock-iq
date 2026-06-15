"use client";

import { useEffect, useRef, useState } from "react";
import type { HoleLibrary } from "@/lib/drilling/hole-library";
import {
  buildPlannerApprovalSnapshot,
  resolvePlannerApprovalStatus,
  type PlannerApprovalSnapshot,
} from "@/lib/drilling/planner-approval";
import { canApprovePlannerHole } from "@/lib/drilling/planner-qa";
import { plannerStatus } from "@/lib/drilling/planner-status";
import type { SavedHoleProject } from "@/lib/drilling/storage";

type Props = {
  open: boolean;
  hole: SavedHoleProject;
  library: HoleLibrary;
  onClose: () => void;
  onApprove: (opts: {
    approvedBy: string;
    role?: string;
    notes?: string;
    snapshot: PlannerApprovalSnapshot;
  }) => void;
};

export function PlannerApproveModal({
  open,
  hole,
  library,
  onClose,
  onApprove,
}: Props) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Drilling coordinator");
  const [notes, setNotes] = useState(hole.plannerMeta?.plannerNotes ?? "");
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setNotes(hole.plannerMeta?.plannerNotes ?? "");
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hole, onClose]);

  if (!open) return null;

  const status = plannerStatus(hole);
  const approvalGate = canApprovePlannerHole(hole, library);
  const validation = resolvePlannerApprovalStatus(hole, library);
  const canSubmit =
    (status === "planned" || (status === "approved" && validation.state === "stale")) &&
    approvalGate.allowed &&
    name.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const snapshot = buildPlannerApprovalSnapshot(hole, library, {
      approvedBy: name,
      role,
    });
    onApprove({ approvedBy: name, role, notes, snapshot });
    onClose();
  };

  return (
    <div
      className="tl-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="planner-approve-title"
      onClick={onClose}
    >
      <div className="tl-modal tl-modal--guide" onClick={(e) => e.stopPropagation()}>
        <header className="tl-modal-header">
          <div className="tl-modal-header-text">
            <h2 id="planner-approve-title">Approve {hole.holeName}</h2>
            <p className="tl-modal-lead">{validation.detail}</p>
          </div>
          <button type="button" className="tl-modal-close" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="tl-modal-body">
          {approvalGate.blockers.map((b) => (
            <p key={b} className="planner-review-qa-blocker">
              {b}
            </p>
          ))}
          {approvalGate.warnings.length ? (
            <ul className="planner-approval-warnings">
              {approvalGate.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          <label className="targetlock-survey-field targetlock-survey-field--full">
            <span>Reviewer name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </label>
          <label className="targetlock-survey-field targetlock-survey-field--full">
            <span>Role (optional)</span>
            <input type="text" value={role} onChange={(e) => setRole(e.target.value)} />
          </label>
          <label className="targetlock-survey-field targetlock-survey-field--full">
            <span>Sign-off note</span>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contractor / geologist sign-off note"
            />
          </label>
        </div>
        <footer className="tl-modal-footer">
          <button
            ref={cancelRef}
            type="button"
            className="targetlock-btn"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="targetlock-btn targetlock-btn-primary"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {validation.state === "stale" ? "Re-approve plan" : "Approve plan"}
          </button>
        </footer>
      </div>
    </div>
  );
}
