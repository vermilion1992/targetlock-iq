"use client";

import { useId, useState, type ReactNode } from "react";
import { InfoTip } from "@/components/layout/InfoTip";

type Props = {
  label: ReactNode;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  slider?: boolean;
  tip?: string;
  className?: string;
  unit?: string;
  disabled?: boolean;
};

function clamp(value: number, min?: number, max?: number): number {
  let next = value;
  if (min != null) next = Math.max(min, next);
  if (max != null) next = Math.min(max, next);
  return next;
}

function parseValue(raw: string, fallback: number): number {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "-" || trimmed === "." || trimmed === "-.") return fallback;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : fallback;
}

function isPartialNumber(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === "-." || trimmed.endsWith(".");
}

export function SettingsNumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  slider,
  tip,
  className,
  unit,
  disabled = false,
}: Props) {
  const id = useId();
  const showSlider = slider ?? (min != null && max != null);
  const display = Number.isFinite(value) ? value : 0;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  const commit = (next: number) => {
    if (disabled) return;
    onChange(clamp(next, min, max));
  };

  const inputValue = editing ? text : String(display);

  return (
    <div className={`targetlock-settings-field ${className ?? ""}`.trim()}>
      <span className="targetlock-settings-field-label" id={`${id}-label`}>
        {label}
        {tip ? <> <InfoTip tip={tip} /></> : null}
      </span>
      <div
        className={`targetlock-settings-field-control${disabled ? " targetlock-settings-field-control--disabled" : ""}`}
      >
        {showSlider && min != null && max != null ? (
          <input
            type="range"
            className="targetlock-settings-slider"
            min={min}
            max={max}
            step={step}
            value={display}
            disabled={disabled}
            onChange={(e) => commit(parseValue(e.target.value, display))}
            aria-label={typeof label === "string" ? `${label} slider` : "Value slider"}
          />
        ) : null}
        <div className="targetlock-settings-number-wrap">
          <input
            type="text"
            inputMode="decimal"
            className="targetlock-settings-number-input"
            value={inputValue}
            disabled={disabled}
            aria-labelledby={`${id}-label`}
            onFocus={() => {
              if (disabled) return;
              setEditing(true);
              setText(String(display));
            }}
            onChange={(e) => {
              if (disabled) return;
              const raw = e.target.value;
              setText(raw);
              if (isPartialNumber(raw)) return;
              commit(parseValue(raw, display));
            }}
            onBlur={() => {
              if (disabled) return;
              setEditing(false);
              commit(parseValue(text, display));
            }}
          />
          {unit ? <span className="targetlock-settings-number-unit">{unit}</span> : null}
        </div>
      </div>
    </div>
  );
}
