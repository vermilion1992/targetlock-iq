"use client";

import type { ReactNode } from "react";
import { InfoTip } from "@/components/layout/InfoTip";

type Props = {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  tip?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  className?: string;
};

export function SettingsTextField({
  label,
  value,
  onChange,
  placeholder,
  tip,
  disabled = false,
  multiline = false,
  rows = 4,
  className,
}: Props) {
  return (
    <label className={`targetlock-settings-text-field ${className ?? ""}`.trim()}>
      <span className="targetlock-settings-field-label">
        {label}
        {tip ? <> <InfoTip tip={tip} /></> : null}
      </span>
      <div
        className={`targetlock-settings-field-control targetlock-settings-field-control--text${disabled ? " targetlock-settings-field-control--disabled" : ""}`}
      >
        {multiline ? (
          <textarea
            className="targetlock-settings-text-input"
            rows={rows}
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            type="text"
            className="targetlock-settings-text-input"
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    </label>
  );
}
