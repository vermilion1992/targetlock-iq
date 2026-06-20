"use client";

type Props = {
  title: string;
  subtitle?: string;
};

/** Lightweight in-page section break — no blue accent bar. */
export function TargetLockSectionDivider({ title, subtitle }: Props) {
  return (
    <header className="targetlock-section-divider">
      <div>
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </header>
  );
}
