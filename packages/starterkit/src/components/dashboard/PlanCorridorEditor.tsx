"use client";

import { InfoTip } from "@/components/layout/InfoTip";
import type { PlanCorridorConfig, PlanCorridorStatus } from "@/lib/drilling/plan-corridor";

type Props = {
  corridor: PlanCorridorConfig;
  status: PlanCorridorStatus | null;
  onChange: (next: PlanCorridorConfig) => void;
  sanitizeField?: (
    field: keyof PlanCorridorConfig,
    raw: number,
    previous: PlanCorridorConfig
  ) => number;
};

export function PlanCorridorEditor({ corridor, status, onChange, sanitizeField }: Props) {
  const set = (field: keyof PlanCorridorConfig, value: number) => {
    const next = sanitizeField
      ? sanitizeField(field, value, corridor)
      : value;
    onChange({ ...corridor, [field]: next });
  };

  return (
    <div className="targetlock-plan-corridor advanced-only">
      <h3 className="targetlock-subpanel-title">
        Plan corridor tolerance{" "}
        <InfoTip tip="Checks whether the hole is still inside the planned path corridor (per-interval behaviour and position offset), separately from final target recoverability." />
      </h3>
      <div className="targetlock-form-grid">
        <label>
          <span>Interval (m)</span>
          <input
            type="number"
            value={corridor.intervalM}
            step={1}
            onChange={(e) => set("intervalM", Number(e.target.value))}
          />
        </label>
        <label>
          <span>Expected lift/drop (°/interval)</span>
          <input
            type="number"
            step={0.05}
            value={corridor.expectedLiftDropDeg}
            onChange={(e) => set("expectedLiftDropDeg", Number(e.target.value))}
          />
        </label>
        <label>
          <span>Expected swing (°/interval)</span>
          <input
            type="number"
            step={0.05}
            value={corridor.expectedSwingDeg}
            onChange={(e) => set("expectedSwingDeg", Number(e.target.value))}
          />
        </label>
        <label>
          <span>Allowed dip deviation (°)</span>
          <input
            type="number"
            step={0.05}
            value={corridor.allowedDipDevDeg}
            onChange={(e) => set("allowedDipDevDeg", Number(e.target.value))}
          />
        </label>
        <label>
          <span>Allowed azimuth deviation (°)</span>
          <input
            type="number"
            step={0.05}
            value={corridor.allowedAziDevDeg}
            onChange={(e) => set("allowedAziDevDeg", Number(e.target.value))}
          />
        </label>
        <label>
          <span>Position offset (m)</span>
          <input
            type="number"
            step={0.1}
            value={corridor.positionOffsetM}
            onChange={(e) => set("positionOffsetM", Number(e.target.value))}
          />
        </label>
        <label>
          <span>Widen per 100 m (m)</span>
          <input
            type="number"
            step={0.1}
            value={corridor.positionWidenPer100m ?? 0}
            onChange={(e) => set("positionWidenPer100m", Number(e.target.value))}
          />
        </label>
      </div>
      {status ? (
        <div className="targetlock-corridor-status" role="status">
          <p>
            <strong>Latest interval:</strong>{" "}
            {status.latestIntervalInside ? "Inside" : "Outside"} planned behaviour
            tolerance
          </p>
          <p>
            <strong>Plan offset:</strong> {status.planOffsetM.toFixed(1)} m (allowed{" "}
            {status.allowedPositionOffsetM.toFixed(1)} m)
          </p>
          <p>
            <strong>Final target:</strong>{" "}
            {status.targetStillRecoverable ? "Still recoverable" : "At risk"}
          </p>
          <p className="targetlock-helper">{status.detailPhrase}</p>
        </div>
      ) : (
        <p className="targetlock-helper">Load plan and actual surveys to evaluate corridor.</p>
      )}
    </div>
  );
}
