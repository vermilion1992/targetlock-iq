"use client";

import { InfoTip } from "@/components/layout/InfoTip";
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

function parseNumericField(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ReferenceSystemPanel({ config, warnings, onChange }: Props) {
  const setField = <K extends keyof ReferenceSystemConfig>(
    key: K,
    value: ReferenceSystemConfig[K]
  ) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <article className="targetlock-panel targetlock-reference-system-panel">
      <div className="targetlock-panel-title">
        <h2>
          Survey reference system{" "}
          <InfoTip tip="Define how plan and survey azimuths relate to north before TargetLock converts everything to true north for trajectory math." />
        </h2>
      </div>

      <p className="targetlock-panel-copy">
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

      <div className="targetlock-survey-fields">
        <label className="targetlock-survey-field">
          <span>Reference used by plan</span>
          <select
            value={config.planReference}
            onChange={(e) => setField("planReference", e.target.value as NorthReference)}
          >
            {NORTH_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="targetlock-survey-field">
          <span>Reference used by survey camera</span>
          <select
            value={config.surveyReference}
            onChange={(e) => setField("surveyReference", e.target.value as NorthReference)}
          >
            {NORTH_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="targetlock-survey-field">
          <span>Mine grid rotation</span>
          <input
            type="number"
            step="0.1"
            value={config.gridRotationDeg}
            onChange={(e) => setField("gridRotationDeg", parseNumericField(e.target.value))}
          />
          <span className="targetlock-field-unit">°</span>
        </label>

        <label className="targetlock-survey-field">
          <span>Magnetic declination</span>
          <input
            type="number"
            step="0.1"
            value={config.magneticDeclinationDeg}
            onChange={(e) =>
              setField("magneticDeclinationDeg", parseNumericField(e.target.value))
            }
          />
          <span className="targetlock-field-unit">°</span>
        </label>

        <label className="targetlock-survey-field">
          <span>Display output in</span>
          <select
            value={config.outputReference}
            onChange={(e) => setField("outputReference", e.target.value as NorthReference)}
          >
            {NORTH_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="targetlock-survey-field targetlock-survey-field--readonly">
          <span>Internal calculation reference</span>
          <strong>True North</strong>
        </div>
      </div>

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
    </article>
  );
}
