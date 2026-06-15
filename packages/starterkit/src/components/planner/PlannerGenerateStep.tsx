"use client";

import { useMemo } from "react";
import { buildStations } from "@/lib/drilling/desurvey";
import { validateCoordinateInputs } from "@/lib/drilling/coordinate-system";
import { round } from "@/lib/drilling/format";
import { validatePlannerDraft } from "@/lib/drilling/planner";
import type { HoleLibrary } from "@/lib/drilling/hole-library";
import type { PlannerDraft } from "@/lib/drilling/planner-types";
import { PlannerPreview } from "./PlannerPreview";

type Props = {
  draft: PlannerDraft;
  library: HoleLibrary | null;
  onGenerate: () => void;
};

export function PlannerGenerateStep({ draft, library, onGenerate }: Props) {
  const preWarnings = useMemo(
    () => [
      ...validateCoordinateInputs(draft),
      ...validatePlannerDraft(draft, library),
    ],
    [draft, library]
  );

  const finalRecord = draft.planRecords.at(-1);
  const firstRecord = draft.planRecords[0];
  const stations = draft.planRecords.length ? buildStations(draft.planRecords) : [];
  const terminal = stations.at(-1);
  const generated = draft.planRecords.length > 0;

  return (
    <div className="planner-generate-step">
      <article className="targetlock-panel planner-step-panel">
        <div className="targetlock-panel-title">
          <h2>Generate + review</h2>
        </div>
        <p className="targetlock-panel-copy">
          Build a straight planned survey path at the configured interval. Coordinate warnings
          are shown before saving.
        </p>

        {preWarnings.length ? (
          <ul className="planner-coordinate-warnings" role="status">
            {preWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : (
          <p className="targetlock-helper">Inputs look complete — ready to generate.</p>
        )}

        <button
          type="button"
          className="targetlock-btn targetlock-btn-primary"
          onClick={onGenerate}
        >
          Generate planned surveys
        </button>

        {generated ? (
          <dl className="planner-review-grid planner-generate-metrics">
            <div>
              <dt>Planned TD</dt>
              <dd>{finalRecord ? `${round(finalRecord.md, 0)} m` : "—"}</dd>
            </div>
            <div>
              <dt>Planned dip / azimuth</dt>
              <dd>
                {firstRecord
                  ? `${round(firstRecord.dip, 1)}° / ${round(firstRecord.azimuth, 1)}°`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Station count</dt>
              <dd>{draft.planRecords.length}</dd>
            </div>
            {terminal ? (
              <div>
                <dt>Terminal offset</dt>
                <dd>
                  E {round(terminal.e, 1)} / N {round(terminal.n, 1)} / D{" "}
                  {round(terminal.d, 1)} m
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {draft.warnings.length ? (
          <div className="planner-warnings-block" role="status">
            <h3>Plan warnings</h3>
            <ul>
              {draft.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </article>

      {generated ? (
        <article className="targetlock-panel">
          <div className="targetlock-panel-title">
            <h3>Planned trace preview</h3>
          </div>
          <PlannerPreview planRecords={draft.planRecords} />
        </article>
      ) : null}
    </div>
  );
}
