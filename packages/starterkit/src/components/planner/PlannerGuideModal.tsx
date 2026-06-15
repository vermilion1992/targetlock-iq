"use client";

import { useEffect, useRef } from "react";
import type { PlannerTab } from "./PlannerShell";

type Props = {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: PlannerTab) => void;
  /** Starts the interactive step-by-step planner tour. */
  onStartTour?: () => void;
};

const GUIDE_SECTIONS: { title: string; copy: string }[] = [
  {
    title: "1. Create",
    copy: "Enter program and hole identity, collar coordinates or daughter kickoff, target coordinates, and path constraints. Generate, review, and save the plan.",
  },
  {
    title: "2. Coordinates",
    copy: "Review the program-wide register — collars, GPS/grid metadata, target coordinates, and kickoffs — and resolve coordinate warnings.",
  },
  {
    title: "3. Map",
    copy: "Inspect the local plan view or satellite view, check collar and target placement, and highlight mother/daughter relationships.",
  },
  {
    title: "4. 3D scene",
    copy: "Orbit the whole program: traces, targets, uncertainty envelopes, clearance risks, and the section plane. Import OBJ/DXF geology wireframes as display-only overlays.",
  },
  {
    title: "5. QA",
    copy: "Review clearance distances, separation factors, and drillability warnings for the program. Blockers must be resolved before approval.",
  },
  {
    title: "6. Review",
    copy: "The decision page: readiness, QA, approval, and lock state. Approve the plan, create a revision, or activate it.",
  },
  {
    title: "7. Package",
    copy: "Export planning PDFs, contractor CSVs, trajectory DXF, coordinate registers, and the program manifest/evidence package.",
  },
  {
    title: "8. TargetLock handoff",
    copy: "Mark an approved plan active to lock it and drill against it in the TargetLock execution dashboard.",
  },
];

export function PlannerGuideModal({ open, onClose, onNavigate, onStartTour }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const jumpTo = (tab: PlannerTab) => {
    onNavigate(tab);
    onClose();
  };

  return (
    <div
      className="tl-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="planner-guide-title"
      onClick={onClose}
    >
      <div className="tl-modal tl-modal--guide" onClick={(e) => e.stopPropagation()}>
        <header className="tl-modal-header">
          <div className="tl-modal-header-text">
            <h2 id="planner-guide-title">TargetLock Planner Guide</h2>
            <p className="tl-modal-lead">
              The planning office companion to the TargetLock execution dashboard. Plan,
              QA, approve, and hand off drill holes in one workflow.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="tl-modal-close"
            onClick={onClose}
            aria-label="Close planner guide"
          >
            Close
          </button>
        </header>

        <div className="tl-modal-body tl-modal-body--flush">
          <div className="tl-modal-panel">
            {GUIDE_SECTIONS.map((section) => (
              <section key={section.title} className="tl-modal-panel-section">
                <h3 className="tl-modal-panel-section-title">{section.title}</h3>
                <p className="tl-modal-panel-text">{section.copy}</p>
              </section>
            ))}
            <p className="tl-modal-panel-text">
              For the full methodology — the formulas behind plan generation, clearance,
              and uncertainty, plus validation evidence — open the{" "}
              <button
                type="button"
                className="planner-inline-link"
                onClick={() => jumpTo("methodology")}
              >
                How it works
              </button>{" "}
              page.
            </p>
            <p className="tl-modal-notice tl-modal-notice--warn" role="note">
              Planning support only. Verify coordinates, survey conventions, clearances,
              and contractor/geologist approval before field use.
            </p>
          </div>
        </div>

        <footer className="tl-modal-footer">
          <button type="button" className="targetlock-btn" onClick={onClose}>
            Close
          </button>
          {onStartTour ? (
            <button
              type="button"
              className="targetlock-btn targetlock-btn-primary"
              onClick={onStartTour}
            >
              Start interactive tour
            </button>
          ) : null}
          <button
            type="button"
            className="targetlock-btn"
            onClick={() => jumpTo("map")}
          >
            Open Map
          </button>
          <button
            type="button"
            className="targetlock-btn"
            onClick={() => jumpTo("qa")}
          >
            Open QA
          </button>
          <button
            type="button"
            className="targetlock-btn"
            onClick={() => jumpTo("review")}
          >
            Open Review
          </button>
          <button
            type="button"
            className={`targetlock-btn${onStartTour ? "" : " targetlock-btn-primary"}`}
            onClick={() => jumpTo("create")}
          >
            Start with Create
          </button>
        </footer>
      </div>
    </div>
  );
}
