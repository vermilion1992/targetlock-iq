"use client";

import { useMemo } from "react";
import { SettingsNumberField } from "@/components/dashboard/SettingsNumberField";
import { SettingsTextField } from "@/components/dashboard/SettingsTextField";
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
import { PlannerStepCard } from "./PlannerStepCard";

type Props = {
  draft: PlannerDraft;
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
    <PlannerStepCard
      kicker="Collar"
      title="Collar coordinates"
      copy="Collar position and orientation reference for this hole. Grid collar plus grid target will derive local E/N/D offsets automatically."
      className="planner-coordinate-step"
    >
      <fieldset className="targetlock-settings-form-group">
        <legend>Reference frame</legend>
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
      </fieldset>

      {showGrid ? (
        <fieldset className="targetlock-settings-form-group">
          <legend>Grid collar</legend>
          <div className="targetlock-settings-form-grid targetlock-settings-form-grid--3">
            <SettingsNumberField
              label="Easting"
              unit="m"
              value={draft.collar?.easting ?? 0}
              step={0.1}
              slider={false}
              onChange={(v) => onChange(updateCollar(draft, { easting: v }))}
            />
            <SettingsNumberField
              label="Northing"
              unit="m"
              value={draft.collar?.northing ?? 0}
              step={0.1}
              slider={false}
              onChange={(v) => onChange(updateCollar(draft, { northing: v }))}
            />
            <SettingsNumberField
              label="Elevation / RL"
              unit="m"
              value={draft.collar?.elevation ?? 0}
              step={0.1}
              slider={false}
              onChange={(v) => onChange(updateCollar(draft, { elevation: v }))}
            />
          </div>
        </fieldset>
      ) : (
        <p className="targetlock-helper">
          Local collar-relative mode — collar is the plan origin (0, 0, 0). Enter target offsets
          from this collar in the next step.
        </p>
      )}

      {showOptionalGps ? (
        <fieldset className="targetlock-settings-form-group">
          <legend>WGS84 (optional)</legend>
          <div className="targetlock-settings-form-grid targetlock-settings-form-grid--2">
            <SettingsTextField
              label="Latitude"
              value={
                draft.collar?.latitude !== undefined ? String(draft.collar.latitude) : ""
              }
              placeholder="Optional"
              onChange={(raw) =>
                onChange(
                  updateCollar(draft, {
                    latitude: raw === "" ? undefined : parseNum(raw, NaN),
                  })
                )
              }
            />
            <SettingsTextField
              label="Longitude"
              value={
                draft.collar?.longitude !== undefined ? String(draft.collar.longitude) : ""
              }
              placeholder="Optional"
              onChange={(raw) =>
                onChange(
                  updateCollar(draft, {
                    longitude: raw === "" ? undefined : parseNum(raw, NaN),
                  })
                )
              }
            />
          </div>
          {showGrid && resolvedGrid ? (
            <div className="planner-collar-geodesy">
              <div className="planner-collar-geodesy-actions">
                <button
                  type="button"
                  className="targetlock-btn targetlock-btn-sm"
                  onClick={handleEastNorthFromLatLon}
                  disabled={!hasLatLon}
                >
                  Compute E/N from lat/long
                </button>
                <button
                  type="button"
                  className="targetlock-btn targetlock-btn-sm"
                  onClick={handleLatLonFromEastNorth}
                  disabled={!hasEastNorth}
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
            <p className="targetlock-helper">
              Program grid “{pcs.epsgCode}” isn’t a recognized EPSG grid — lat/long ⇄ E/N
              conversion unavailable (metadata only).
            </p>
          ) : null}
        </fieldset>
      ) : null}

      <fieldset className="targetlock-settings-form-group">
        <legend>Provenance</legend>
        <SettingsTextField
          label="Coordinate source / notes"
          value={draft.coordinateSourceNotes ?? ""}
          placeholder="Survey contractor, pick-up method, grid zone…"
          onChange={(v) => onChange({ coordinateSourceNotes: v })}
        />
      </fieldset>

      {showGpsHonesty ? (
        <p className="planner-gps-honesty-inline">{GPS_COORDINATE_HONESTY_WARNING}</p>
      ) : null}
      {validationWarnings.map((w) => (
        <p key={w} className="planner-review-qa-blocker">
          {w}
        </p>
      ))}
    </PlannerStepCard>
  );
}
