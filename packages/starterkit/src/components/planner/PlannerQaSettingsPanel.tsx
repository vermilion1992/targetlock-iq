"use client";

import { SettingsNumberField } from "@/components/dashboard/SettingsNumberField";
import { PlannerCollapsibleCard } from "./ui/PlannerCollapsibleCard";
import { DEFAULT_PLANNER_QA_SETTINGS } from "@/lib/drilling/planner-qa";
import type { PlannerQaSettings } from "@/lib/drilling/planner-types";

type Props = {
  settings: PlannerQaSettings;
  onSave: (settings: PlannerQaSettings) => void;
};

function withDefaults(settings: PlannerQaSettings): PlannerQaSettings {
  return {
    ...DEFAULT_PLANNER_QA_SETTINGS,
    ...settings,
    separationFactorWarn:
      settings.separationFactorWarn ?? DEFAULT_PLANNER_QA_SETTINGS.separationFactorWarn,
    separationFactorRisk:
      settings.separationFactorRisk ?? DEFAULT_PLANNER_QA_SETTINGS.separationFactorRisk,
    separationFactorBlock:
      settings.separationFactorBlock ?? DEFAULT_PLANNER_QA_SETTINGS.separationFactorBlock,
    uncertaintySigmaFactor:
      settings.uncertaintySigmaFactor ?? DEFAULT_PLANNER_QA_SETTINGS.uncertaintySigmaFactor,
  };
}

export function PlannerQaSettingsPanel({ settings, onSave }: Props) {
  const normalized = withDefaults(settings);

  const update = (patch: Partial<PlannerQaSettings>) => {
    onSave({ ...normalized, ...patch });
  };

  const isDefault = JSON.stringify(normalized) === JSON.stringify(DEFAULT_PLANNER_QA_SETTINGS);

  return (
    <PlannerCollapsibleCard
      kicker="Clearance thresholds"
      title="QA thresholds & settings"
      className="planner-qa-settings-panel"
      actions={
        <button
          type="button"
          className="targetlock-btn targetlock-btn-sm"
          disabled={isDefault}
          onClick={() => onSave({ ...DEFAULT_PLANNER_QA_SETTINGS })}
        >
          Reset defaults
        </button>
      }
    >
      <p className="targetlock-form-card-copy">
        Separation, sampling, and clearance limits used when reviewing plans before approval.
        Changes apply immediately to QA checks on this program.
      </p>

      <fieldset className="targetlock-settings-form-group">
        <legend>Separation &amp; sampling</legend>
        <div className="targetlock-settings-form-grid targetlock-settings-form-grid--2">
          <SettingsNumberField
            label="Min hole separation"
            unit="m"
            value={normalized.minHoleSeparationM}
            min={0}
            max={50}
            step={0.5}
            onChange={(v) => update({ minHoleSeparationM: v })}
          />
          <SettingsNumberField
            label="Min mother-daughter separation"
            unit="m"
            value={normalized.minMotherDaughterSeparationM}
            min={0}
            max={50}
            step={0.5}
            onChange={(v) => update({ minMotherDaughterSeparationM: v })}
          />
          <SettingsNumberField
            label="Min sibling daughter separation"
            unit="m"
            value={normalized.minSiblingDaughterSeparationM}
            min={0}
            max={50}
            step={0.5}
            onChange={(v) => update({ minSiblingDaughterSeparationM: v })}
          />
          <SettingsNumberField
            label="Sample interval"
            unit="m"
            value={normalized.sampleIntervalM}
            min={1}
            max={100}
            step={1}
            onChange={(v) => update({ sampleIntervalM: v })}
          />
          <SettingsNumberField
            label="Kickoff exclusion zone"
            unit="m"
            value={normalized.motherDaughterKickoffExclusionM}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ motherDaughterKickoffExclusionM: v })}
          />
          <SettingsNumberField
            label="Max DLS"
            unit="°/30 m"
            value={normalized.maxDls}
            min={0}
            max={15}
            step={0.1}
            onChange={(v) => update({ maxDls: v })}
          />
        </div>
      </fieldset>

      <fieldset className="targetlock-settings-form-group">
        <legend>Separation factor</legend>
        <div className="targetlock-settings-form-grid targetlock-settings-form-grid--2">
          <SettingsNumberField
            label="Watch below"
            value={normalized.separationFactorWarn ?? DEFAULT_PLANNER_QA_SETTINGS.separationFactorWarn!}
            min={0}
            max={20}
            step={0.5}
            onChange={(v) => update({ separationFactorWarn: v })}
          />
          <SettingsNumberField
            label="Risk below"
            value={normalized.separationFactorRisk ?? DEFAULT_PLANNER_QA_SETTINGS.separationFactorRisk!}
            min={0}
            max={20}
            step={0.5}
            onChange={(v) => update({ separationFactorRisk: v })}
          />
          <SettingsNumberField
            label="Block approval below"
            value={
              normalized.separationFactorBlock ?? DEFAULT_PLANNER_QA_SETTINGS.separationFactorBlock!
            }
            min={0}
            max={10}
            step={0.1}
            onChange={(v) => update({ separationFactorBlock: v })}
          />
          <SettingsNumberField
            label="Uncertainty sigma factor"
            value={
              normalized.uncertaintySigmaFactor ??
              DEFAULT_PLANNER_QA_SETTINGS.uncertaintySigmaFactor!
            }
            min={1}
            max={10}
            step={0.5}
            onChange={(v) => update({ uncertaintySigmaFactor: v })}
          />
        </div>
      </fieldset>

      <fieldset className="targetlock-settings-form-group">
        <legend>Approval gate</legend>
        <label className="targetlock-settings-gear-row">
          <input
            type="checkbox"
            checked={normalized.requireCoordinateMetadataBeforeApproval}
            onChange={(e) =>
              update({ requireCoordinateMetadataBeforeApproval: e.target.checked })
            }
          />
          <span>Require coordinate metadata before approval</span>
        </label>
      </fieldset>
    </PlannerCollapsibleCard>
  );
}
