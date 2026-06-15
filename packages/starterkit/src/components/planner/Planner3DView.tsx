"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ProgramScene3DLazy as ProgramScene3D,
  type Scene3DClearanceLink,
  type Scene3DHole,
  type Scene3DSurface,
} from "@/components/three/ProgramScene3DLazy";
import {
  assetsForProgram,
  emptyGeologyStore,
  frameGeologyMesh,
  geologySizeStatus,
  holeFrameExtents,
  loadGeologyStore,
  removeGeologyAsset,
  saveGeologyStore,
  updateGeologyAsset,
  upsertGeologyAsset,
  type GeologyAsset,
  type GeologyStore,
} from "@/lib/drilling/geology-store";
import { findHole, type HoleLibrary } from "@/lib/drilling/hole-library";
import {
  buildPlannerMapModel,
  getPlannerMapFramePath,
} from "@/lib/drilling/planner-spatial";
import type { PlannerQaReport } from "@/lib/drilling/planner-types";
import { PlannerGeologyPanel } from "./PlannerGeologyPanel";

type Props = {
  library: HoleLibrary;
  selectedProgramId: string | null;
  selectedHoleId: string | null;
  qaReport: PlannerQaReport | null;
};

export function Planner3DView({
  library,
  selectedProgramId,
  selectedHoleId,
  qaReport,
}: Props) {
  const [geologyStore, setGeologyStore] = useState<GeologyStore>(emptyGeologyStore);

  // Hydrate after mount — localStorage is client-only.
  useEffect(() => {
    setGeologyStore(loadGeologyStore());
  }, []);

  const persistGeology = (next: GeologyStore) => {
    setGeologyStore(next);
    saveGeologyStore(next);
  };

  const model = useMemo(() => {
    if (!selectedProgramId) return null;
    return buildPlannerMapModel(
      library,
      selectedProgramId,
      undefined,
      selectedHoleId
    );
  }, [library, selectedProgramId, selectedHoleId]);

  const holes = useMemo<Scene3DHole[]>(() => {
    if (!model) return [];
    return model.layers.map((layer) => {
      const hole = findHole(library, layer.holeId);
      const actualTrace =
        hole && hole.actualRecords.length > 1
          ? getPlannerMapFramePath(hole, library).actualTrace
          : undefined;
      return {
        holeId: layer.holeId,
        holeName: layer.holeName,
        planType: layer.planType,
        trace: layer.trace,
        actualTrace,
        motherTrace: layer.motherTrace,
        target: layer.target,
        highlighted: layer.highlighted,
      };
    });
  }, [model, library]);

  const clearanceLinks = useMemo<Scene3DClearanceLink[]>(() => {
    if (!qaReport) return [];
    return qaReport.clearancePairs
      .filter((p) => p.severity !== "ok")
      .map((p) => ({
        holeAId: p.holeAId,
        holeBId: p.holeBId,
        mdA: p.mdA,
        mdB: p.mdB,
        severity: p.severity,
      }));
  }, [qaReport]);

  const programAssets = useMemo(
    () => (model ? assetsForProgram(geologyStore, model.programId) : []),
    [geologyStore, model]
  );

  const surfaces = useMemo<Scene3DSurface[]>(
    () =>
      programAssets
        .filter((asset) => asset.visible)
        .map((asset) => {
          const framed = frameGeologyMesh(asset.mesh, asset.transform);
          return {
            id: asset.id,
            name: asset.name,
            positions: framed.positions,
            indices: framed.indices,
            polylines: framed.polylines,
            color: asset.color,
            opacity: asset.opacity,
          };
        }),
    [programAssets]
  );

  const holeExtents = useMemo(
    () => holeFrameExtents(holes.map((h) => h.trace)),
    [holes]
  );

  if (!model || !holes.length) {
    return (
      <article className="targetlock-panel planner-step-panel">
        <div className="targetlock-panel-title">
          <h2>3D scene</h2>
        </div>
        <p className="targetlock-panel-copy">
          Select a program with at least one planned hole to view the 3D scene.
        </p>
      </article>
    );
  }

  return (
    <article className="targetlock-panel planner-step-panel">
      <div className="targetlock-panel-title">
        <h2>Program 3D scene</h2>
        <span className="targetlock-legend text-xs text-[var(--tl-muted)]">
          Planned · Actual · Targets · Clearance risks · Uncertainty envelopes ·
          Geology
        </span>
      </div>
      <ProgramScene3D
        holes={holes}
        clearanceLinks={clearanceLinks}
        surfaces={surfaces}
        heightPx={540}
        snapshotName={`targetlock-program-${model.programId}-3d`}
      />
      <PlannerGeologyPanel
        programId={model.programId}
        assets={programAssets}
        sizeStatus={geologySizeStatus(geologyStore)}
        holeExtents={holeExtents}
        onUpsert={(asset: GeologyAsset) =>
          persistGeology(upsertGeologyAsset(geologyStore, asset))
        }
        onUpdate={(assetId, patch) =>
          persistGeology(updateGeologyAsset(geologyStore, assetId, patch))
        }
        onRemove={(assetId) =>
          persistGeology(removeGeologyAsset(geologyStore, assetId))
        }
      />
      {model.programWarnings.length ? (
        <ul className="targetlock-helper" style={{ marginTop: 8 }}>
          {model.programWarnings.slice(0, 4).map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
