"use client";

import { useMemo } from "react";
import type { HoleLibrary } from "@/lib/drilling/hole-library";
import {
  gridTargetFromCollarRelative,
  resolveTargetEnu,
  validateCoordinateInputs,
} from "@/lib/drilling/coordinate-system";
import { GPS_COORDINATE_HONESTY_WARNING } from "@/lib/drilling/planner-coordinate-registry";
import { buildCoordinateCardData } from "@/lib/drilling/planner-spatial";
import type { PlannerDraft } from "@/lib/drilling/planner-types";
import type { SavedHoleProject } from "@/lib/drilling/storage";
import { PlannerCoordinateCard } from "./PlannerCoordinateCard";
import { plannerStatus } from "@/lib/drilling/planner-status";

type DraftProps = {
  mode: "draft";
  draft: PlannerDraft;
};

type HoleProps = {
  mode: "hole";
  hole: SavedHoleProject;
  library: HoleLibrary;
};

type Props = DraftProps | HoleProps;

export function PlannerCoordinateSummary(props: Props) {
  if (props.mode === "hole") {
    const card = buildCoordinateCardData(props.hole, props.library);
    return (
      <PlannerCoordinateCard
        holeName={props.hole.holeName}
        status={plannerStatus(props.hole)}
        data={card}
      />
    );
  }

  const { draft } = props;
  const targetResolved = useMemo(() => resolveTargetEnu(draft), [draft]);
  const gridTarget =
    draft.collar && draft.coordinateMode !== "collar-relative"
      ? gridTargetFromCollarRelative(
          { e: targetResolved.e, n: targetResolved.n, d: targetResolved.d },
          draft.collar
        )
      : null;
  const validationWarnings = useMemo(() => validateCoordinateInputs(draft), [draft]);
  const showGpsHonesty =
    draft.coordinateMode === "gps" ||
    (draft.collar?.latitude !== undefined && draft.collar?.longitude !== undefined);

  return (
    <article className="targetlock-panel planner-coordinate-summary">
      <div className="targetlock-panel-title">
        <h3>Coordinate summary</h3>
      </div>
      <dl className="planner-review-grid">
        <div>
          <dt>Coordinate mode</dt>
          <dd>{draft.coordinateMode}</dd>
        </div>
        <div>
          <dt>North reference</dt>
          <dd>{draft.northReference}</dd>
        </div>
        <div>
          <dt>Collar</dt>
          <dd>
            {draft.collar
              ? `E ${draft.collar.easting.toFixed(1)}  N ${draft.collar.northing.toFixed(1)}  RL ${draft.collar.elevation.toFixed(1)}`
              : draft.coordinateMode === "collar-relative"
                ? "Local origin (0, 0, 0)"
                : "—"}
          </dd>
        </div>
        {draft.collar?.latitude !== undefined && draft.collar?.longitude !== undefined ? (
          <div>
            <dt>GPS</dt>
            <dd>
              {draft.collar.latitude.toFixed(6)}°, {draft.collar.longitude.toFixed(6)}°
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Target (local)</dt>
          <dd>
            E {targetResolved.e.toFixed(1)}  N {targetResolved.n.toFixed(1)}  D{" "}
            {targetResolved.d.toFixed(1)} m
          </dd>
        </div>
        {gridTarget ? (
          <div>
            <dt>Target (grid)</dt>
            <dd>
              E {gridTarget.e.toFixed(1)}  N {gridTarget.n.toFixed(1)}  RL{" "}
              {gridTarget.d.toFixed(1)} m
            </dd>
          </div>
        ) : null}
        {draft.daughterKickoff ? (
          <div className="planner-review-grid-item--full">
            <dt>Kickoff</dt>
            <dd>
              {draft.daughterKickoff.motherHoleName} @ MD {draft.daughterKickoff.kickoffMd.toFixed(1)}{" "}
              — E {draft.daughterKickoff.e.toFixed(1)} N {draft.daughterKickoff.n.toFixed(1)} D{" "}
              {draft.daughterKickoff.d.toFixed(1)}
            </dd>
          </div>
        ) : null}
        {draft.coordinateSourceNotes?.trim() ? (
          <div className="planner-review-grid-item--full">
            <dt>Coordinate source</dt>
            <dd>{draft.coordinateSourceNotes.trim()}</dd>
          </div>
        ) : null}
      </dl>
      {showGpsHonesty ? (
        <p className="planner-gps-honesty-inline">{GPS_COORDINATE_HONESTY_WARNING}</p>
      ) : null}
      {validationWarnings.length || targetResolved.warnings.length ? (
        <ul className="planner-coordinate-warnings">
          {[...validationWarnings, ...targetResolved.warnings].map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
