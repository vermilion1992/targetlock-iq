"use client";

type Metric = {
  label: string;
  value: string;
  tone?: "default" | "on-track" | "watch" | "risk";
};

type Props = {
  metrics: Metric[];
};

export function PlannerMetricRow({ metrics }: Props) {
  if (!metrics.length) return null;

  return (
    <div className="planner-metric-row">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={`planner-metric-row-item${
            metric.tone && metric.tone !== "default"
              ? ` planner-metric-row-item--${metric.tone}`
              : ""
          }`}
        >
          <span className="planner-metric-row-label">{metric.label}</span>
          <strong className="planner-metric-row-value">{metric.value}</strong>
        </div>
      ))}
    </div>
  );
}
