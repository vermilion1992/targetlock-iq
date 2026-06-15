"use client";

import { useMemo } from "react";
import {
  resolveProgramCoordinateSystem,
  type HoleLibrary,
} from "@/lib/drilling/hole-library";
import {
  buildDaughterKickoffRows,
  buildProgramCollarRows,
  buildProgramTargetRows,
  GPS_COORDINATE_HONESTY_WARNING,
  shouldShowGpsHonestyWarning,
} from "@/lib/drilling/planner-coordinate-registry";
import { holesInProgram } from "@/lib/drilling/planner-program";
import {
  downloadProgramCollarCsv,
  downloadProgramCoordinateSystemCsv,
  downloadProgramDaughterCsv,
  downloadProgramTargetCsv,
} from "@/lib/drilling/planner-export";
import type { PlannerProjectCoordinateSystem } from "@/lib/drilling/planner-types";
import { firstCollarLatLon } from "@/lib/drilling/coordinate-system";
import { ProjectCoordinatePanel } from "./ProjectCoordinatePanel";
import { PlannerCoordinateStatusBadge } from "./PlannerCoordinateStatusBadge";
import { PlannerSectionHeader } from "./ui/PlannerSectionHeader";
import { PlannerWarningList } from "./ui/PlannerWarningList";

type Props = {
  library: HoleLibrary;
  programId: string | null;
  selectedHoleId?: string | null;
  onSaveProjectCoordinates: (
    programId: string,
    pcs: PlannerProjectCoordinateSystem | undefined
  ) => void;
  onSelectHole: (holeId: string) => void;
  onOpenReview: (holeId: string) => void;
  onImportPlanned?: () => void;
};

