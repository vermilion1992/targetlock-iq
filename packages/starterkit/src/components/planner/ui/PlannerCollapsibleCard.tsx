"use client";

import { useState, type ReactNode } from "react";

type Props = {
  kicker: string;
  title: string;
  /** Optional badge/summary rendered inside the toggle (non-interactive). */
  meta?: ReactNode;
  /** Optional interactive controls rendered beside the toggle (e.g. reset). */
  actions?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Collapsible card that shares the hero sub-header look (blue kicker, title,
 * vertical blue accent) used by PlannerSubPanel, with a disclosure chevron so
 * the body can be expanded or hidden.
 */
export function PlannerCollapsibleCard({
  kicker,
  title,
  meta,
  actions,
  defaultOpen = false,
  className,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <article
      className={`targetlock-settings-form-card planner-collapsible-card${
        open ? " planner-collapsible-card--open" : ""
      }${className ? ` ${className}` : ""}`}
    >
      <header className="targetlock-settings-form-card-head targetlock-hero-sub-header planner-collapsible-head">
        <button
          type="button"
          className="planner-collapsible-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="targetlock-form-card-head-text">
            <span className="targetlock-settings-form-card-kicker">{kicker}</span>
            <span className="targetlock-settings-form-card-title">{title}</span>
          </span>
          <span className="planner-collapsible-head-aside">
            {meta ? <span className="planner-collapsible-meta">{meta}</span> : null}
            <span className="planner-collapsible-chevron" aria-hidden>
              {open ? "\u25BE" : "\u25B8"}
            </span>
          </span>
        </button>
        {actions ? (
          <div
            className="planner-collapsible-actions"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        ) : null}
      </header>
      {open ? (
        <div className="targetlock-settings-form-card-body">{children}</div>
      ) : null}
    </article>
  );
}
