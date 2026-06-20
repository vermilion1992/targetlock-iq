"use client";

import { TargetLockFormCard } from "@/components/targetlock/TargetLockFormCard";
import { useEffect, useMemo, useState } from "react";
import { normalizeProjectCoordinateSystem } from "@/lib/drilling/coordinate-system";
import { computeMagneticDeclination } from "@/lib/drilling/geomag";
import {
  gridConvergenceDeg,
  listGrids,
  resolveGrid,
  suggestGridForLatLon,
} from "@/lib/drilling/grid-crs";
import type { PlannerProjectCoordinateSystem } from "@/lib/drilling/planner-types";

type Props = {
  pcs?: PlannerProjectCoordinateSystem;
  compact?: boolean;
  /** Site lat/long fallback (e.g. first collar with GPS) for the auto buttons. */
  fallbackLatLon?: { latitudeDeg: number; longitudeDeg: number };
  onSave: (pcs: PlannerProjectCoordinateSystem | undefined) => void;
};

const MODES: PlannerProjectCoordinateSystem["mode"][] = ["local", "grid", "gps"];

function parseNum(value: string): number | undefined {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function ProjectCoordinatePanel({
  pcs,
  compact = false,
  fallbackLatLon,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<PlannerProjectCoordinateSystem>({
    mode: "local",
    ...pcs,
    projectOrigin: { ...pcs?.projectOrigin },
  });
  const [declinationNote, setDeclinationNote] = useState<string | null>(null);
  const [convergenceNote, setConvergenceNote] = useState<string | null>(null);

  useEffect(() => {
    setDraft({
      mode: pcs?.mode ?? "local",
      ...pcs,
      projectOrigin: { ...pcs?.projectOrigin },
    });
    setDeclinationNote(null);
    setConvergenceNote(null);
  }, [pcs]);

  const registryGrids = useMemo(() => listGrids(), []);
  const resolvedGrid = useMemo(() => resolveGrid(draft.epsgCode), [draft.epsgCode]);

  /** Lat/long the auto buttons act on: project origin first, else first collar. */
  const autoLatLon = useMemo(() => {
    const lat = draft.projectOrigin?.latitude;
    const lon = draft.projectOrigin?.longitude;
    if (lat !== undefined && lon !== undefined && Number.isFinite(lat) && Number.isFinite(lon)) {
      return { latitudeDeg: lat, longitudeDeg: lon, source: "project origin" };
    }
    if (fallbackLatLon) {
      return { ...fallbackLatLon, source: "first collar" };
    }
    return undefined;
  }, [draft.projectOrigin?.latitude, draft.projectOrigin?.longitude, fallbackLatLon]);

  const updateOrigin = (field: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      projectOrigin: {
        ...prev.projectOrigin,
        [field]: parseNum(value),
      },
    }));
  };

  const handleSuggestEpsg = () => {
    if (!autoLatLon) return;
    const suggestion = suggestGridForLatLon(autoLatLon.latitudeDeg, autoLatLon.longitudeDeg);
    if (!suggestion) return;
    setDraft((prev) => ({
      ...prev,
      epsgCode: `EPSG:${suggestion.epsg}`,
      gridName: prev.gridName?.trim() ? prev.gridName : suggestion.name,
    }));
  };

  const handleAutoDeclination = () => {
    if (!autoLatLon) return;
    const result = computeMagneticDeclination({
      latitudeDeg: autoLatLon.latitudeDeg,
      longitudeDeg: autoLatLon.longitudeDeg,
      date: new Date(),
    });
    setDraft((prev) => ({
      ...prev,
      magneticDeclinationDeg: round2(result.declinationDeg),
    }));
    const extras = result.warnings.length ? ` — ${result.warnings.join(" ")}` : "";
    setDeclinationNote(
      `${result.modelName} (epoch ${result.modelEpoch}) at ${autoLatLon.source}, ` +
        `${result.decimalYear.toFixed(2)}${extras}`
    );
  };

  const handleAutoConvergence = () => {
    if (!autoLatLon || !resolvedGrid) return;
    const conv = gridConvergenceDeg(
      resolvedGrid.epsg,
      autoLatLon.latitudeDeg,
      autoLatLon.longitudeDeg
    );
    if (conv === undefined) return;
    setDraft((prev) => ({ ...prev, gridConvergenceDeg: round2(conv) }));
    setConvergenceNote(
      `${resolvedGrid.name} at ${autoLatLon.source} (grid→true, east positive)`
    );
  };

  const handleSave = () => {
    const normalized = normalizeProjectCoordinateSystem(draft);
    onSave(normalized);
  };

  const epsgHint = draft.epsgCode?.trim()
    ? resolvedGrid
      ? `Recognized: ${resolvedGrid.name} (central meridian ${resolvedGrid.centralMeridianDeg}°)`
      : "Unrecognized grid — lat/long conversions unavailable, metadata only."
    : null;

  return (
    <TargetLockFormCard
      kicker="Coordinate system"
      title="Project coordinates"
      className={`planner-pcs-panel${compact ? " planner-pcs-panel--compact" : ""}`}
    >
      <p className="targetlock-form-card-copy">
        Metadata for grid/GPS display. TargetLock math stays collar-relative internally.
      </p>

      <div className="planner-pcs-form">
        <div className="targetlock-form-group planner-form-group">
          <h4 className="planner-form-group-title">Grid system</h4>
          <div className="targetlock-survey-fields">
            <label className="targetlock-survey-field">
              <span>Mode</span>
              <select
                value={draft.mode}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    mode: e.target.value as PlannerProjectCoordinateSystem["mode"],
                  }))
                }
              >
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            <label className="targetlock-survey-field">
              <span>Grid name</span>
              <input
                type="text"
                value={draft.gridName ?? ""}
                onChange={(e) => setDraft((prev) => ({ ...prev, gridName: e.target.value }))}
                placeholder="Mine grid A"
              />
            </label>

            <label className="targetlock-survey-field">
              <span>EPSG code</span>
              <div className="planner-pcs-field-action">
                <input
                  type="text"
                  list="planner-pcs-epsg-grids"
                  value={draft.epsgCode ?? ""}
                  onChange={(e) => setDraft((prev) => ({ ...prev, epsgCode: e.target.value }))}
                  placeholder="EPSG:7854"
                />
                <button
                  type="button"
                  className="targetlock-btn planner-pcs-auto-btn"
                  onClick={handleSuggestEpsg}
                  disabled={!autoLatLon}
                  title={
                    autoLatLon
                      ? `Suggest a grid from the ${autoLatLon.source} lat/long`
                      : "Enter an origin (or collar) lat/long to suggest a grid"
                  }
                >
                  Suggest
                </button>
              </div>
              <datalist id="planner-pcs-epsg-grids">
                {registryGrids.map((grid) => (
                  <option key={grid.epsg} value={`EPSG:${grid.epsg}`}>
                    {grid.name}
                  </option>
                ))}
              </datalist>
              {epsgHint ? <small className="planner-pcs-hint">{epsgHint}</small> : null}
            </label>
          </div>
        </div>

        <div className="targetlock-form-group planner-form-group">
          <h4 className="planner-form-group-title">Project origin</h4>
          <div className="targetlock-survey-fields">
            <label className="targetlock-survey-field">
              <span>Origin easting</span>
              <input
                type="number"
                value={draft.projectOrigin?.easting ?? ""}
                onChange={(e) => updateOrigin("easting", e.target.value)}
              />
            </label>

            <label className="targetlock-survey-field">
              <span>Origin northing</span>
              <input
                type="number"
                value={draft.projectOrigin?.northing ?? ""}
                onChange={(e) => updateOrigin("northing", e.target.value)}
              />
            </label>

            <label className="targetlock-survey-field">
              <span>Origin elevation</span>
              <input
                type="number"
                value={draft.projectOrigin?.elevation ?? ""}
                onChange={(e) => updateOrigin("elevation", e.target.value)}
              />
            </label>

            <label className="targetlock-survey-field">
              <span>Origin latitude</span>
              <input
                type="number"
                step="any"
                value={draft.projectOrigin?.latitude ?? ""}
                onChange={(e) => updateOrigin("latitude", e.target.value)}
              />
            </label>

            <label className="targetlock-survey-field">
              <span>Origin longitude</span>
              <input
                type="number"
                step="any"
                value={draft.projectOrigin?.longitude ?? ""}
                onChange={(e) => updateOrigin("longitude", e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="targetlock-form-group planner-form-group">
          <h4 className="planner-form-group-title">Magnetic &amp; convergence</h4>
          <div className="targetlock-survey-fields">
            <label className="targetlock-survey-field">
              <span>Magnetic declination (°)</span>
              <div className="planner-pcs-field-action">
                <input
                  type="number"
                  step="any"
                  value={draft.magneticDeclinationDeg ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      magneticDeclinationDeg: parseNum(e.target.value),
                    }))
                  }
                />
                <button
                  type="button"
                  className="targetlock-btn planner-pcs-auto-btn"
                  onClick={handleAutoDeclination}
                  disabled={!autoLatLon}
                  title={
                    autoLatLon
                      ? `Compute from WMM2025 at the ${autoLatLon.source} lat/long`
                      : "Enter an origin (or collar) lat/long to compute declination"
                  }
                >
                  Auto
                </button>
              </div>
              {declinationNote ? (
                <small className="planner-pcs-hint">{declinationNote}</small>
              ) : null}
            </label>

            <label className="targetlock-survey-field">
              <span>Grid convergence (°)</span>
              <div className="planner-pcs-field-action">
                <input
                  type="number"
                  step="any"
                  value={draft.gridConvergenceDeg ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      gridConvergenceDeg: parseNum(e.target.value),
                    }))
                  }
                />
                <button
                  type="button"
                  className="targetlock-btn planner-pcs-auto-btn"
                  onClick={handleAutoConvergence}
                  disabled={!autoLatLon || !resolvedGrid}
                  title={
                    !resolvedGrid
                      ? "Enter a recognized EPSG grid to compute convergence"
                      : autoLatLon
                        ? `Compute for ${resolvedGrid.name} at the ${autoLatLon.source} lat/long`
                        : "Enter an origin (or collar) lat/long to compute convergence"
                  }
                >
                  Auto
                </button>
              </div>
              {convergenceNote ? (
                <small className="planner-pcs-hint">{convergenceNote}</small>
              ) : null}
            </label>
          </div>
        </div>

        <div className="targetlock-form-group planner-form-group">
          <h4 className="planner-form-group-title">Notes</h4>
          <div className="targetlock-survey-fields">
            <label className="targetlock-survey-field targetlock-survey-field--full">
              <span>Datum &amp; reference notes</span>
              <textarea
                rows={compact ? 2 : 3}
                value={draft.notes ?? ""}
                onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="North reference, datum notes…"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="targetlock-form-actions planner-pcs-actions">
        <button
          type="button"
          className="targetlock-btn targetlock-btn-primary"
          onClick={handleSave}
        >
          Save project coordinates
        </button>
      </div>
    </TargetLockFormCard>
  );
}
