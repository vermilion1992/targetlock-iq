"use client";

import type { ReactNode } from "react";
import { InfoTip } from "@/components/layout/InfoTip";

type Props = {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  tip?: string;
  disabled?: boolean;
  className?: string;
};

export function SettingsSelectField({
  label,
  value,
  onChange,
  children,
  tip,
  disabled = false,
  className,
}: Props) {
  return (
    <label className={`targetlock-settings-select-field ${className ?? ""}`.trim()}>
      <span className="targetlock-settings-field-label">
        {label}
        {tip ? <> <InfoTip tip={tip} /></> : null}
      </span>
      <div
        className={`targetlock-settings-field-control targetlock-settings-field-control--text${disabled ? " targetlock-settings-field-control--disabled" : ""}`}
      >
        <select
          className="targetlock-settings-select-input"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
      </div>
    </label>
  );
}
