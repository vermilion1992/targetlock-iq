"use client";

export type PlannerMetric = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "on-track" | "watch" | "risk";
};

type Props = {
  title?: string;
  metrics: PlannerMetric[];
  head?: React.ReactNode;
};

export function PlannerMetricStrip({ title, metrics, head }: Props) {
  if (!metrics.length) return null;

  return (
    <section className="targetlock-metrics-strip" aria-label={title ?? "Metrics"}>
      {title || head ? (
        <div className="targetlock-metrics-strip-head">
          {title ? (
            <span className="targetlock-metrics-strip-title">{title}</span>
          ) : null}
          {head}
        </div>
      ) : null}
      <div className="targetlock-metrics-strip-grid">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className={`targetlock-metric-cell${
              metric.tone && metric.tone !== "default"
                ? ` targetlock-metric-cell--${metric.tone}`
                : ""
            }`}
          >
            <span className="targetlock-metric-cell-label">{metric.label}</span>
            <strong className="targetlock-metric-cell-value">{metric.value}</strong>
            {metric.detail ? (
              <span className="targetlock-metric-cell-detail">{metric.detail}</span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
