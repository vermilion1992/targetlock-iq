"use client";

import { InfoTip } from "@/components/layout/InfoTip";
import { SettingsNumberField } from "@/components/dashboard/SettingsNumberField";
import { round } from "@/lib/drilling/format";
import {
  normalizeSurveyToolProfile,
  profileFromPreset,
  type MagneticRisk,
  type NorthReference,
  type SurveyToolPresetId,
  type SurveyToolProfile,
  type SurveyUncertaintyAssessment,
} from "@/lib/drilling/survey-tool-profile";

type Props = {
  profile: SurveyToolProfile;
  assessment: SurveyUncertaintyAssessment | null;
  onChange: (next: SurveyToolProfile) => void;
};

const PRESET_OPTIONS: { id: SurveyToolPresetId; label: string }[] = [
  { id: "reflex-ez-trac", label: "REFLEX EZ-TRAC" },
  { id: "omnix42", label: "IMDEX OMNIx42" },
  { id: "devigyro", label: "DeviGyro" },
  { id: "custom", label: "Custom tool" },
];

const NORTH_LABELS: Record<NorthReference, string> = {
  grid: "Grid north",
  true: "True north",
  magnetic: "Magnetic north",
};

const MAGNETIC_LABELS: Record<MagneticRisk, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

function accuracySummary(profile: SurveyToolProfile): string {
  return `±${profile.azimuthUncertaintyDeg}° az · ±${profile.dipUncertaintyDeg}° dip`;
}

export function SurveyToolProfilePanel({ profile, assessment, onChange }: Props) {
  const setPreset = (presetId: SurveyToolPresetId) => {
    onChange(profileFromPreset(presetId));
  };

  const setField = <K extends keyof SurveyToolProfile>(
    key: K,
    value: SurveyToolProfile[K]
  ) => {
    onChange(normalizeSurveyToolProfile({ ...profile, [key]: value }));
  };

  const custom = profile.presetId === "custom";
  const assessmentLevel = assessment?.confidenceLevel ?? "normal";

  return (
    <article className="targetlock-settings-form-card targetlock-survey-profile-panel">
      <header className="targetlock-settings-form-card-head">
        <div className="targetlock-form-card-head-text">
          <p className="targetlock-settings-form-card-kicker">Survey accuracy</p>
          <h3 className="targetlock-settings-form-card-title">
            Survey tool profile{" "}
            <InfoTip tip="Tool accuracy assumptions for uncertainty-aware guidance — not a substitute for certified survey deliverables." />
          </h3>
        </div>
      </header>

      <div className="targetlock-settings-form-card-body">
        <p className="targetlock-settings-form-card-copy">
          Preset accuracy and site conditions used to flag when the next survey should be confirmed.
          Adjust only if your tool spec or ground conditions differ.
        </p>

        {assessment ? (
          <div
            className={`targetlock-survey-assessment targetlock-survey-assessment--${assessmentLevel}`}
            role="status"
          >
            <div className="targetlock-survey-assessment-head">
              <span className="targetlock-survey-assessment-level">
                {assessment.summaryLabel}
              </span>
              <span className="targetlock-survey-assessment-meta">
                ~{round(assessment.uncertaintyBandM, 1)} m band · {profile.toolName}
              </span>
            </div>
            <p className="targetlock-survey-assessment-note">{assessment.recommendationNote}</p>
          </div>
        ) : null}

        <fieldset className="targetlock-settings-form-group">
          <legend>Tool selection</legend>
          <label className="targetlock-settings-select-field">
            <span className="targetlock-settings-field-label">Tool preset</span>
            <div className="targetlock-settings-field-control targetlock-settings-field-control--text">
              <select
                className="targetlock-settings-select-input"
                value={profile.presetId}
                onChange={(e) => setPreset(e.target.value as SurveyToolPresetId)}
              >
                {PRESET_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </label>

          {custom ? (
            <label className="targetlock-settings-text-field">
              <span className="targetlock-settings-field-label">Tool name</span>
              <div className="targetlock-settings-field-control targetlock-settings-field-control--text">
                <input
                  type="text"
                  className="targetlock-settings-text-input"
                  value={profile.toolName}
                  onChange={(e) => setField("toolName", e.target.value)}
                />
              </div>
            </label>
          ) : (
            <p className="targetlock-survey-accuracy-summary" aria-label="Preset accuracy">
              {accuracySummary(profile)} · {NORTH_LABELS[profile.northReference]} ·{" "}
              {MAGNETIC_LABELS[profile.magneticRisk]} magnetic risk
            </p>
          )}
        </fieldset>

        {custom ? (
          <fieldset className="targetlock-settings-form-group">
            <legend>Custom accuracy</legend>
            <div className="targetlock-settings-form-grid targetlock-settings-form-grid--2">
              <SettingsNumberField
                label="Azimuth uncertainty"
                unit="°"
                value={profile.azimuthUncertaintyDeg}
                min={0}
                max={5}
                step={0.01}
                tip="Typical azimuth uncertainty for this tool — used for survey uncertainty messaging, not certified QC."
                onChange={(v) => setField("azimuthUncertaintyDeg", v)}
              />
              <SettingsNumberField
                label="Dip uncertainty"
                unit="°"
                value={profile.dipUncertaintyDeg}
                min={0}
                max={5}
                step={0.01}
                tip="Typical dip uncertainty for this tool — informs caution on close tolerance decisions."
                onChange={(v) => setField("dipUncertaintyDeg", v)}
              />
            </div>
          </fieldset>
        ) : null}

        <fieldset className="targetlock-settings-form-group">
          <legend>Site conditions</legend>
          <div className="targetlock-settings-form-grid targetlock-settings-form-grid--2">
            <label className="targetlock-settings-select-field">
              <span className="targetlock-settings-field-label">North reference</span>
              <div className="targetlock-settings-field-control targetlock-settings-field-control--text">
                <select
                  className="targetlock-settings-select-input"
                  value={profile.northReference}
                  onChange={(e) =>
                    setField("northReference", e.target.value as NorthReference)
                  }
                >
                  <option value="grid">Grid</option>
                  <option value="true">True</option>
                  <option value="magnetic">Magnetic</option>
                </select>
              </div>
            </label>
            <label className="targetlock-settings-select-field">
              <span className="targetlock-settings-field-label">Magnetic risk</span>
              <div className="targetlock-settings-field-control targetlock-settings-field-control--text">
                <select
                  className="targetlock-settings-select-input"
                  value={profile.magneticRisk}
                  onChange={(e) =>
                    setField("magneticRisk", e.target.value as MagneticRisk)
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </label>
          </div>
        </fieldset>

        <fieldset className="targetlock-settings-form-group">
          <legend>Survey cadence</legend>
          <SettingsNumberField
            label="Confirm-next-survey margin"
            unit="m"
            value={profile.repeatSurveyThresholdM}
            min={0.5}
            max={10}
            step={0.1}
            tip="When projected miss is within this distance of target tolerance, the app recommends confirming the next survey."
            onChange={(v) => setField("repeatSurveyThresholdM", Math.max(0.1, v))}
          />
        </fieldset>

        {profile.presetId === "devigyro" ? (
          <p className="targetlock-survey-footnote">
            DeviGyro accuracy can vary with depth and configuration — switch to Custom if your
            run differs.
          </p>
        ) : null}
      </div>
    </article>
  );
}
