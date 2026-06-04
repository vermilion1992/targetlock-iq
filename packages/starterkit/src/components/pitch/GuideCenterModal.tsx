"use client";

import { useEffect, useRef } from "react";
import { GUIDE_FLOWS } from "@/lib/drilling/guide-flows";
import type { GuideFlowId } from "@/lib/drilling/guide-types";

type Props = {
  open: boolean;
  guideActive: boolean;
  selectedFlowId: GuideFlowId | null;
  onSelectFlow: (id: GuideFlowId) => void;
  tourStep?: number;
  tourStepCount?: number;
  flowTitle?: string;
  onClose: () => void;
  onStartGuide: () => void;
  onRestartGuide?: () => void;
  onExitGuide?: () => void;
};

export function GuideCenterModal({
  open,
  guideActive,
  selectedFlowId,
  onSelectFlow,
  tourStep = 0,
  tourStepCount = 0,
  flowTitle,
  onClose,
  onStartGuide,
  onRestartGuide,
  onExitGuide,
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
    guideActive && tourStepCount > 0
      ? `${flowTitle ?? "Guide"} — step ${tourStep + 1} of ${tourStepCount}`
      : null;

  return (
    <div
      className="tl-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-center-title"
      onClick={onClose}
    >
      <div className="tl-modal tl-modal--guide" onClick={(e) => e.stopPropagation()}>
        <header className="tl-modal-header">
          <div className="tl-modal-header-text">
            <h2 id="guide-center-title">Guide Center</h2>
            <p className="tl-modal-lead">
              Institutional onboarding and testing walkthroughs. Pick a guide below — your hole
              data stays unchanged unless you choose to load a demo scenario.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="tl-modal-close"
            onClick={onClose}
            aria-label="Close guide center"
          >
            Close
          </button>
        </header>

        <div className="tl-modal-body tl-modal-body--flush">
          {tourLabel ? (
            <p className="tl-modal-notice" role="status">
              {tourLabel}. Use the panel at the bottom of the screen for Previous / Next.
            </p>
          ) : null}

          <div className="tl-modal-panel">
            <section className="tl-modal-panel-section">
              <h3 className="tl-modal-panel-section-title">Choose a guide</h3>
              <div className="guide-center-flow-grid" role="list">
                {GUIDE_FLOWS.map((flow) => {
                  const selected = selectedFlowId === flow.id;
                  return (
                    <button
                      key={flow.id}
                      type="button"
                      role="listitem"
                      className={`guide-center-flow-card${selected ? " guide-center-flow-card--selected" : ""}`}
                      aria-pressed={selected}
                      onClick={() => onSelectFlow(flow.id)}
                    >
                      <span className="guide-center-flow-card-title">{flow.title}</span>
                      <span className="guide-center-flow-card-meta">
                        {flow.durationLabel} · {flow.stepCount} steps
                      </span>
                      <span className="guide-center-flow-card-sub">{flow.subtitle}</span>
                      <span className="guide-center-flow-card-audience">{flow.audience}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {!guideActive ? (
              <section className="tl-modal-panel-section tl-modal-panel-section--last">
                <p className="tl-modal-panel-text">
                  Guides highlight relevant areas on screen and can open Advanced tabs when needed.
                  Load demo data only when a step offers it — everything restores when you exit the
                  guide. For reference outside a guide: Guide Center = how to use the app; Advanced
                  → Math reference = how calculations work; Advanced → Method &amp; Purpose = why the
                  app exists and what decisions it supports.
                </p>
              </section>
            ) : null}
          </div>
        </div>

        <footer className="tl-modal-footer">
          {guideActive ? (
            <>
              <button type="button" className="targetlock-btn" onClick={onClose}>
                Back to guide
              </button>
              {onRestartGuide ? (
                <button type="button" className="targetlock-btn" onClick={onRestartGuide}>
                  Restart guide
                </button>
              ) : null}
              {onExitGuide ? (
                <button type="button" className="targetlock-btn" onClick={onExitGuide}>
                  Exit guide
                </button>
              ) : null}
            </>
          ) : (
            <>
              <button type="button" className="targetlock-btn" onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                className="targetlock-btn targetlock-btn-primary"
                disabled={!selectedFlowId}
                onClick={onStartGuide}
              >
                Start guide
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
