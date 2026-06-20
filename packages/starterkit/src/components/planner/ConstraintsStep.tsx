"use client";

import { SettingsNumberField } from "@/components/dashboard/SettingsNumberField";
import { SettingsSelectField } from "@/components/dashboard/SettingsSelectField";
import { PATH_DESIGN_LABELS, type PathDesignType } from "@/lib/drilling/well-path-design";
import type { PlannerDraft } from "@/lib/drilling/planner-types";
import { PlannerStepCard } from "./PlannerStepCard";

type Props = {
  draft: PlannerDraft;
  onChange: (patch: Partial<PlannerDraft>) => void;
};

const PATH_DESIGN_HELP: Record<PathDesignType, string> = {
  straight: "Single straight leg from collar (or kickoff) to the target.",
  "build-and-hold":
    "Hold the initial direction for the kickoff length, build at the configured rate, then hold straight to the target.",
  "curve-to-target":
    "Single constant-curvature arc using the gentlest dogleg that still reaches the target (must stay within max DLS).",
};

export function ConstraintsStep({ draft, onChange }: Props) {
  const isStandard = draft.planType === "standard";
  const pathDesign = draft.constraints.pathDesign ?? "straight";

  const setConstraints = (patch: Partial<PlannerDraft["constraints"]>) => {
    onChange({ constraints: { ...draft.constraints, ...patch } });
  };

  return (
    <PlannerStepCard
      kicker="Path design"
      title="Path constraints"
      copy="Survey interval and dogleg limits used when generating the planned path. TargetLock flags intervals that exceed the max DLS assumption."
    >
      <fieldset className="targetlock-settings-form-group">
        <legend>Trajectory shape</legend>
        <SettingsSelectField
          label="Path design"
          value={pathDesign}
          onChange={(v) => setConstraints({ pathDesign: v as PathDesignType })}
        >
          {(Object.keys(PATH_DESIGN_LABELS) as PathDesignType[]).map((id) => (
            <option key={id} value={id}>
              {PATH_DESIGN_LABELS[id]}
            </option>
          ))}
        </SettingsSelectField>
        <p className="targetlock-helper">{PATH_DESIGN_HELP[pathDesign]}</p>

        {pathDesign === "build-and-hold" ? (
          <div className="targetlock-settings-form-grid targetlock-settings-form-grid--2">
            <SettingsNumberField
              label="Kickoff length"
              unit="m"
              value={draft.constraints.kickoffLengthM ?? 0}
              min={0}
              max={500}
              step={10}
              onChange={(v) => setConstraints({ kickoffLengthM: v })}
            />
            <SettingsNumberField
              label="Build rate"
              unit="°/30 m"
              value={draft.constraints.buildRateDegPer30m ?? draft.constraints.maxDls}
              min={0.1}
              max={10}
              step={0.1}
              onChange={(v) => setConstraints({ buildRateDegPer30m: v })}
            />
          </div>
        ) : null}
      </fieldset>

      <fieldset className="targetlock-settings-form-group">
        <legend>Survey cadence &amp; limits</legend>
        <div className="targetlock-settings-form-grid targetlock-settings-form-grid--2">
          <SettingsNumberField
            label="Survey interval"
            unit="m"
            value={draft.constraints.surveyInterval}
            min={5}
            max={60}
            step={5}
            onChange={(v) => setConstraints({ surveyInterval: v })}
          />
          <SettingsNumberField
            label="Max DLS"
            unit="°/30 m"
            value={draft.constraints.maxDls}
            min={0.5}
            max={15}
            step={0.5}
            onChange={(v) => setConstraints({ maxDls: v })}
          />
        </div>
      </fieldset>

      {isStandard ? (
        <fieldset className="targetlock-settings-form-group">
          <legend>Initial orientation</legend>
          <div className="targetlock-settings-form-grid targetlock-settings-form-grid--2">
            <SettingsNumberField
              label="Initial dip"
              unit="°"
              value={draft.initialDip ?? -60}
              min={-90}
              max={90}
              step={0.1}
              slider={false}
              onChange={(v) => onChange({ initialDip: v })}
            />
            <SettingsNumberField
              label="Initial azimuth"
              unit="°"
              value={draft.initialAzimuth ?? 0}
              min={0}
              max={360}
              step={0.1}
              slider={false}
              onChange={(v) => onChange({ initialAzimuth: v })}
            />
          </div>
        </fieldset>
      ) : (
        <p className="targetlock-helper">
          Daughter branch uses kickoff dip and azimuth from the mother actual survey path.
        </p>
      )}
    </PlannerStepCard>
  );
}
