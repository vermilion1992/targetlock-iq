"use client";

import { InfoTip } from "@/components/layout/InfoTip";
import { SettingsNumberField } from "@/components/dashboard/SettingsNumberField";
import {
  DEFAULT_CAPABILITY_ASSUMPTIONS,
  normalizeCapabilityAssumptions,
  type CapabilityAssumptions,
} from "@/lib/drilling/capability-assumptions";
import type { AssumptionValidationStatus } from "@/lib/drilling/validation";

type Props = {
  assumptions: CapabilityAssumptions;
  onChange: (next: CapabilityAssumptions) => void;
  onReset: () => void;
  validationStatus?: AssumptionValidationStatus;
};

type RangeField = {
  key: keyof CapabilityAssumptions;
  label: string;
  description: string;
  minKey: keyof CapabilityAssumptions;
  maxKey: keyof CapabilityAssumptions;
  step?: number;
};

const RANGE_FIELDS: RangeField[] = [
  {
    key: "naturalDlsMin",
    label: "Natural correction",
    description: "Hole drifts back toward plan on its own with steady parameters.",
    minKey: "naturalDlsMin",
    maxKey: "naturalDlsMax",
    step: 0.1,
  },
  {
    key: "parameterDlsMin",
    label: "Parameter correction",
    description: "Adjust WOB / RPM / pump to nudge trajectory without tooling.",
    minKey: "parameterDlsMin",
    maxKey: "parameterDlsMax",
    step: 0.1,
  },
  {
    key: "motorNaviDlsMin",
    label: "Motor / Navi",
    description: "Steerable motor or Navi run to actively build or turn the hole.",
    minKey: "motorNaviDlsMin",
    maxKey: "motorNaviDlsMax",
    step: 0.1,
  },
  {
    key: "devidrillDlsMin",
    label: "DeviDrill",
    description: "High-DLS corrective tool for stronger, deliberate steering.",
    minKey: "devidrillDlsMin",
    maxKey: "devidrillDlsMax",
    step: 0.1,
  },
];

function rangeBadge(min: number, max: number): string {
  return `${min.toFixed(1)}–${max.toFixed(1)}°/30 m`;
}

export function CapabilityAssumptionsEditor({
  assumptions,
  onChange,
  onReset,
  validationStatus,
}: Props) {
  const normalized = normalizeCapabilityAssumptions(assumptions);
  const isDefault =
    JSON.stringify(normalized) === JSON.stringify(DEFAULT_CAPABILITY_ASSUMPTIONS);

  const update = (patch: Partial<CapabilityAssumptions>) => {
    onChange(normalizeCapabilityAssumptions({ ...normalized, ...patch }));
  };

  return (
    <article className="targetlock-settings-form-card">
      <header className="targetlock-settings-form-card-head">
        <div className="targetlock-form-card-head-text">
          <p className="targetlock-settings-form-card-kicker">Achievable correction</p>
          <h3 className="targetlock-settings-form-card-title">
            Recovery capability assumptions{" "}
            <InfoTip tip="Site-specific DLS ranges used for steering feasibility only. Not guaranteed tool performance — depends on ground, rig, tools, and approval." />
          </h3>
        </div>
        <button
          type="button"
          className="targetlock-btn targetlock-btn-sm"
          onClick={() => void onReset()}
          disabled={isDefault}
        >
          Reset to defaults
        </button>
      </header>

      <div className="targetlock-settings-form-card-body">
        <p className="targetlock-settings-form-card-copy">
          Configurable assumptions for this hole. Real ability depends on ground, rods, rig, hole
          size, pump, depth, survey quality, contractor, and geologist approval.
        </p>

        {validationStatus && validationStatus.state !== "validated" ? (
          <p className="targetlock-assumptions-validation-note" role="note">
            <strong>{validationStatus.label}.</strong> {validationStatus.detail} Sign off below
            before relying on steering feasibility.
          </p>
        ) : null}

        <div className="targetlock-settings-assumptions-grid">
          {RANGE_FIELDS.map((field) => (
            <fieldset
              key={field.label}
              className="targetlock-settings-form-group targetlock-settings-assumption-group"
            >
              <legend>
                <span>{field.label}</span>
                <span className="targetlock-assumption-badge">
                  {rangeBadge(normalized[field.minKey], normalized[field.maxKey])}
                </span>
              </legend>
              <p className="targetlock-assumption-desc">{field.description}</p>
              <div className="targetlock-settings-form-grid targetlock-settings-form-grid--2">
                <SettingsNumberField
                  label="Min DLS"
                  unit="°/30 m"
                  value={normalized[field.minKey]}
                  min={0}
                  max={30}
                  step={field.step ?? 0.1}
                  onChange={(v) =>
                    update({ [field.minKey]: v } as Partial<CapabilityAssumptions>)
                  }
                />
                <SettingsNumberField
                  label="Max DLS"
                  unit="°/30 m"
                  value={normalized[field.maxKey]}
                  min={0}
                  max={30}
                  step={field.step ?? 0.1}
                  onChange={(v) =>
                    update({ [field.maxKey]: v } as Partial<CapabilityAssumptions>)
                  }
                />
              </div>
            </fieldset>
          ))}

          <fieldset className="targetlock-settings-form-group targetlock-settings-assumption-group">
            <legend>
              <span>
                Wedge / branch review{" "}
                <InfoTip tip="When the DLS required to rejoin plan exceeds this, the app suggests reviewing a wedge or branch instead of in-hole steering. It flags a decision, not a guarantee." />
              </span>
              <span className="targetlock-assumption-badge">
                Trigger &gt; {normalized.wedgeReviewThresholdDls.toFixed(1)}°/30 m
              </span>
            </legend>
            <p className="targetlock-assumption-desc">
              Flag a sidetrack or branch review when required DLS to rejoin exceeds this — a
              recovery decision, not smooth in-hole steering.
            </p>
            <SettingsNumberField
              label="When required DLS exceeds"
              unit="°/30 m"
              value={normalized.wedgeReviewThresholdDls}
              min={0}
              max={30}
              step={0.1}
              onChange={(v) => update({ wedgeReviewThresholdDls: v })}
            />
          </fieldset>
        </div>
      </div>
    </article>
  );
}
