"use client";

import { useEffect, useRef } from "react";
import type { TargetLockConfirmRequest } from "@/lib/drilling/confirm-actions";

type Props = TargetLockConfirmRequest & {
  onConfirm: () => void;
  onCancel: () => void;
};

export function TargetLockConfirmModal({
  title,
  description,
  details = [],
  notice,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const noticeClass =
    variant === "danger"
      ? "tl-modal-notice tl-modal-notice--error"
      : variant === "warning"
        ? "tl-modal-notice tl-modal-notice--warn"
        : "tl-modal-notice tl-modal-notice--info";

  const variantClass =
    variant === "danger"
      ? " tl-modal--confirm-danger"
      : variant === "warning"
        ? " tl-modal--confirm-warning"
        : "";

  return (
    <div
      className="tl-modal-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="tl-confirm-title"
      aria-describedby="tl-confirm-desc"
      onClick={onCancel}
    >
      <div
        className={`tl-modal tl-modal--confirm${variantClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="tl-modal-header">
          <div className="tl-modal-header-text">
            <h2 id="tl-confirm-title">{title}</h2>
            <p className="tl-modal-lead" id="tl-confirm-desc">
              {description}
            </p>
          </div>
          <button
            type="button"
            className="tl-modal-close"
            onClick={onCancel}
            aria-label="Close without confirming"
          >
            Close
          </button>
        </header>

        <div className="tl-modal-body tl-modal-body--flush">
          {notice ? (
            <p className={noticeClass} role="status">
              {notice}
            </p>
          ) : null}
          {details.length > 0 ? (
            <div className="tl-modal-panel">
              <section className="tl-modal-panel-section tl-modal-panel-section--last">
                <h3 className="tl-modal-panel-section-title">What changes</h3>
                <ul className="tl-modal-panel-list">
                  {details.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
            </div>
          ) : null}
        </div>

        <footer className="tl-modal-footer">
          <button
            ref={cancelRef}
            type="button"
            className="targetlock-btn"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={
              variant === "danger"
                ? "targetlock-btn targetlock-btn-danger"
                : variant === "warning"
                  ? "targetlock-btn targetlock-btn-secondary"
                  : "targetlock-btn targetlock-btn-primary"
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
