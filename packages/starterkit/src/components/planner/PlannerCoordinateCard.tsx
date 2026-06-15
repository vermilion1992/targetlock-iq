"use client";

import type { PlannerCoordinateCardData } from "@/lib/drilling/planner-spatial";
import type { PlannerPlanStatus } from "@/lib/drilling/planner-types";
import { PlannerStatusBadge } from "./PlannerStatusBadge";

type Props = {
  holeName: string;
  status: PlannerPlanStatus;
  data: PlannerCoordinateCardData | null;
};

export function PlannerCoordinateCard({ holeName, status, data }: Props) {
  if (!data) {
    return (
      <article className="targetlock-panel planner-coordinate-card">
        <div className="targetlock-panel-title">
          <h3>Coordinates</h3>
        </div>
        <p className="targetlock-panel-copy">Select a hole on the map to view coordinates.</p>
      </article>
    );
  }

  return (
    <article className="targetlock-panel planner-coordinate-card">
      <div className="targetlock-panel-title">
        <h3>{holeName}</h3>
        <PlannerStatusBadge status={status} />
      </div>
      <dl className="planner-coordinate-grid">
        {data.coordinateMode ? (
          <div className="planner-coordinate-group">
            <dt>Mode / north</dt>
            <dd>
              {data.coordinateMode} · {data.northReference ?? "—"}
              {data.pcsMode ? ` · PCS ${data.pcsMode}` : ""}
              {data.epsgCode ? ` (${data.epsgCode})` : ""}
            </dd>
          </div>
        ) : null}
        {data.collarStatus || data.targetStatus ? (
          <div className="planner-coordinate-group">
            <dt>Status</dt>
            <dd>
              Collar {data.collarStatus ?? "—"} · Target {data.targetStatus ?? "—"}
            </dd>
          </div>
        ) : null}
        <div className="planner-coordinate-group">
          <dt>Grid E / N / RL</dt>
          <dd>
            {data.gridEnu
              ? `E ${data.gridEnu.e.toFixed(1)}  N ${data.gridEnu.n.toFixed(1)}  RL ${data.gridEnu.d.toFixed(1)}`
              : "—"}
          </dd>
        </div>
        <div className="planner-coordinate-group">
          <dt>GPS lat / lon</dt>
          <dd>
            {data.gpsLatLon
              ? `${data.gpsLatLon.latitude.toFixed(6)}°, ${data.gpsLatLon.longitude.toFixed(6)}°`
              : "—"}
          </dd>
        </div>
        <div className="planner-coordinate-group">
          <dt>Local E / N / D</dt>
          <dd>
            E {data.localEnu.e.toFixed(1)}  N {data.localEnu.n.toFixed(1)}  D{" "}
            {data.localEnu.d.toFixed(1)}
          </dd>
        </div>
        <div className="planner-coordinate-group">
          <dt>Target offset from collar</dt>
          <dd>
            E {data.targetOffset.e.toFixed(1)}  N {data.targetOffset.n.toFixed(1)}  D{" "}
            {data.targetOffset.d.toFixed(1)}
          </dd>
        </div>
        <div className="planner-coordinate-group planner-coordinate-group--full">
          <dt>Collar</dt>
          <dd>{data.collarLabel}</dd>
        </div>
        <div className="planner-coordinate-group planner-coordinate-group--full">
          <dt>Target</dt>
          <dd>{data.targetLabel}</dd>
        </div>
        {data.kickoffLabel ? (
          <div className="planner-coordinate-group planner-coordinate-group--full">
            <dt>Kickoff</dt>
            <dd>{data.kickoffLabel}</dd>
          </div>
        ) : null}
      </dl>
      {data.warnings?.length ? (
        <ul className="planner-coordinate-warnings">
          {data.warnings.slice(0, 4).map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
