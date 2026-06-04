"use client";

import { useState } from "react";
import {
  DEFAULT_SYNTHETIC_PARAMS,
  DRIFT_PATTERN_LABELS,
  syntheticHoleToProject,
  type DriftPattern,
  type SyntheticHoleParams,
} from "@/lib/drilling/synthetic-hole-builder";
import { validateSyntheticHoleParams } from "@/lib/drilling/workspace-action-contract";

type Props = {
  onGenerate: (params: SyntheticHoleParams) => Promise<boolean>;
};

export function ScenarioCustomBuilder({ onGenerate }: Props) {
  const [params, setParams] = useState<SyntheticHoleParams>({
    ...DEFAULT_SYNTHETIC_PARAMS,
  });
  const [preview, setPreview] = useState<string | null>(null);
  const validation = validateSyntheticHoleParams(params);
  const canGenerate = validation.ok;

  const update = <K extends keyof SyntheticHoleParams>(
    key: K,
    value: SyntheticHoleParams[K]
  ) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handlePreview = () => {
    const project = syntheticHoleToProject(params);
    setPreview(
      `Plan: ${project.planRecords.length} stations · Actual: ${project.actualRecords.length} surveys · Target MD ${project.target.md} m`
    );
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    const loaded = await onGenerate(params);
    if (loaded) {
      setPreview("Scenario generated and loaded.");
    }
  };

  return (
    <div className="scenario-lab-custom">
      <div className="tl-modal-panel">
        <section className="tl-modal-panel-section">
          <h3 className="tl-modal-panel-section-title">Hole setup</h3>
          <div className="scenario-lab-field-grid">
            <label className="scenario-lab-field span-2">
              <span>Hole name</span>
              <input
                type="text"
                value={params.holeName}
                onChange={(e) => update("holeName", e.target.value)}
              />
            </label>
            <label className="scenario-lab-field">
              <span>Start dip (°)</span>
              <input
                type="number"
                step={0.1}
                value={params.startDip}
                onChange={(e) => update("startDip", Number(e.target.value))}
              />
            </label>
            <label className="scenario-lab-field">
              <span>Start azimuth (°)</span>
              <input
                type="number"
                step={0.1}
                value={params.startAzimuth}
                onChange={(e) => update("startAzimuth", Number(e.target.value))}
              />
            </label>
            <label className="scenario-lab-field">
              <span>Target depth (m)</span>
              <input
                type="number"
                step={1}
                value={params.targetMd}
                onChange={(e) => update("targetMd", Number(e.target.value))}
              />
            </label>
            <label className="scenario-lab-field">
              <span>Survey interval (m)</span>
              <input
                type="number"
                step={1}
                value={params.surveyInterval}
                onChange={(e) =>
                  update("surveyInterval", Math.max(1, Number(e.target.value)))
                }
              />
            </label>
          </div>
        </section>

        <section className="tl-modal-panel-section">
          <h3 className="tl-modal-panel-section-title">Planned path</h3>
          <div className="scenario-lab-field-grid">
            <label className="scenario-lab-field">
              <span>Lift / drop per interval (°)</span>
              <input
                type="number"
                step={0.05}
                value={params.plannedLiftDropPerInterval}
                onChange={(e) =>
                  update("plannedLiftDropPerInterval", Number(e.target.value))
                }
              />
            </label>
            <label className="scenario-lab-field">
              <span>Swing per interval (°)</span>
              <input
                type="number"
                step={0.05}
                value={params.plannedSwingPerInterval}
                onChange={(e) =>
                  update("plannedSwingPerInterval", Number(e.target.value))
                }
              />
            </label>
          </div>
        </section>

        <section className="tl-modal-panel-section">
          <h3 className="tl-modal-panel-section-title">Actual drift</h3>
          <div className="scenario-lab-field-grid">
            <label className="scenario-lab-field span-2">
              <span>Drift pattern</span>
              <select
                value={params.driftPattern}
                onChange={(e) => update("driftPattern", e.target.value as DriftPattern)}
              >
                {(Object.keys(DRIFT_PATTERN_LABELS) as DriftPattern[]).map((id) => (
                  <option key={id} value={id}>
                    {DRIFT_PATTERN_LABELS[id]}
                  </option>
                ))}
              </select>
            </label>
            <label className="scenario-lab-field">
              <span>Drift magnitude (°/interval)</span>
              <input
                type="number"
                step={0.05}
                value={params.driftMagnitudePerInterval ?? 0.35}
                onChange={(e) =>
                  update("driftMagnitudePerInterval", Number(e.target.value))
                }
              />
            </label>
            <div className="scenario-lab-field scenario-lab-field--checkbox">
              <span className="scenario-lab-field-label">Survey uncertainty</span>
              <div className="scenario-lab-checkbox-row">
                <input
                  type="checkbox"
                  id="scenario-lab-survey-noise"
                  checked={Boolean(params.surveyNoise)}
                  onChange={(e) =>
                    update(
                      "surveyNoise",
                      e.target.checked
                        ? { dipSigmaDeg: 0.15, aziSigmaDeg: 0.15 }
                        : null
                    )
                  }
                />
                <label htmlFor="scenario-lab-survey-noise">Add survey noise</label>
              </div>
            </div>
          </div>
        </section>

        <section className="tl-modal-panel-section tl-modal-panel-section--last">
          <h3 className="tl-modal-panel-section-title">Labelling</h3>
          <div className="scenario-lab-field-grid">
            <label className="scenario-lab-field span-2">
              <span>Expected outcome (optional)</span>
              <input
                type="text"
                value={params.expectedOutcomeLabel ?? ""}
                placeholder="e.g. Watch — gradual lift"
                onChange={(e) => update("expectedOutcomeLabel", e.target.value)}
              />
            </label>
          </div>
        </section>
      </div>

      {preview ? (
        <p className="scenario-lab-custom-status" role="status">
          {preview}
        </p>
      ) : null}

      {!canGenerate ? (
        <p className="scenario-lab-custom-status scenario-lab-custom-status--error" role="alert">
          {validation.ok ? null : validation.error}
        </p>
      ) : null}

      <div className="scenario-lab-custom-actions">
        <button type="button" className="targetlock-btn" onClick={handlePreview}>
          Preview
        </button>
        <button
          type="button"
          className="targetlock-btn targetlock-btn-primary"
          onClick={handleGenerate}
          disabled={!canGenerate}
          title={canGenerate ? undefined : validation.ok ? undefined : validation.error}
        >
          Generate scenario
        </button>
      </div>
    </div>
  );
}
