"use client";

import { useMemo } from "react";
import { coordinateModeLabel, validateCoordinateInputs } from "@/lib/drilling/coordinate-system";
import { computeMagneticDeclination } from "@/lib/drilling/geomag";
import { gridConvergenceDeg, gridToLatLon, latLonToGrid, resolveGrid } from "@/lib/drilling/grid-crs";
import { GPS_COORDINATE_HONESTY_WARNING } from "@/lib/drilling/planner-coordinate-registry";
import type {
  PlannerCollar,
  PlannerCoordinateMode,
  PlannerDraft,
  PlannerNorthReference,
  PlannerProjectCoordinateSystem,
} from "@/lib/drilling/planner-types";
import { PlannerModeSwitch } from "./ui/PlannerModeSwitch";

type Props = {
  draft: PlannerDraft;
  /** Resolved program coordinate system (for lat/long ⇄ grid conversion). */
  pcs?: PlannerProjectCoordinateSystem;
  onChange: (patch: Partial<PlannerDraft>) => void;
};

const COORD_MODES: PlannerCoordinateMode[] = ["grid", "gps", "collar-relative"];
const NORTH_REFS: PlannerNorthReference[] = ["grid", "true", "magnetic"];

function parseNum(value: string, fallback = 0): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function updateCollar(
  draft: PlannerDraft,
  patch: Partial<PlannerCollar>
): Partial<PlannerDraft> {
  return {
    collar: {
      easting: draft.collar?.easting ?? 0,
      northing: draft.collar?.northing ?? 0,
      elevation: draft.collar?.elevation ?? 0,
      latitude: draft.collar?.latitude,
      longitude: draft.collar?.longitude,
      ...patch,
    },
  };
}

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function CollarStep({ draft, pcs, onChange }: Props) {
  const showGrid = draft.coordinateMode === "grid" || draft.coordinateMode === "gps";
  const showOptionalGps = draft.coordinateMode !== "collar-relative";
  const validationWarnings = validateCoordinateInputs(draft);
  const showGpsHonesty =
    draft.coordinateMode === "gps" ||
    (draft.collar?.latitude !== undefined && draft.collar?.longitude !== undefined);

  const resolvedGrid = useMemo(() => resolveGrid(pcs?.epsgCode), [pcs?.epsgCode]);
  const lat = draft.collar?.latitude;
  const lon = draft.collar?.longitude;
  const hasLatLon =
    lat !== undefined && lon !== undefined && Number.isFinite(lat) && Number.isFinite(lon);
  const hasEastNorth =
    Number.isFinite(draft.collar?.easting) && Number.isFinite(draft.collar?.northing);

  /** Read-only geodesy preview at the collar lat/long. */
  const geodesyPreview = useMemo(() => {
    if (!hasLatLon) return null;
    const parts: string[] = [];
    if (resolvedGrid) {
      const conv = gridConvergenceDeg(resolvedGrid.epsg, lat!, lon!);
      if (conv !== undefined) {
        parts.push(
          `${resolvedGrid.name}: convergence ${conv >= 0 ? "+" : ""}${conv.toFixed(2)}° (grid→true)`
        );
      }
    }
    try {
      const wmm = computeMagneticDeclination({
        latitudeDeg: lat!,
        longitudeDeg: lon!,
        date: new Date(),
      });
      parts.push(
        `declination ${wmm.declinationDeg >= 0 ? "+" : ""}${wmm.declinationDeg.toFixed(1)}° (${wmm.modelName})`
      );
    } catch {
      // out-of-range lat/long — validation warnings cover this
    }
    return parts.length ? parts.join(" · ") : null;
  }, [hasLatLon, resolvedGrid, lat, lon]);

  const handleEastNorthFromLatLon = () => {
    if (!resolvedGrid || !hasLatLon) return;
    const grid = latLonToGrid(resolvedGrid.epsg, { latitudeDeg: lat!, longitudeDeg: lon! });
    if (!grid) return;
    onChange(
      updateCollar(draft, {
        easting: round(grid.easting, 3),
        northing: round(grid.northing, 3),
      })
    );
  };

  const handleLatLonFromEastNorth = () => {
    if (!resolvedGrid || !hasEastNorth) return;
    const ll = gridToLatLon(resolvedGrid.epsg, {
      easting: draft.collar!.easting,
      northing: draft.collar!.northing,
    });
    if (!ll) return;
    onChange(
      updateCollar(draft, {
        latitude: round(ll.latitudeDeg, 7),
        longitude: round(ll.longitudeDeg, 7),
      })
    );
  };

  return (
    <article className="targetlock-panel planner-step-panel planner-coordinate-step">
      <div className="targetlock-panel-title">
        <h2>Collar coordinates</h2>
      </div>
      <p className="targetlock-panel-copy">
        Collar position and orientation reference for this hole. Grid collar plus grid target
        will derive local E/N/D offsets automatically.
      </p>

      <div className="planner-field-switch-row">
        <div className="planner-field-switch">
          <span className="planner-field-switch-label">Coordinate mode</span>
          <PlannerModeSwitch
            options={COORD_MODES.map((mode) => ({
              id: mode,
              label: coordinateModeLabel(mode),
            }))}
            value={draft.coordinateMode}
            onChange={(mode) =>
              onChange({ coordinateMode: mode as PlannerCoordinateMode })
            }
            label="Coordinate mode"
          />
        </div>
        <div className="planner-field-switch">
          <span className="planner-field-switch-label">North reference</span>
          <PlannerModeSwitch
            options={NORTH_REFS.map((ref) => ({
              id: ref,
              label:
                ref === "grid" ? "Grid north" : ref === "true" ? "True north" : "Magnetic north",
            }))}
            value={draft.northReference}
            onChange={(ref) =>
              onChange({ northReference: ref as PlannerNorthReference })
            }
            label="North reference"
          />
        </div>
      </div>

      <div className="targetlock-survey-fields planner-coordinate-fields">
        {showGrid ? (
          <div className="targetlock-survey-field-row planner-coordinate-grid-row">
            <label className="targetlock-survey-field">
              <span>Easting (m)</span>
              <input
                type="number"
                step="0.1"
                value={draft.collar?.easting ?? ""}
                onChange={(e) =>
                  onChange(updateCollar(draft, { easting: parseNum(e.target.value) }))
                }
              />
            </label>
            <label className="targetlock-survey-field">
              <span>Northing (m)</span>
              <input
                type="number"
                step="0.1"
                value={draft.collar?.northing ?? ""}
                onChange={(e) =>
                  onChange(updateCollar(draft, { northing: parseNum(e.target.value) }))
                }
              />
            </label>
            <label className="targetlock-survey-field">
              <span>Elevation / RL (m)</span>
              <input
                type="number"
                step="0.1"
                value={draft.collar?.elevation ?? ""}
                onChange={(e) =>
                  onChange(updateCollar(draft, { elevation: parseNum(e.target.value) }))
                }
              />
            </label>
          </div>
        ) : (
          <p className="targetlock-helper targetlock-survey-field--full">
            Local collar-relative mode — collar is the plan origin (0, 0, 0). Enter target
            offsets from this collar in the next step.
          </p>
        )}

        {showOptionalGps ? (
          <div className="targetlock-survey-field-row">
            <label className="targetlock-survey-field">
              <span>Latitude (optional, WGS84)</span>
              <input
                type="number"
                step="0.000001"
                value={draft.collar?.latitude ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChange(
                    updateCollar(draft, {
                      latitude: raw === "" ? undefined : parseNum(raw, NaN),
                    })
                  );
                }}
              />
            </label>
            <label className="targetlock-survey-field">
              <span>Longitude (optional, WGS84)</span>
              <input
                type="number"
                step="0.000001"
                value={draft.collar?.longitude ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChange(
                    updateCollar(draft, {
                      longitude: raw === "" ? undefined : parseNum(raw, NaN),
                    })
                  );
                }}
              />
            </label>
          </div>
        ) : null}

        {showGrid && resolvedGrid ? (
          <div className="planner-collar-geodesy targetlock-survey-field--full">
            <div className="planner-collar-geodesy-actions">
              <button
                type="button"
                className="targetlock-btn targetlock-btn-sm"
                onClick={handleEastNorthFromLatLon}
                disabled={!hasLatLon}
                title={
                  hasLatLon
                    ? `Project the lat/long onto ${resolvedGrid.name}`
                    : "Enter a collar lat/long first"
                }
              >
                Compute E/N from lat/long
              </button>
              <button
                type="button"
                className="targetlock-btn targetlock-btn-sm"
                onClick={handleLatLonFromEastNorth}
                disabled={!hasEastNorth}
                title={
                  hasEastNorth
                    ? `Inverse-project the E/N from ${resolvedGrid.name}`
                    : "Enter collar easting/northing first"
                }
              >
                Compute lat/long from E/N
              </button>
            </div>
            {geodesyPreview ? (
              <small className="planner-pcs-hint">{geodesyPreview}</small>
            ) : null}
          </div>
        ) : null}
        {showGrid && !resolvedGrid && pcs?.epsgCode?.trim() ? (
          <p className="targetlock-helper targetlock-survey-field--full">
            Program grid “{pcs.epsgCode}” isn’t a recognized EPSG grid — lat/long ⇄ E/N
            conversion unavailable (metadata only).
          </p>
        ) : null}

        <label className="targetlock-survey-field targetlock-survey-field--full">
          <span>Coordinate source / notes</span>
          <input
            type="text"
            value={draft.coordinateSourceNotes ?? ""}
            onChange={(e) => onChange({ coordinateSourceNotes: e.target.value })}
            placeholder="Survey contractor, pick-up method, grid zone…"
          />
        </label>
      </div>

      {showGpsHonesty ? (
        <p className="planner-gps-honesty-inline">{GPS_COORDINATE_HONESTY_WARNING}</p>
      ) : null}
      {validationWarnings.map((w) => (
        <p key={w} className="planner-review-qa-blocker">
          {w}
        </p>
      ))}
    </article>
  );
}
