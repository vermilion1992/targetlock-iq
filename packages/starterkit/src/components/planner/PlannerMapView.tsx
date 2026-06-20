"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect } from "react";
import type { HoleLibrary } from "@/lib/drilling/hole-library";
import { evaluatePlanReadiness } from "@/lib/drilling/planner-readiness";
import { getPlannerStatusDisplay } from "@/lib/drilling/planner-status-display";
import { derivePlannerPrograms, plannerHoleSummary } from "@/lib/drilling/planner-program";
import { buildSatelliteOverlayModel, findFirstGpsCapableHoleId } from "@/lib/drilling/satellite-map";
import {
  buildCoordinateCardData,
  buildPlannerMapModel,
  DEFAULT_MAP_LAYER_TOGGLE,
  selectRelatedHoleIds,
  type PlannerMapLayerToggle,
} from "@/lib/drilling/planner-spatial";
import type {
  PlannerClearancePair,
  PlannerQaReport,
} from "@/lib/drilling/planner-types";
import { PlannerCoordinateCard } from "./PlannerCoordinateCard";
import { PlannerMapLegend } from "./PlannerMapLegend";
import { PlannerMapWarnings } from "./PlannerMapWarnings";
import { PlannerMiniMap, type PlannerMapFitMode } from "./PlannerMiniMap";
import { AdvancedTabHero } from "@/components/dashboard/AdvancedTabHero";
import { PlannerEmptyState } from "./ui/PlannerEmptyState";
import { PlannerModeSwitch } from "./ui/PlannerModeSwitch";
import { PlannerSubPanel } from "./ui/PlannerSubPanel";

const PlannerSatelliteMap = dynamic(
  () =>
    import("./PlannerSatelliteMap").then((mod) => ({
      default: mod.PlannerSatelliteMap,
    })),
  { ssr: false, loading: () => <p className="targetlock-panel-copy">Loading satellite map…</p> }
);

type MapViewMode = "local" | "satellite";

type Props = {
  library: HoleLibrary;
  selectedProgramId?: string | null;
  selectedHoleId?: string | null;
  qaReport?: PlannerQaReport | null;
  highlightedClearancePair?: PlannerClearancePair | null;
  onSelectHole: (holeId: string) => void;
  onOpenReview: (holeId: string) => void;
  onCreatePlan?: () => void;
};

