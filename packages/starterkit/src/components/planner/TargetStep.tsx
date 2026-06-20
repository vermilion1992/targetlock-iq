"use client";

import { SettingsNumberField } from "@/components/dashboard/SettingsNumberField";
import { SettingsSelectField } from "@/components/dashboard/SettingsSelectField";
import { SettingsTextField } from "@/components/dashboard/SettingsTextField";
import { resolveTargetEnu } from "@/lib/drilling/coordinate-system";
import type { PlannerDraft, PlannerTargetInputMode } from "@/lib/drilling/planner-types";
import { PlannerStepCard } from "./PlannerStepCard";

type Props = {
  draft: PlannerDraft;
  onChange: (patch: Partial<PlannerDraft>) => void;
};

function targetInputModeLabel(mode: PlannerTargetInputMode, isDaughter: boolean): string {
  if (mode === "collar-relative") {
    return isDaughter ? "Local E/N/D from kickoff" : "Local E/N/D offset from collar";
  }
  if (mode === "grid") return "Grid target coordinate";
  return "MD + direction";
}

export function TargetStep({ draft, onChange }: Props) {
  const resolved = resolveTargetEnu(draft);
  const isDaughter = draft.planType === "daughter";
  const inputModes: PlannerTargetInputMode[] = isDaughter
    ? draft.coordinateMode === "grid"
      ? ["collar-relative", "grid"]
      : ["collar-relative"]
    : draft.coordinateMode === "grid"
      ? ["collar-relative", "grid", "md-offset"]
      : ["collar-relative", "md-offset"];

  const mode = draft.target.inputMode;
  const showGridTarget = mode === "grid";
  const showLocalTarget = mode === "collar-relative";
  const showMdOffset = mode === "md-offset";

  const setTarget = (patch: Partial<PlannerDraft["target"]>) => {
    onChange({ target: { ...draft.target, ...patch } });
  };

  return (
    <PlannerStepCard
      kicker="Target"
      title={isDaughter ? "Daughter target coordinates" : "Target coordinates"}
      copy={
        isDaughter
          ? "Target position for the daughter leg. Offsets are from the resolved kickoff station."
          : "Target position for the planned path. Grid targets convert to collar-relative offsets when a grid collar is set."
      }
      className="planner-coordinate-step"
    >
      <fieldset className="targetlock-settings-form-group">
        <legend>Target definition</legend>
        <div className="targetlock-settings-form-grid targetlock-settings-form-grid--2">
          <SettingsSelectField
            label="Target input mode"
            value={draft.target.inputMode}
            onChange={(v) => setTarget({ inputMode: v as PlannerTargetInputMode })}
          >
            {inputModes.map((m) => (
              <option key={m} value={m}>
                {targetInputModeLabel(m, isDaughter)}
              </option>
            ))}
          </SettingsSelectField>
          <SettingsNumberField
            label="Target tolerance"
            unit="m"
            value={draft.target.tolerance}
            min={1}
            max={20}
            step={0.5}
            onChange={(v) => setTarget({ tolerance: v })}
          />
          {showMdOffset ? (
            <SettingsNumberField
              label="Target MD"
              unit="m"
              value={draft.target.md ?? 0}
              min={0}
              step={1}
              slider={false}
              onChange={(v) => setTarget({ md: v > 0 ? v : undefined })}
            />
          ) : (
            <SettingsTextField
              label={isDaughter ? "Target MD / estimated MD" : "Target MD (optional)"}
              value={draft.target.md !== undefined ? String(draft.target.md) : ""}
              placeholder="Along-hole depth"
              onChange={(raw) =>
                setTarget({
                  md: raw === "" ? undefined : Number.parseFloat(raw) || undefined,
                })
              }
            />
          )}
        </div>
        {showMdOffset ? (
          <p className="targetlock-helper">
            Target position is resolved along-hole from initial dip and azimuth at the specified
            MD.
          </p>
        ) : null}
      </fieldset>

      {showGridTarget ? (
        <fieldset className="targetlock-settings-form-group">
          <legend>Grid target</legend>
          <div className="targetlock-settings-form-grid targetlock-settings-form-grid--3">
            <SettingsNumberField
              label="Target easting"
              unit="m"
              value={draft.target.e}
              step={0.1}
              slider={false}
              onChange={(v) => setTarget({ e: v })}
            />
            <SettingsNumberField
              label="Target northing"
              unit="m"
              value={draft.target.n}
              step={0.1}
              slider={false}
              onChange={(v) => setTarget({ n: v })}
            />
            <SettingsNumberField
              label="Target elevation / RL"
              unit="m"
              value={draft.target.d}
              step={0.1}
              slider={false}
              onChange={(v) => setTarget({ d: v })}
            />
          </div>
        </fieldset>
      ) : null}

      {showLocalTarget ? (
        <fieldset className="targetlock-settings-form-group">
          <legend>Local target offset</legend>
          <div className="targetlock-settings-form-grid targetlock-settings-form-grid--3">
            <SettingsNumberField
              label="Local E"
              unit="m"
              value={draft.target.e}
              step={0.1}
              slider={false}
              onChange={(v) => setTarget({ e: v })}
            />
            <SettingsNumberField
              label="Local N"
              unit="m"
              value={draft.target.n}
              step={0.1}
              slider={false}
              onChange={(v) => setTarget({ n: v })}
            />
            <SettingsNumberField
              label="Local D"
              unit="m"
              value={draft.target.d}
              step={0.1}
              slider={false}
              onChange={(v) => setTarget({ d: v })}
            />
          </div>
        </fieldset>
      ) : null}

      <p className="targetlock-helper">
        Resolved local target: E {resolved.e.toFixed(1)} / N {resolved.n.toFixed(1)} / D{" "}
        {resolved.d.toFixed(1)} m
      </p>
      {resolved.warnings.map((w) => (
        <p key={w} className="planner-review-qa-blocker">
          {w}
        </p>
      ))}
    </PlannerStepCard>
  );
}
