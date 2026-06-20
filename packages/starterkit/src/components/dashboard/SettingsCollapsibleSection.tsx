"use client";

import { useState, type ReactNode } from "react";

type Props = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function SettingsCollapsibleSection({
  id,
  title,
  subtitle,
  badge,
  actions,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className="targetlock-settings-block">
      <header className="targetlock-settings-block-head">
        <button
          type="button"
          className="targetlock-settings-block-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="targetlock-settings-block-chevron" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
          <span className="targetlock-settings-block-titles">
            <span className="targetlock-settings-block-title">{title}</span>
            {subtitle ? (
              <span className="targetlock-settings-block-subtitle">{subtitle}</span>
            ) : null}
          </span>
          {badge ? <span className="targetlock-settings-block-badge">{badge}</span> : null}
        </button>
        {actions ? (
          <div className="targetlock-settings-block-actions" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        ) : null}
      </header>
      {open ? <div className="targetlock-settings-block-body">{children}</div> : null}
    </section>
  );
}
