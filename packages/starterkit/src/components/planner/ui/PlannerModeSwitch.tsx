"use client";

type Option<T extends string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
};

export function PlannerModeSwitch<T extends string>({
  options,
  value,
  onChange,
  label,
}: Props<T>) {
  return (
    <div
      className="targetlock-mode-switch planner-mode-switch"
      role="tablist"
      aria-label={label ?? "Mode"}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          className={`targetlock-mode-button${value === option.id ? " active" : ""}`}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
