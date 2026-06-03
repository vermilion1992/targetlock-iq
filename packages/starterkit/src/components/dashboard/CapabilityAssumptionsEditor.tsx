"use client";

import { InfoTip } from "@/components/layout/InfoTip";
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

function parseNum(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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
    <article className="targetlock-panel targetlock-assumptions-panel">
      <div className="targetlock-panel-title">
        <h2>
          Recovery capability assumptions{" "}
          <InfoTip tip="Site-specific DLS ranges used for steering feasibility only. Not guaranteed tool performance — depends on ground, rig, tools, and approval." />
        </h2>
        <button
          type="button"
          className="targetlock-btn targetlock-btn-sm"
          onClick={onReset}
          disabled={isDefault}
        >
          Reset to defaults
        </button>
      </div>
      <p className="targetlock-panel-copy">
        Configurable assumptions for this hole. Real ability depends on ground, rods, rig, hole
        size, pump, depth, survey quality, contractor, and geologist approval.
      </p>

      {validationStatus && validationStatus.state !== "validated" ? (
        <p className="targetlock-assumptions-validation-note" role="note">
          <strong>{validationStatus.label}.</strong> {validationStatus.detail} Sign off in the{" "}
          <strong>Validation</strong> tab before relying on steering feasibility.
        </p>
      ) : null}

      <div className="targetlock-assumptions-grid">
        {RANGE_FIELDS.map((field) => (
          <div
            key={field.label}
            className="targetlock-assumption-card"
            role="group"
            aria-label={field.label}
          >
            <div className="targetlock-assumption-card-head">
              <span className="targetlock-assumption-card-name">{field.label}</span>
              <span className="targetlock-assumption-badge">
                {rangeBadge(normalized[field.minKey], normalized[field.maxKey])}
              </span>
            </div>
            <p className="targetlock-assumption-desc">{field.description}</p>
            <div className="targetlock-assumption-inputs">
              <label>
                <span>Min °/30 m</span>
                <input
                  type="number"
                  min={0}
                  max={30}
                  step={field.step ?? 0.1}
                  value={normalized[field.minKey]}
                  onChange={(e) =>
                    update({
                      [field.minKey]: parseNum(e.target.value, normalized[field.minKey]),
                    } as Partial<CapabilityAssumptions>)
                  }
                />
              </label>
              <label>
                <span>Max °/30 m</span>
                <input
                  type="number"
                  min={0}
                  max={30}
                  step={field.step ?? 0.1}
                  value={normalized[field.maxKey]}
                  onChange={(e) =>
                    update({
                      [field.maxKey]: parseNum(e.target.value, normalized[field.maxKey]),
                    } as Partial<CapabilityAssumptions>)
                  }
                />
              </label>
            </div>
          </div>
        ))}

        <div
          className="targetlock-assumption-card"
          role="group"
          aria-label="Wedge / branch review"
        >
          <div className="targetlock-assumption-card-head">
            <span className="targetlock-assumption-card-name">
              Wedge / branch review{" "}
              <InfoTip tip="When the DLS required to rejoin plan exceeds this, the app suggests reviewing a wedge or branch instead of in-hole steering. It flags a decision, not a guarantee." />
            </span>
            <span className="targetlock-assumption-badge">
              Trigger &gt; {normalized.wedgeReviewThresholdDls.toFixed(1)}°/30 m
            </span>
          </div>
          <p className="targetlock-assumption-desc">
            Flag a sidetrack or branch review when required DLS to rejoin exceeds this — a
            recovery decision, not smooth in-hole steering.
          </p>
          <div className="targetlock-assumption-inputs">
            <label>
              <span>When required DLS exceeds (°/30 m)</span>
              <input
                type="number"
                min={0}
                max={30}
                step={0.1}
                value={normalized.wedgeReviewThresholdDls}
                onChange={(e) =>
                  update({
                    wedgeReviewThresholdDls: parseNum(
                      e.target.value,
                      normalized.wedgeReviewThresholdDls
                    ),
                  })
                }
              />
            </label>
          </div>
        </div>
      </div>
    </article>
  );
}
