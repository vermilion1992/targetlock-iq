"use client";

import { InfoTip } from "@/components/layout/InfoTip";
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
    <article className="targetlock-panel targetlock-survey-profile-panel">
      <div className="targetlock-panel-title">
        <h2>
          Survey tool profile{" "}
          <InfoTip tip="Tool accuracy assumptions for uncertainty-aware guidance — not a substitute for certified survey deliverables." />
        </h2>
      </div>
      <p className="targetlock-panel-copy">
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

      <div className="targetlock-survey-fields">
        <label className="targetlock-survey-field targetlock-survey-field--full">
          <span>Tool preset</span>
          <select
            value={profile.presetId}
            onChange={(e) => setPreset(e.target.value as SurveyToolPresetId)}
          >
            {PRESET_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        {custom ? (
          <label className="targetlock-survey-field targetlock-survey-field--full">
            <span>Tool name</span>
            <input
              type="text"
              value={profile.toolName}
              onChange={(e) => setField("toolName", e.target.value)}
            />
          </label>
        ) : (
          <p className="targetlock-survey-accuracy-summary" aria-label="Preset accuracy">
            {accuracySummary(profile)} · {NORTH_LABELS[profile.northReference]} ·{" "}
            {MAGNETIC_LABELS[profile.magneticRisk]} magnetic risk
          </p>
        )}

        {custom ? (
          <div className="targetlock-survey-field-row">
            <label className="targetlock-survey-field">
              <span>Azimuth ± (°)</span>
              <input
                type="number"
                step={0.01}
                value={profile.azimuthUncertaintyDeg}
                onChange={(e) =>
                  setField("azimuthUncertaintyDeg", Number(e.target.value))
                }
              />
            </label>
            <label className="targetlock-survey-field">
              <span>Dip ± (°)</span>
              <input
                type="number"
                step={0.01}
                value={profile.dipUncertaintyDeg}
                onChange={(e) =>
                  setField("dipUncertaintyDeg", Number(e.target.value))
                }
              />
            </label>
          </div>
        ) : null}

        <div className="targetlock-survey-field-row">
          <label className="targetlock-survey-field">
            <span>North reference</span>
            <select
              value={profile.northReference}
              onChange={(e) =>
                setField("northReference", e.target.value as NorthReference)
              }
            >
              <option value="grid">Grid</option>
              <option value="true">True</option>
              <option value="magnetic">Magnetic</option>
            </select>
          </label>
          <label className="targetlock-survey-field">
            <span>Magnetic risk</span>
            <select
              value={profile.magneticRisk}
              onChange={(e) =>
                setField("magneticRisk", e.target.value as MagneticRisk)
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <label className="targetlock-survey-field targetlock-survey-field--full">
          <span>
            Confirm-next-survey margin (m){" "}
            <InfoTip tip="When projected miss is within this distance of target tolerance, the app recommends confirming the next survey." />
          </span>
          <input
            type="number"
            step={0.1}
            min={0.1}
            value={profile.repeatSurveyThresholdM}
            onChange={(e) =>
              setField("repeatSurveyThresholdM", Math.max(0.1, Number(e.target.value)))
            }
          />
        </label>
      </div>

      {profile.presetId === "devigyro" ? (
        <p className="targetlock-survey-footnote">
          DeviGyro accuracy can vary with depth and configuration — switch to Custom if your
          run differs.
        </p>
      ) : null}
    </article>
  );
}
