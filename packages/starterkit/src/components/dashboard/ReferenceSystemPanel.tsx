"use client";

import { InfoTip } from "@/components/layout/InfoTip";
import { SettingsNumberField } from "@/components/dashboard/SettingsNumberField";
import {
  type NorthReference,
  type ReferenceSystemConfig,
  type ReferenceWarning,
} from "@/lib/drilling/reference-system";

type Props = {
  config: ReferenceSystemConfig;
  warnings: ReferenceWarning[];
  onChange: (next: ReferenceSystemConfig) => void;
};

const NORTH_OPTIONS: { id: NorthReference; label: string }[] = [
  { id: "grid", label: "Grid North" },
  { id: "true", label: "True North" },
  { id: "magnetic", label: "Magnetic North" },
];

export function ReferenceSystemPanel({ config, warnings, onChange }: Props) {
  const setField = <K extends keyof ReferenceSystemConfig>(
    key: K,
    value: ReferenceSystemConfig[K]
  ) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <article className="targetlock-settings-form-card targetlock-reference-system-panel">
      <header className="targetlock-settings-form-card-head">
        <div className="targetlock-form-card-head-text">
          <p className="targetlock-settings-form-card-kicker">North reference</p>
          <h3 className="targetlock-settings-form-card-title">
            Survey reference system{" "}
            <InfoTip tip="Define how plan and survey azimuths relate to north before TargetLock converts everything to true north for trajectory math." />
          </h3>
        </div>
      </header>

      <div className="targetlock-settings-form-card-body">
        <p className="targetlock-settings-form-card-copy">
          TargetLock converts all azimuths into one internal reference before calculating
          trajectory. This helps avoid errors when plan azimuths, mine grid azimuths, and survey
          camera azimuths use different north references.
        </p>

        {warnings.length > 0 ? (
          <div className="targetlock-reference-warnings" role="status">
            {warnings.map((warning) => (
              <div
                key={warning.id}
                className={`targetlock-survey-assessment targetlock-survey-assessment--${
                  warning.severity === "warning" ? "caution" : "normal"
                }`}
              >
                <div className="targetlock-survey-assessment-head">
                  <span className="targetlock-survey-assessment-level">
                    {warning.severity === "warning" ? "Reference warning" : "Reference note"}
                  </span>
                </div>
                <p className="targetlock-survey-assessment-note">{warning.message}</p>
              </div>
            ))}
          </div>
        ) : null}

        <fieldset className="targetlock-settings-form-group">
          <legend>Input references</legend>
          <div className="targetlock-settings-form-grid targetlock-settings-form-grid--2">
            <label className="targetlock-settings-select-field">
              <span className="targetlock-settings-field-label">Reference used by plan</span>
              <div className="targetlock-settings-field-control targetlock-settings-field-control--text">
                <select
                  className="targetlock-settings-select-input"
                  value={config.planReference}
                  onChange={(e) => setField("planReference", e.target.value as NorthReference)}
                >
                  {NORTH_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="targetlock-settings-select-field">
              <span className="targetlock-settings-field-label">Reference used by survey camera</span>
              <div className="targetlock-settings-field-control targetlock-settings-field-control--text">
                <select
                  className="targetlock-settings-select-input"
                  value={config.surveyReference}
                  onChange={(e) => setField("surveyReference", e.target.value as NorthReference)}
                >
                  {NORTH_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>
        </fieldset>

        <fieldset className="targetlock-settings-form-group">
          <legend>Conversion offsets</legend>
          <div className="targetlock-settings-form-grid targetlock-settings-form-grid--2">
            <SettingsNumberField
              label="Mine grid rotation"
              unit="°"
              value={config.gridRotationDeg}
              min={-45}
              max={45}
              step={0.1}
              onChange={(v) => setField("gridRotationDeg", v)}
            />
            <SettingsNumberField
              label="Magnetic declination"
              unit="°"
              value={config.magneticDeclinationDeg}
              min={-30}
              max={30}
              step={0.1}
              onChange={(v) => setField("magneticDeclinationDeg", v)}
            />
          </div>
        </fieldset>

        <fieldset className="targetlock-settings-form-group">
          <legend>Output</legend>
          <div className="targetlock-settings-form-grid targetlock-settings-form-grid--2">
            <label className="targetlock-settings-select-field">
              <span className="targetlock-settings-field-label">Display output in</span>
              <div className="targetlock-settings-field-control targetlock-settings-field-control--text">
                <select
                  className="targetlock-settings-select-input"
                  value={config.outputReference}
                  onChange={(e) => setField("outputReference", e.target.value as NorthReference)}
                >
                  {NORTH_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <div className="targetlock-settings-readonly-field">
              <span className="targetlock-settings-field-label">Internal calculation reference</span>
              <div className="targetlock-settings-field-control targetlock-settings-field-control--readonly">
                <strong>True North</strong>
              </div>
            </div>
          </div>
        </fieldset>

        <div
          className="targetlock-survey-assessment targetlock-survey-assessment--normal"
          role="note"
        >
          <div className="targetlock-survey-assessment-head">
            <span className="targetlock-survey-assessment-level">Field validation</span>
          </div>
          <p className="targetlock-survey-assessment-note">
            Ask your operations manager: &ldquo;Does the grid / true / magnetic section match how
            your site handles survey data?&rdquo; Confirm grid rotation and magnetic declination
            against site survey procedures before relying on guidance.
          </p>
        </div>
      </div>
    </article>
  );
}
