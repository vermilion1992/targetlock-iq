"use client";

import { useState } from "react";
import { DEFAULT_PLANNER_QA_SETTINGS } from "@/lib/drilling/planner-qa";
import type { PlannerQaSettings } from "@/lib/drilling/planner-types";

type Props = {
  settings: PlannerQaSettings;
  onSave: (settings: PlannerQaSettings) => void;
};

export function PlannerQaSettingsPanel({ settings, onSave }: Props) {
  const [draft, setDraft] = useState<PlannerQaSettings>(settings);
  const [expanded, setExpanded] = useState(false);

  const update = (patch: Partial<PlannerQaSettings>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  return (
    <article className="targetlock-panel planner-qa-settings-panel">
      <div className="targetlock-panel-title">
        <h3>QA thresholds</h3>
        <button
          type="button"
          className="targetlock-link-btn"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Hide" : "Edit"}
        </button>
      </div>

      {!expanded ? (
        <p className="targetlock-panel-copy">
          Hole sep {settings.minHoleSeparationM} m · Mother-daughter{" "}
          {settings.minMotherDaughterSeparationM} m · Siblings{" "}
          {settings.minSiblingDaughterSeparationM} m · Sample every{" "}
          {settings.sampleIntervalM} m · SF risk &lt;{" "}
          {settings.separationFactorRisk ??
            DEFAULT_PLANNER_QA_SETTINGS.separationFactorRisk}
        </p>
      ) : (
        <div className="planner-qa-settings-form">
          <label className="targetlock-survey-field">
            <span>Min hole separation (m)</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={draft.minHoleSeparationM}
              onChange={(e) =>
                update({ minHoleSeparationM: Number(e.target.value) })
              }
            />
          </label>
          <label className="targetlock-survey-field">
            <span>Min mother-daughter separation (m)</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={draft.minMotherDaughterSeparationM}
              onChange={(e) =>
                update({ minMotherDaughterSeparationM: Number(e.target.value) })
              }
            />
          </label>
          <label className="targetlock-survey-field">
            <span>Min sibling daughter separation (m)</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={draft.minSiblingDaughterSeparationM}
              onChange={(e) =>
                update({ minSiblingDaughterSeparationM: Number(e.target.value) })
              }
            />
          </label>
          <label className="targetlock-survey-field">
            <span>Sample interval (m)</span>
            <input
              type="number"
              min={1}
              step={1}
              value={draft.sampleIntervalM}
              onChange={(e) =>
                update({ sampleIntervalM: Number(e.target.value) })
              }
            />
          </label>
          <label className="targetlock-survey-field">
            <span>Kickoff exclusion zone (m)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={draft.motherDaughterKickoffExclusionM}
              onChange={(e) =>
                update({
                  motherDaughterKickoffExclusionM: Number(e.target.value),
                })
              }
            />
          </label>
          <label className="targetlock-survey-field">
            <span>Max DLS (°/30 m)</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={draft.maxDls}
              onChange={(e) => update({ maxDls: Number(e.target.value) })}
            />
          </label>
          <label className="targetlock-survey-field">
            <span>Separation factor — watch below</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={
                draft.separationFactorWarn ??
                DEFAULT_PLANNER_QA_SETTINGS.separationFactorWarn
              }
              onChange={(e) =>
                update({ separationFactorWarn: Number(e.target.value) })
              }
            />
          </label>
          <label className="targetlock-survey-field">
            <span>Separation factor — risk below</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={
                draft.separationFactorRisk ??
                DEFAULT_PLANNER_QA_SETTINGS.separationFactorRisk
              }
              onChange={(e) =>
                update({ separationFactorRisk: Number(e.target.value) })
              }
            />
          </label>
          <label className="targetlock-survey-field">
            <span>Separation factor — block approval below</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={
                draft.separationFactorBlock ??
                DEFAULT_PLANNER_QA_SETTINGS.separationFactorBlock
              }
              onChange={(e) =>
                update({ separationFactorBlock: Number(e.target.value) })
              }
            />
          </label>
          <label className="targetlock-survey-field">
            <span>Uncertainty sigma factor</span>
            <input
              type="number"
              min={1}
              step={0.5}
              value={
                draft.uncertaintySigmaFactor ??
                DEFAULT_PLANNER_QA_SETTINGS.uncertaintySigmaFactor
              }
              onChange={(e) =>
                update({ uncertaintySigmaFactor: Number(e.target.value) })
              }
            />
          </label>
          <label className="targetlock-survey-field targetlock-survey-field--full">
            <span>
              <input
                type="checkbox"
                checked={draft.requireCoordinateMetadataBeforeApproval}
                onChange={(e) =>
                  update({
                    requireCoordinateMetadataBeforeApproval: e.target.checked,
                  })
                }
              />{" "}
              Require coordinate metadata before approval
            </span>
          </label>
          <div className="planner-qa-settings-actions">
            <button
              type="button"
              className="targetlock-btn targetlock-btn-secondary"
              onClick={() => setDraft(DEFAULT_PLANNER_QA_SETTINGS)}
            >
              Reset defaults
            </button>
            <button
              type="button"
              className="targetlock-btn targetlock-btn-primary"
              onClick={() => onSave(draft)}
            >
              Save thresholds
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
