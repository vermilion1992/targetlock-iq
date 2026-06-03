"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  tourActive: boolean;
  tourStep?: number;
  tourStepCount?: number;
  onClose: () => void;
  onStartTour: () => void;
};

const METRICS = [
  { label: "Target hit rate", value: "+15–25%", note: "pilot goal" },
  { label: "Metres saved", value: "30–80 m", note: "per deep hole" },
  { label: "Survey-to-decision", value: "< 60 s", note: "vs manual" },
];

export function GuideModal({
  open,
  tourActive,
  tourStep = 0,
  tourStepCount = 0,
  onClose,
  onStartTour,
}: Props) {
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

  const tourLabel =
    tourActive && tourStepCount > 0
      ? `Guided tour — step ${tourStep + 1} of ${tourStepCount}`
      : null;

  return (
    <div
      className="tl-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      onClick={onClose}
    >
      <div className="tl-modal tl-modal--guide" onClick={(e) => e.stopPropagation()}>
        <header className="tl-modal-header">
          <div className="tl-modal-header-text">
            <h2 id="guide-modal-title">Guide</h2>
            <p className="tl-modal-lead">
              Product overview and a short walkthrough using sample hole data.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="tl-modal-close"
            onClick={onClose}
            aria-label="Close guide"
          >
            Close
          </button>
        </header>

        <div className="tl-modal-body tl-modal-body--flush">
          {tourLabel ? (
            <p className="tl-modal-notice" role="status">
              {tourLabel}. Use the panel at the bottom of the screen to move between steps.
            </p>
          ) : null}

          <div className="tl-modal-panel">
            <section className="tl-modal-panel-section">
              <h3 className="tl-modal-panel-section-title">Problem</h3>
              <p className="tl-modal-panel-text">
                Surveys, planned trajectories, and targets often sit in separate tools. By the
                time miss distance and the next aim are calculated, the rig may already have
                drilled another interval off plan.
              </p>
            </section>

            <section className="tl-modal-panel-section">
              <h3 className="tl-modal-panel-section-title">What TargetLock IQ does</h3>
              <p className="tl-modal-panel-text">
                Ingests planned and actual surveys, desurveys with minimum curvature, projects
                target miss, and recommends the next dip and azimuth — with rig-floor wording and
                QA/QC on each station.
              </p>
            </section>

            <section className="tl-modal-panel-section">
              <h3 className="tl-modal-panel-section-title">Who uses it</h3>
              <ul className="tl-modal-panel-list">
                <li>
                  <strong>Driller</strong> — dashboard, next interval aim, manual survey entry
                </li>
                <li>
                  <strong>Geologist</strong> — target tuning, deviation review, approval context
                </li>
                <li>
                  <strong>Supervisor</strong> — shift handover PDF, decision history, risk flags
                </li>
              </ul>
            </section>

            <section className="tl-modal-panel-section tl-modal-panel-section--last">
              <h3 className="tl-modal-panel-section-title">Pilot metrics (indicative)</h3>
              <div className="tl-modal-metrics">
                {METRICS.map((m) => (
                  <div key={m.label} className="tl-modal-metric">
                    <span className="tl-modal-metric-label">{m.label}</span>
                    <strong className="tl-modal-metric-value">{m.value}</strong>
                    <span className="tl-modal-metric-note">{m.note}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <footer className="tl-modal-footer">
          <button type="button" className="targetlock-btn" onClick={onClose}>
            {tourActive ? "Back to tour" : "Dismiss"}
          </button>
          <button
            type="button"
            className="targetlock-btn targetlock-btn-primary"
            onClick={() => {
              onClose();
              onStartTour();
            }}
          >
            {tourActive ? "Restart tour" : "Start guided tour"}
          </button>
        </footer>
      </div>
    </div>
  );
}