export function PlannerMapView({
  library,
  selectedProgramId,
  selectedHoleId,
  qaReport,
  highlightedClearancePair,
  onSelectHole,
  onOpenReview,
  onCreatePlan,
}: Props) {
  const programs = useMemo(() => derivePlannerPrograms(library), [library]);
  const [activeProgramId, setActiveProgramId] = useState(
    selectedProgramId ?? programs[0]?.programId ?? ""
  );
  const [toggles, setToggles] = useState<PlannerMapLayerToggle>(DEFAULT_MAP_LAYER_TOGGLE);
  const [mapViewMode, setMapViewMode] = useState<MapViewMode>("local");
  const [mapFitMode, setMapFitMode] = useState<PlannerMapFitMode>("program");

  const programId = activeProgramId || programs[0]?.programId;

  const focusHoleIds = useMemo(() => {
    if (mapFitMode !== "selection" || !selectedHoleId || !programId) return undefined;
    return selectRelatedHoleIds(selectedHoleId, library, programId);
  }, [mapFitMode, selectedHoleId, programId, library]);

  const clearanceHighlights = useMemo(() => {
    const pairs = qaReport?.clearancePairs.filter((p) => p.severity === "risk") ?? [];
    if (highlightedClearancePair) {
      return [
        {
          holeAId: highlightedClearancePair.holeAId,
          holeBId: highlightedClearancePair.holeBId,
          mdA: highlightedClearancePair.mdA,
          mdB: highlightedClearancePair.mdB,
          severity: highlightedClearancePair.severity,
        },
      ];
    }
    return pairs.map((p) => ({
      holeAId: p.holeAId,
      holeBId: p.holeBId,
      mdA: p.mdA,
      mdB: p.mdB,
      severity: p.severity,
    }));
  }, [qaReport, highlightedClearancePair]);

  const model = useMemo(
    () =>
      programId
        ? buildPlannerMapModel(
            library,
            programId,
            toggles,
            selectedHoleId,
            clearanceHighlights
          )
        : null,
    [library, programId, toggles, selectedHoleId, clearanceHighlights]
  );

  const satelliteOverlay = useMemo(
    () =>
      programId
        ? buildSatelliteOverlayModel(library, programId, selectedHoleId, toggles)
        : null,
    [library, programId, selectedHoleId, toggles]
  );

  const selectedLayer = model?.layers.find((l) => l.holeId === selectedHoleId);

  const coordinateCard = useMemo(() => {
    if (!selectedHoleId || !model) return null;
    const hole = library.holes.find((h) => h.holeId === selectedHoleId);
    if (!hole) return null;
    return buildCoordinateCardData(hole, library, model.projectCoordinateSystem);
  }, [selectedHoleId, model, library]);

  const gpsDemoHoleId = useMemo(
    () => (programId ? findFirstGpsCapableHoleId(library, programId) : null),
    [library, programId]
  );

  useEffect(() => {
    if (selectedProgramId) setActiveProgramId(selectedProgramId);
  }, [selectedProgramId]);

  const selectedHole = selectedHoleId
    ? library.holes.find((h) => h.holeId === selectedHoleId)
    : null;
  const selectedReadiness =
    selectedHole ? evaluatePlanReadiness(selectedHole, library) : null;
  const selectedSummary = selectedHole
    ? plannerHoleSummary(selectedHole, library)
    : null;
  const selectedDisplay = selectedHole
    ? getPlannerStatusDisplay(selectedHole, library)
    : null;

  if (!programs.length) {
    return (
      <div className="planner-map-view">
        <AdvancedTabHero
          eyebrow="Visualise"
          title="Plan map"
          copy="Local plan view or satellite imagery — layers, clearance highlights, and selected hole context."
        />
        <PlannerEmptyState
          message="No planner programs yet. Use Create or Import to build a program map."
          actions={
            onCreatePlan ? (
              <button
                type="button"
                className="targetlock-btn targetlock-btn-primary"
                onClick={onCreatePlan}
              >
                Create plan
              </button>
            ) : null
          }
        />
      </div>
    );
  }

  return (
    <div className="planner-map-view">
      <AdvancedTabHero
        eyebrow="Visualise"
        title="Plan map"
        copy="Local plan view or satellite imagery — layers, clearance highlights, and selected hole context."
      />
      <div className="planner-map-body">
        <div className="planner-map-canvas-panel targetlock-panel">
          <div className="planner-map-toolbar">
            <PlannerModeSwitch
              options={[
                { id: "local", label: "Local plan view" },
                { id: "satellite", label: "Satellite view" },
              ]}
              value={mapViewMode}
              onChange={(mode) => setMapViewMode(mode as MapViewMode)}
              label="Map view mode"
            />
            {mapViewMode === "local" ? (
              <>
                <button
                  type="button"
                  className={`targetlock-btn targetlock-btn-sm${mapFitMode === "program" ? " targetlock-btn-primary" : ""}`}
                  onClick={() => setMapFitMode("program")}
                >
                  Fit to program
                </button>
                {selectedHoleId ? (
                  <button
                    type="button"
                    className={`targetlock-btn targetlock-btn-sm${mapFitMode === "selection" ? " targetlock-btn-primary" : ""}`}
                    onClick={() => setMapFitMode("selection")}
                  >
                    Fit to selected
                  </button>
                ) : null}
              </>
            ) : null}
          </div>

          {mapViewMode === "local" ? (
            model?.layers.length ? (
              <PlannerMiniMap
                model={model}
                toggles={toggles}
                fitMode={mapFitMode}
                focusHoleIds={focusHoleIds}
                onSelectHole={(id) => {
                  onSelectHole(id);
                  setMapFitMode("selection");
                }}
              />
            ) : (
              <p className="targetlock-panel-copy planner-map-empty">
                No holes match the current layer filters.
              </p>
            )
          ) : satelliteOverlay ? (
            <PlannerSatelliteMap
              overlay={satelliteOverlay}
              onSelectHole={onSelectHole}
              onSwitchToLocal={() => setMapViewMode("local")}
              active={mapViewMode === "satellite"}
              selectedHoleId={selectedHoleId}
              demoHoleId={gpsDemoHoleId}
              onSelectDemoHole={onSelectHole}
            />
          ) : (
            <p className="targetlock-panel-copy planner-map-empty">
              No satellite overlay available for this program.
            </p>
          )}

          {selectedHoleId ? (
            <div className="planner-map-actions">
              <button
                type="button"
                className="targetlock-btn targetlock-btn-sm targetlock-btn-primary"
                onClick={() => onOpenReview(selectedHoleId)}
              >
                Review
              </button>
            </div>
          ) : null}
        </div>

        <aside className="planner-map-sidebar">
          {selectedHole && selectedSummary && selectedReadiness ? (
            <PlannerSubPanel
              className="planner-map-selected-panel"
              kicker="Selected hole"
              title={selectedSummary.holeName}
              meta={
                selectedDisplay ? (
                  <span className={`planner-status-badge ${selectedDisplay.cssClass}`}>
                    {selectedDisplay.label}
                  </span>
                ) : null
              }
            >
              <p className="targetlock-panel-copy">
                {selectedSummary.planType === "daughter" ? "Daughter" : "Standard"} · Readiness{" "}
                {selectedReadiness.score}/100
              </p>
              <p className="targetlock-panel-copy">{selectedReadiness.nextAction}</p>
            </PlannerSubPanel>
          ) : (
            <article className="targetlock-panel planner-map-selected-panel">
              <p className="targetlock-panel-copy">
                Select a hole on the map to inspect status and next actions.
              </p>
            </article>
          )}
          <PlannerMapLegend
            toggles={toggles}
            onChange={(patch) => setToggles((prev) => ({ ...prev, ...patch }))}
          />
          <PlannerCoordinateCard
            holeName={selectedLayer?.holeName ?? ""}
            status={selectedLayer?.status ?? "draft"}
            data={coordinateCard}
          />
          <PlannerMapWarnings
            programWarnings={model?.programWarnings ?? []}
            holeWarnings={selectedLayer?.warnings ?? []}
            holeName={selectedLayer?.holeName}
            satelliteWarnings={
              mapViewMode === "satellite" ? (satelliteOverlay?.warnings ?? []) : []
            }
            clearanceRisks={
              qaReport?.clearancePairs.filter((p) => p.severity === "risk") ?? []
            }
          />
        </aside>
      </div>
    </div>
  );
}
