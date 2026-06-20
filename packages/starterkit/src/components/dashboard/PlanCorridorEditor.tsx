"use client";

import { InfoTip } from "@/components/layout/InfoTip";
import { SettingsNumberField } from "@/components/dashboard/SettingsNumberField";
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
  readOnly?: boolean;
};

export function PlanCorridorEditor({ corridor, status, onChange, sanitizeField, readOnly = false }: Props) {
  const set = (field: keyof PlanCorridorConfig, value: number) => {
    if (readOnly) return;
    const next = sanitizeField ? sanitizeField(field, value, corridor) : value;
    onChange({ ...corridor, [field]: next });
  };

  return (
    <article className="targetlock-form-card targetlock-settings-corridor-card">
      <header className="targetlock-form-card-head">
        <div className="targetlock-form-card-head-text">
          <p className="targetlock-form-card-kicker">Planned path</p>
          <h3 className="targetlock-form-card-title">
            Plan corridor tolerance{" "}
            <InfoTip tip="Checks whether the hole is still inside the planned path corridor (per-interval behaviour and position offset), separately from final target recoverability." />
          </h3>
        </div>
        {status ? (
          <div className="targetlock-settings-corridor-status" role="status">
            <span
              className={`targetlock-settings-corridor-chip ${status.latestIntervalInside ? "targetlock-settings-corridor-chip--ok" : "targetlock-settings-corridor-chip--warn"}`}
            >
              Interval {status.latestIntervalInside ? "inside" : "outside"}
            </span>
            <span className="targetlock-settings-corridor-chip targetlock-settings-corridor-chip--neutral">
              Offset {status.planOffsetM.toFixed(1)} / {status.allowedPositionOffsetM.toFixed(1)} m
            </span>
            <span
              className={`targetlock-settings-corridor-chip ${status.targetStillRecoverable ? "targetlock-settings-corridor-chip--ok" : "targetlock-settings-corridor-chip--risk"}`}
            >
              Target {status.targetStillRecoverable ? "recoverable" : "at risk"}
            </span>
          </div>
        ) : null}
      </header>

      <div className="targetlock-form-card-body targetlock-settings-corridor-body">
        <p className="targetlock-form-card-copy">
          Per-interval dip, swing, and position limits along the planned survey.
        </p>
        <fieldset className="targetlock-settings-form-group">
          <legend>Interval behaviour</legend>
          <div className="targetlock-settings-form-grid targetlock-settings-form-grid--4">
            <SettingsNumberField
              label="Interval"
              unit="m"
              value={corridor.intervalM}
              min={5}
              max={60}
              step={1}
              onChange={(v) => set("intervalM", v)}
              disabled={readOnly}
            />
            <SettingsNumberField
              label="Expected lift/drop"
              unit="°/int"
              value={corridor.expectedLiftDropDeg}
              min={0}
              max={5}
              step={0.05}
              onChange={(v) => set("expectedLiftDropDeg", v)}
              disabled={readOnly}
            />
            <SettingsNumberField
              label="Expected swing"
              unit="°/int"
              value={corridor.expectedSwingDeg}
              min={0}
              max={5}
              step={0.05}
              onChange={(v) => set("expectedSwingDeg", v)}
              disabled={readOnly}
            />
            <SettingsNumberField
              label="Allowed dip deviation"
              unit="°"
              value={corridor.allowedDipDevDeg}
              min={0}
              max={10}
              step={0.05}
              onChange={(v) => set("allowedDipDevDeg", v)}
              disabled={readOnly}
            />
          </div>
        </fieldset>

        <fieldset className="targetlock-settings-form-group">
          <legend>Position envelope</legend>
          <div className="targetlock-settings-form-grid targetlock-settings-form-grid--3">
            <SettingsNumberField
              label="Allowed azimuth deviation"
              unit="°"
              value={corridor.allowedAziDevDeg}
              min={0}
              max={10}
              step={0.05}
              onChange={(v) => set("allowedAziDevDeg", v)}
              disabled={readOnly}
            />
            <SettingsNumberField
              label="Position offset"
              unit="m"
              value={corridor.positionOffsetM}
              min={0}
              max={20}
              step={0.1}
              onChange={(v) => set("positionOffsetM", v)}
              disabled={readOnly}
            />
            <SettingsNumberField
              label="Widen per 100 m"
              unit="m"
              value={corridor.positionWidenPer100m ?? 0}
              min={0}
              max={5}
              step={0.1}
              onChange={(v) => set("positionWidenPer100m", v)}
              disabled={readOnly}
            />
          </div>
        </fieldset>

        {status ? (
          <p className="targetlock-settings-corridor-detail">{status.detailPhrase}</p>
        ) : (
          <p className="targetlock-settings-corridor-detail targetlock-settings-corridor-detail--empty">
            Load plan and actual surveys to evaluate corridor status.
          </p>
        )}
      </div>
    </article>
  );
}
