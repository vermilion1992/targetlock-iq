"use client";

import { PATH_DESIGN_LABELS, type PathDesignType } from "@/lib/drilling/well-path-design";
import type { PlannerDraft } from "@/lib/drilling/planner-types";

type Props = {
  draft: PlannerDraft;
  onChange: (patch: Partial<PlannerDraft>) => void;
};

function parseNum(value: string, fallback = 0): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

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

  return (
    <article className="targetlock-panel planner-step-panel">
      <div className="targetlock-panel-title">
        <h2>Path constraints</h2>
      </div>
      <p className="targetlock-panel-copy">
        Survey interval and dogleg limits used when generating the planned path. TargetLock
        flags intervals that exceed the max DLS assumption.
      </p>

      <div className="targetlock-survey-fields">
        <label className="targetlock-survey-field targetlock-survey-field--full">
          <span>Path design</span>
          <select
            value={pathDesign}
            onChange={(e) =>
              onChange({
                constraints: {
                  ...draft.constraints,
                  pathDesign: e.target.value as PathDesignType,
                },
              })
            }
          >
            {(Object.keys(PATH_DESIGN_LABELS) as PathDesignType[]).map((id) => (
              <option key={id} value={id}>
                {PATH_DESIGN_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <p className="targetlock-helper targetlock-survey-field--full">
          {PATH_DESIGN_HELP[pathDesign]}
        </p>

        {pathDesign === "build-and-hold" ? (
          <div className="targetlock-survey-field-row">
            <label className="targetlock-survey-field">
              <span>Kickoff length (m)</span>
              <input
                type="number"
                min={0}
                step="10"
                value={draft.constraints.kickoffLengthM ?? 0}
                onChange={(e) =>
                  onChange({
                    constraints: {
                      ...draft.constraints,
                      kickoffLengthM: parseNum(e.target.value, 0),
                    },
                  })
                }
              />
            </label>
            <label className="targetlock-survey-field">
              <span>Build rate (°/30 m)</span>
              <input
                type="number"
                min={0.1}
                step="0.1"
                value={draft.constraints.buildRateDegPer30m ?? draft.constraints.maxDls}
                onChange={(e) =>
                  onChange({
                    constraints: {
                      ...draft.constraints,
                      buildRateDegPer30m: parseNum(
                        e.target.value,
                        draft.constraints.maxDls
                      ),
                    },
                  })
                }
              />
            </label>
          </div>
        ) : null}

        <label className="targetlock-survey-field">
          <span>Survey interval (m)</span>
          <input
            type="number"
            min={5}
            step="5"
            value={draft.constraints.surveyInterval}
            onChange={(e) =>
              onChange({
                constraints: {
                  ...draft.constraints,
                  surveyInterval: parseNum(e.target.value, 30),
                },
              })
            }
          />
        </label>

        <label className="targetlock-survey-field">
          <span>Max DLS (°/30 m)</span>
          <input
            type="number"
            min={0.5}
            step="0.5"
            value={draft.constraints.maxDls}
            onChange={(e) =>
              onChange({
                constraints: {
                  ...draft.constraints,
                  maxDls: parseNum(e.target.value, 3),
                },
              })
            }
          />
        </label>

        {isStandard ? (
          <div className="targetlock-survey-field-row">
            <label className="targetlock-survey-field">
              <span>Initial dip (°)</span>
              <input
                type="number"
                step="0.1"
                value={draft.initialDip ?? -60}
                onChange={(e) => onChange({ initialDip: parseNum(e.target.value, -60) })}
              />
            </label>
            <label className="targetlock-survey-field">
              <span>Initial azimuth (°)</span>
              <input
                type="number"
                step="0.1"
                value={draft.initialAzimuth ?? 0}
                onChange={(e) => onChange({ initialAzimuth: parseNum(e.target.value, 0) })}
              />
            </label>
          </div>
        ) : (
          <p className="targetlock-helper targetlock-survey-field--full">
            Daughter branch uses kickoff dip and azimuth from the mother actual survey path.
          </p>
        )}
      </div>
    </article>
  );
}