function formatNum(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

export function PlannerCoordinatesView({
  library,
  programId,
  selectedHoleId,
  onSaveProjectCoordinates,
  onSelectHole,
  onOpenReview,
  onImportPlanned,
}: Props) {
  const programHoles = useMemo(
    () => (programId ? holesInProgram(library, programId, true) : []),
    [library, programId]
  );

  const pcs = useMemo(
    () => (programId ? resolveProgramCoordinateSystem(programHoles) : undefined),
    [programHoles, programId]
  );

  const collarRows = useMemo(
    () => (programId ? buildProgramCollarRows(library, programId) : []),
    [library, programId]
  );

  const targetRows = useMemo(
    () => (programId ? buildProgramTargetRows(library, programId) : []),
    [library, programId]
  );

  const kickoffRows = useMemo(
    () => (programId ? buildDaughterKickoffRows(library, programId) : []),
    [library, programId]
  );

  const showGpsBanner = useMemo(() => {
    if (pcs?.mode === "gps") return true;
    return programHoles.some((h) => shouldShowGpsHonestyWarning(h, library));
  }, [pcs, programHoles, library]);

  const programName =
    programHoles[0]?.plannerMeta?.programName ?? "program";

  const coordinateWarnings = useMemo(() => {
    const items: string[] = [];
    for (const row of collarRows) {
      if (row.coordinateStatus !== "complete") {
        items.push(`${row.holeName}: collar coordinates ${row.coordinateStatus}.`);
      }
    }
    for (const row of targetRows) {
      if (row.coordinateStatus !== "complete") {
        items.push(`${row.holeName}: target coordinates ${row.coordinateStatus}.`);
      }
    }
    for (const row of kickoffRows) {
      if (row.warning) {
        items.push(`${row.holeName}: ${row.warning}`);
      }
    }
    return [...new Set(items)];
  }, [collarRows, targetRows, kickoffRows]);

  if (!programId) {
    return (
      <article className="targetlock-panel">
        <PlannerSectionHeader
          title="Coordinates"
          subtitle="Project coordinate system, collars, targets, and daughter kickoffs."
        />
        <p className="targetlock-panel-copy">
          No program selected. Create plans or import a program to manage coordinates.
        </p>
      </article>
    );
  }

  return (
    <div className="planner-coordinates-view">
      <PlannerSectionHeader
        title="Coordinates"
        subtitle="Program-wide register for review and export — enter coordinates in Create."
        actions={
          <div className="targetlock-btn-row">
            {onImportPlanned ? (
              <button
                type="button"
                className="targetlock-btn targetlock-btn-sm"
                onClick={onImportPlanned}
              >
                Import CSV
              </button>
            ) : null}
            <button
              type="button"
              className="targetlock-btn targetlock-btn-sm"
              disabled={!collarRows.length}
              onClick={() => downloadProgramCollarCsv(library, programId, programName)}
            >
              Collars CSV
            </button>
            <button
              type="button"
              className="targetlock-btn targetlock-btn-sm"
              disabled={!targetRows.length}
              onClick={() => downloadProgramTargetCsv(library, programId, programName)}
            >
              Targets CSV
            </button>
            <button
              type="button"
              className="targetlock-btn targetlock-btn-sm"
              disabled={!kickoffRows.length}
              onClick={() => downloadProgramDaughterCsv(library, programId, programName)}
            >
              Daughters CSV
            </button>
            <button
              type="button"
              className="targetlock-btn targetlock-btn-sm"
              onClick={() =>
                downloadProgramCoordinateSystemCsv(library, programId, programName)
              }
            >
              PCS CSV
            </button>
          </div>
        }
      />

      {showGpsBanner ? (
        <p className="planner-gps-honesty-banner" role="status">
          {GPS_COORDINATE_HONESTY_WARNING}
        </p>
      ) : null}

      <PlannerWarningList
        title="Coordinate warnings"
        items={coordinateWarnings}
        variant="watch"
      />

      {programId ? (
        <ProjectCoordinatePanel
          compact={false}
          pcs={pcs}
          fallbackLatLon={firstCollarLatLon(programHoles)}
          onSave={(next) => onSaveProjectCoordinates(programId, next)}
        />
      ) : null}

      <article className="targetlock-panel">
        <div className="targetlock-panel-title">
          <h3>Collar coordinates</h3>
        </div>
        {collarRows.length ? (
          <div className="planner-table-wrap">
            <table className="planner-table planner-coord-table">
              <thead>
                <tr>
                  <th>Hole</th>
                  <th>Type</th>
                  <th>Easting</th>
                  <th>Northing</th>
                  <th>RL</th>
                  <th>Lat</th>
                  <th>Lon</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {collarRows.map((row) => (
                  <tr
                    key={row.holeId}
                    className={selectedHoleId === row.holeId ? "selected" : ""}
                    onClick={() => onSelectHole(row.holeId)}
                  >
                    <td>{row.holeName}</td>
                    <td>{row.planType}</td>
                    <td>{formatNum(row.easting)}</td>
                    <td>{formatNum(row.northing)}</td>
                    <td>{formatNum(row.elevation)}</td>
                    <td>{row.latitude !== null ? row.latitude?.toFixed(5) : "—"}</td>
                    <td>{row.longitude !== null ? row.longitude?.toFixed(5) : "—"}</td>
                    <td>{row.coordinateMode}</td>
                    <td>
                      <PlannerCoordinateStatusBadge status={row.coordinateStatus} />
                    </td>
                    <td>{row.collarSource}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="targetlock-panel-copy">No planned holes in this program.</p>
        )}
      </article>

      <article className="targetlock-panel">
        <div className="targetlock-panel-title">
          <h3>Target coordinates</h3>
        </div>
        {targetRows.length ? (
          <div className="planner-table-wrap">
            <table className="planner-table planner-coord-table">
              <thead>
                <tr>
                  <th>Hole</th>
                  <th>MD</th>
                  <th>Grid E</th>
                  <th>Grid N</th>
                  <th>Grid RL</th>
                  <th>Local E</th>
                  <th>Local N</th>
                  <th>Local D</th>
                  <th>Tol</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {targetRows.map((row) => (
                  <tr
                    key={row.holeId}
                    className={selectedHoleId === row.holeId ? "selected" : ""}
                    onClick={() => onSelectHole(row.holeId)}
                  >
                    <td>{row.holeName}</td>
                    <td>{formatNum(row.targetMd)}</td>
                    <td>{formatNum(row.targetEasting)}</td>
                    <td>{formatNum(row.targetNorthing)}</td>
                    <td>{formatNum(row.targetElevation)}</td>
                    <td>{formatNum(row.localE)}</td>
                    <td>{formatNum(row.localN)}</td>
                    <td>{formatNum(row.localD)}</td>
                    <td>{row.tolerance}</td>
                    <td>
                      <PlannerCoordinateStatusBadge status={row.coordinateStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="targetlock-panel-copy">No targets defined yet.</p>
        )}
      </article>

      {kickoffRows.length ? (
        <article className="targetlock-panel">
          <div className="targetlock-panel-title">
            <h3>Daughter kickoff coordinates</h3>
          </div>
          <div className="planner-table-wrap">
            <table className="planner-table planner-coord-table">
              <thead>
                <tr>
                  <th>Daughter</th>
                  <th>Mother</th>
                  <th>Kickoff MD</th>
                  <th>Local E</th>
                  <th>Local N</th>
                  <th>Local D</th>
                  <th>Grid E</th>
                  <th>Grid N</th>
                  <th>Grid RL</th>
                  <th>Dip</th>
                  <th>Az</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {kickoffRows.map((row) => (
                  <tr
                    key={row.holeId}
                    className={`${selectedHoleId === row.holeId ? "selected" : ""}${
                      row.motherSurveyMissing ? " planner-coord-row--warn" : ""
                    }`}
                    onClick={() => onSelectHole(row.holeId)}
                  >
                    <td>{row.holeName}</td>
                    <td>{row.motherHoleName}</td>
                    <td>{formatNum(row.kickoffMd)}</td>
                    <td>{formatNum(row.kickoffE)}</td>
                    <td>{formatNum(row.kickoffN)}</td>
                    <td>{formatNum(row.kickoffD)}</td>
                    <td>{formatNum(row.kickoffGridE)}</td>
                    <td>{formatNum(row.kickoffGridN)}</td>
                    <td>{formatNum(row.kickoffGridElevation)}</td>
                    <td>{formatNum(row.kickoffDip)}</td>
                    <td>{formatNum(row.kickoffAzimuth)}</td>
                    <td>{row.warning ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      {selectedHoleId ? (
        <div className="targetlock-btn-row">
          <button
            type="button"
            className="targetlock-btn targetlock-btn-sm"
            onClick={() => onOpenReview(selectedHoleId)}
          >
            Review selected plan
          </button>
        </div>
      ) : null}
    </div>
  );
}
