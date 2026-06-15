"use client";

import { resolveTargetEnu } from "@/lib/drilling/coordinate-system";
import type { PlannerDraft, PlannerTargetInputMode } from "@/lib/drilling/planner-types";

type Props = {
  draft: PlannerDraft;
  onChange: (patch: Partial<PlannerDraft>) => void;
};

function parseNum(value: string, fallback = 0): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

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

  return (
    <article className="targetlock-panel planner-step-panel planner-coordinate-step">
      <div className="targetlock-panel-title">
        <h2>{isDaughter ? "Daughter target coordinates" : "Target coordinates"}</h2>
      </div>
      <p className="targetlock-panel-copy">
        {isDaughter
          ? "Target position for the daughter leg. Offsets are from the resolved kickoff station."
          : "Target position for the planned path. Grid targets convert to collar-relative offsets when a grid collar is set."}
      </p>

      <div className="targetlock-survey-fields planner-coordinate-fields">
        <label className="targetlock-survey-field">
          <span>Target input mode</span>
          <select
            value={draft.target.inputMode}
            onChange={(e) =>
              onChange({
                target: {
                  ...draft.target,
                  inputMode: e.target.value as PlannerTargetInputMode,
                },
              })
            }
          >
            {inputModes.map((m) => (
              <option key={m} value={m}>
                {targetInputModeLabel(m, isDaughter)}
              </option>
            ))}
          </select>
        </label>

        <label className="targetlock-survey-field">
          <span>Target tolerance (m)</span>
          <input
            type="number"
            min={1}
            step="0.5"
            value={draft.target.tolerance}
            onChange={(e) =>
              onChange({
                target: {
                  ...draft.target,
                  tolerance: parseNum(e.target.value, 6),
                },
              })
            }
          />
        </label>

        {showMdOffset ? (
          <label className="targetlock-survey-field">
            <span>Target MD (m)</span>
            <input
              type="number"
              step="1"
              value={draft.target.md ?? ""}
              onChange={(e) =>
                onChange({
                  target: {
                    ...draft.target,
                    md: e.target.value === "" ? undefined : parseNum(e.target.value),
                  },
                })
              }
              placeholder="Along-hole depth"
            />
          </label>
        ) : (
          <label className="targetlock-survey-field">
            <span>{isDaughter ? "Target MD / estimated MD (m)" : "Target MD (optional, m)"}</span>
            <input
              type="number"
              step="1"
              value={draft.target.md ?? ""}
              onChange={(e) =>
                onChange({
                  target: {
                    ...draft.target,
                    md: e.target.value === "" ? undefined : parseNum(e.target.value),
                  },
                })
              }
              placeholder="Along-hole depth"
            />
          </label>
        )}

        {showGridTarget ? (
          <div className="targetlock-survey-field-row planner-coordinate-grid-row">
            <label className="targetlock-survey-field">
              <span>Target easting (m)</span>
              <input
                type="number"
                step="0.1"
                value={draft.target.e}
                onChange={(e) =>
                  onChange({
                    target: { ...draft.target, e: parseNum(e.target.value) },
                  })
                }
              />
            </label>
            <label className="targetlock-survey-field">
              <span>Target northing (m)</span>
              <input
                type="number"
                step="0.1"
                value={draft.target.n}
                onChange={(e) =>
                  onChange({
                    target: { ...draft.target, n: parseNum(e.target.value) },
                  })
                }
              />
            </label>
            <label className="targetlock-survey-field">
              <span>Target elevation / RL (m)</span>
              <input
                type="number"
                step="0.1"
                value={draft.target.d}
                onChange={(e) =>
                  onChange({
                    target: { ...draft.target, d: parseNum(e.target.value) },
                  })
                }
              />
            </label>
          </div>
        ) : null}

        {showLocalTarget ? (
          <div className="targetlock-survey-field-row planner-coordinate-grid-row">
            <label className="targetlock-survey-field">
              <span>Local E (m)</span>
              <input
                type="number"
                step="0.1"
                value={draft.target.e}
                onChange={(e) =>
                  onChange({
                    target: { ...draft.target, e: parseNum(e.target.value) },
                  })
                }
              />
            </label>
            <label className="targetlock-survey-field">
              <span>Local N (m)</span>
              <input
                type="number"
                step="0.1"
                value={draft.target.n}
                onChange={(e) =>
                  onChange({
                    target: { ...draft.target, n: parseNum(e.target.value) },
                  })
                }
              />
            </label>
            <label className="targetlock-survey-field">
              <span>Local D (m)</span>
              <input
                type="number"
                step="0.1"
                value={draft.target.d}
                onChange={(e) =>
                  onChange({
                    target: { ...draft.target, d: parseNum(e.target.value) },
                  })
                }
              />
            </label>
          </div>
        ) : null}

        {showMdOffset ? (
          <p className="targetlock-helper targetlock-survey-field--full">
            Target position is resolved along-hole from initial dip and azimuth at the specified
            MD.
          </p>
        ) : null}
      </div>

      <p className="targetlock-helper">
        Resolved local target: E {resolved.e.toFixed(1)} / N {resolved.n.toFixed(1)} / D{" "}
        {resolved.d.toFixed(1)} m
      </p>
      {resolved.warnings.map((w) => (
        <p key={w} className="planner-review-qa-blocker">
          {w}
        </p>
      ))}
    </article>
  );
}
