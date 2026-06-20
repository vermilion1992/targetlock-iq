"use client";

import { InfoTip } from "@/components/layout/InfoTip";
import {
  DEFAULT_GEAR,
  normalizeGearAvailability,
  type GearAvailability,
} from "@/lib/drilling/steering-settings";

type Props = {
  gear: GearAvailability;
  onChange: (next: GearAvailability) => void;
};

const GEAR_ROWS: {
  key: keyof Omit<GearAvailability, "crewNote">;
  label: string;
  tip: string;
}[] = [
  {
    key: "natural",
    label: "Natural correction",
    tip: "Hole drifts back without tooling changes.",
  },
  {
    key: "parameter",
    label: "Parameter correction",
    tip: "WOB / RPM / pump adjustments within rig capability.",
  },
  {
    key: "motorNavi",
    label: "Motor / Navi",
    tip: "Steerable motor or navigation tool on site.",
  },
  {
    key: "devidrill",
    label: "DeviDrill",
    tip: "Directional core barrel or high-DLS corrective tool.",
  },
  {
    key: "wedgeBranch",
    label: "Wedge / branch",
    tip: "Sidetrack or branch options are permitted on this program.",
  },
];

export function GearOnSitePanel({ gear, onChange }: Props) {
  const normalized = normalizeGearAvailability(gear);
  const isDefault = JSON.stringify(normalized) === JSON.stringify(DEFAULT_GEAR);

  const toggle = (key: keyof Omit<GearAvailability, "crewNote">, value: boolean) => {
    onChange(normalizeGearAvailability({ ...normalized, [key]: value }));
  };

  return (
    <article className="targetlock-settings-form-card">
      <header className="targetlock-settings-form-card-head">
        <div className="targetlock-form-card-head-text">
          <p className="targetlock-settings-form-card-kicker">Rig capability</p>
          <h3 className="targetlock-settings-form-card-title">
            Gear on site{" "}
            <InfoTip tip="Only enabled methods can appear as recommended steering options. Disabled gear triggers earlier escalation when correction is needed." />
          </h3>
        </div>
        <button
          type="button"
          className="targetlock-btn targetlock-btn-sm"
          disabled={isDefault}
          onClick={() => onChange({ ...DEFAULT_GEAR })}
        >
          Reset gear defaults
        </button>
      </header>

      <div className="targetlock-settings-form-card-body">
        <p className="targetlock-settings-form-card-copy">
          Motor / Navi is off by default — enable only when directional tooling is actually on
          the rig.
        </p>

        <fieldset className="targetlock-settings-form-group">
          <legend>Available methods</legend>
          <div className="targetlock-settings-gear-grid">
            {GEAR_ROWS.map((row) => (
              <label key={row.key} className="targetlock-settings-gear-row">
                <input
                  type="checkbox"
                  checked={normalized[row.key]}
                  onChange={(e) => toggle(row.key, e.target.checked)}
                />
                <span>
                  {row.label} <InfoTip tip={row.tip} />
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="targetlock-settings-form-group">
          <legend>Crew note</legend>
          <label className="targetlock-settings-text-field">
            <span className="targetlock-settings-field-label">Optional — reports only</span>
            <div className="targetlock-settings-field-control targetlock-settings-field-control--text">
              <input
                type="text"
                className="targetlock-settings-text-input"
                value={normalized.crewNote ?? ""}
                placeholder="e.g. NQ barrel, no navi on Rig 2"
                onChange={(e) =>
                  onChange(normalizeGearAvailability({ ...normalized, crewNote: e.target.value }))
                }
              />
            </div>
          </label>
        </fieldset>
      </div>
    </article>
  );
}
