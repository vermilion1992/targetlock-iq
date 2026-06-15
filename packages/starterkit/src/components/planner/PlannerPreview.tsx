"use client";

import { TrajectoryCanvas } from "@/components/charts/TrajectoryCanvas";
import { buildStations } from "@/lib/drilling/desurvey";
import type { SurveyRecord } from "@/lib/drilling/types";

type Props = {
  planRecords: SurveyRecord[];
};

export function PlannerPreview({ planRecords }: Props) {
  const planStations = buildStations(planRecords);

  if (!planRecords.length) {
    return (
      <p className="targetlock-panel-copy">Generate a plan to preview the trajectory.</p>
    );
  }

  return (
    <article className="targetlock-panel planner-preview-panel">
      <div className="targetlock-panel-title">
        <h2>Plan preview</h2>
        <span className="targetlock-legend text-xs text-[var(--tl-muted)]">
          Collar-relative plan stations
        </span>
      </div>
      <TrajectoryCanvas
        kind="plan"
        planStations={planStations}
        actualStations={[]}
        recommendation={null}
        className="chart-canvas-wrap"
        corridorStatus={null}
      />
    </article>
  );
}
