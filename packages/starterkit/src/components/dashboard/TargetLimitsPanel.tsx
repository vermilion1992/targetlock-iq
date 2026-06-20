"use client";

import { InfoTip } from "@/components/layout/InfoTip";
import { SettingsNumberField } from "@/components/dashboard/SettingsNumberField";
import type { TargetConfig } from "@/lib/drilling/types";

type Props = {
  target: TargetConfig;
  onChange: (next: TargetConfig) => void;
  onUsePlannedTarget: () => void;
  canUsePlanTarget: boolean;
  readOnly?: boolean;
};

export function TargetLimitsPanel({
  target,
  onChange,
  onUsePlannedTarget,
  canUsePlanTarget,
  readOnly = false,
}: Props) {
  const set = (field: keyof TargetConfig, value: number) => {
    if (readOnly) return;
    onChange({ ...target, [field]: value });
  };

  return (
    <article className="targetlock-settings-form-card">
      <header className="targetlock-settings-form-card-head">
        <div className="targetlock-form-card-head-text">
          <p className="targetlock-settings-form-card-kicker">Drilling envelope</p>
          <h3 className="targetlock-settings-form-card-title">
            Target &amp; drilling limits{" "}
            <InfoTip tip="Core numbers that drive aim dip/azimuth, classification, and survey cadence." />
          </h3>
        </div>
      </header>

      <div className="targetlock-settings-form-card-body">
        <fieldset className="targetlock-settings-form-group">
          <legend>Target position</legend>
          <div className="targetlock-settings-form-grid targetlock-settings-form-grid--4">
            <SettingsNumberField
              label="Target MD"
              unit="m"
              value={target.md}
              min={0}
              step={1}
              slider={false}
              onChange={(v) => set("md", v)}
              disabled={readOnly}
            />
            <SettingsNumberField
              label="East"
              unit="m"
              value={target.e}
              step={0.1}
              slider={false}
              onChange={(v) => set("e", v)}
              disabled={readOnly}
            />
            <SettingsNumberField
              label="North"
              unit="m"
              value={target.n}
              step={0.1}
              slider={false}
              onChange={(v) => set("n", v)}
              disabled={readOnly}
            />
            <SettingsNumberField
              label="Down"
              unit="m"
              value={target.d}
              step={0.1}
              slider={false}
              onChange={(v) => set("d", v)}
              disabled={readOnly}
            />
          </div>
        </fieldset>

        <fieldset className="targetlock-settings-form-group">
          <legend>Limits &amp; cadence</legend>
          <div className="targetlock-settings-form-grid targetlock-settings-form-grid--3">
            <SettingsNumberField
              label="Tolerance"
              unit="m"
              value={target.tolerance}
              min={0.5}
              max={20}
              step={0.5}
              tip="Allowed 3D distance from target before outside the envelope."
              onChange={(v) => set("tolerance", v)}
              disabled={readOnly}
            />
            <SettingsNumberField
              label="Max DLS"
              unit="°/30 m"
              value={target.maxDls}
              min={0.5}
              max={10}
              step={0.1}
              tip="Maximum dogleg severity for smooth correction planning."
              onChange={(v) => set("maxDls", v)}
              disabled={readOnly}
            />
            <SettingsNumberField
              label="Next survey interval"
              unit="m"
              value={target.nextInterval}
              min={5}
              max={60}
              step={1}
              tip="Default metres before the next survey. Steering rules can shorten this when matched."
              onChange={(v) => set("nextInterval", v)}
              disabled={readOnly}
            />
          </div>
        </fieldset>

        <div className="targetlock-settings-form-actions">
          <button
            type="button"
            className="targetlock-btn"
            onClick={onUsePlannedTarget}
            disabled={!canUsePlanTarget || readOnly}
          >
            Use planned target at MD
          </button>
        </div>
      </div>
    </article>
  );
}
