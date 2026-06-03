"use client";

type Props = {
  lines: string[];
  left: number;
  top: number;
  visible: boolean;
};

export function ChartSurveyTooltip({ lines, left, top, visible }: Props) {
  if (!visible || !lines.length) return null;

  return (
    <div
      className="targetlock-chart-tooltip"
      role="tooltip"
      style={{ left, top }}
    >
      {lines.map((line) => (
        <span key={line} className="targetlock-chart-tooltip-line">
          {line}
        </span>
      ))}
    </div>
  );
}
