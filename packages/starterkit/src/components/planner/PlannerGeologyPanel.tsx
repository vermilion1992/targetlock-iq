"use client";

import { useMemo, useState } from "react";
import {
  parseGeologyFile,
  type GeologyParseResult,
} from "@/lib/drilling/geology-import";
import {
  checkGeologyFramePlacement,
  createGeologyAssetId,
  frameGeologyMesh,
  inferAssetKind,
  nextAssetColor,
  type FrameExtents,
  type GeologyAsset,
  type GeologySizeStatus,
  type GeologyTransform,
  type GeologyZConvention,
} from "@/lib/drilling/geology-store";
import { FileDropzone } from "./ui/FileDropzone";

type Props = {
  programId: string;
  assets: GeologyAsset[];
  sizeStatus: GeologySizeStatus;
  holeExtents: FrameExtents | null;
  onUpsert: (asset: GeologyAsset) => void;
  onUpdate: (assetId: string, patch: Partial<Omit<GeologyAsset, "id" | "mesh">>) => void;
  onRemove: (assetId: string) => void;
};

export function PlannerGeologyPanel({
  programId,
  assets,
  sizeStatus,
  holeExtents,
  onUpsert,
  onUpdate,
  onRemove,
}: Props) {
  const [expanded, setExpanded] = useState(assets.length === 0);
  const [pendingFilename, setPendingFilename] = useState<string | null>(null);
  const [parsed, setParsed] = useState<GeologyParseResult | null>(null);
  const [offsetE, setOffsetE] = useState(0);
  const [offsetN, setOffsetN] = useState(0);
  const [zConvention, setZConvention] = useState<GeologyZConvention>("elevation");

  const transform: GeologyTransform = useMemo(
    () => ({ offsetE, offsetN, zConvention }),
    [offsetE, offsetN, zConvention]
  );

  const placementWarning = useMemo(() => {
    if (!parsed?.mesh) return null;
    return checkGeologyFramePlacement(
      frameGeologyMesh(parsed.mesh, transform),
      holeExtents
    );
  }, [parsed, transform, holeExtents]);

  const handleFile = async (file: File) => {
    const text = await file.text();
    setPendingFilename(file.name);
    setParsed(parseGeologyFile(file.name, text));
  };

  const handleAdd = () => {
    if (!parsed?.ok || !parsed.mesh || sizeStatus.level === "block") return;
    onUpsert({
      id: createGeologyAssetId(),
      programId,
      name: parsed.mesh.name,
      kind: inferAssetKind(parsed.mesh),
      mesh: parsed.mesh,
      color: nextAssetColor(assets),
      opacity: 0.45,
      visible: true,
      transform,
      sourceFilename: pendingFilename ?? "geology",
      createdAt: new Date().toISOString(),
    });
    setParsed(null);
    setPendingFilename(null);
  };

  return (
    <section className="planner-geology">
      <div className="planner-geology-header">
        <h3>
          Geology overlays{" "}
          <span className="text-xs text-[var(--tl-muted)]">
            ({assets.length} asset{assets.length === 1 ? "" : "s"})
          </span>
        </h3>
        <button
          type="button"
          className="targetlock-btn targetlock-btn-sm"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Hide" : "Manage"}
        </button>
      </div>

      {sizeStatus.message ? (
        <p
          className={
            sizeStatus.level === "block"
              ? "planner-review-qa-blocker"
              : "targetlock-helper"
          }
        >
          {sizeStatus.message}
        </p>
      ) : null}

      {expanded ? (
        <>
          <p className="targetlock-panel-copy">
            Import wireframes or surfaces exported from Leapfrog / Surpac /
            Micromine / Vulcan as OBJ or DXF (3DFACE, polyface mesh, polylines).
            Display-only — no geological interpretation is performed.
          </p>

          <div className="planner-geology-upload">
            <div className="targetlock-survey-field">
              <span>Geology file (.obj / .dxf)</span>
              <FileDropzone
                compact
                accept=".obj,.dxf"
                label="Choose geology mesh file"
                lead="Drop OBJ / DXF or browse"
                hint=".obj or .dxf mesh"
                fileName={pendingFilename}
                icon="3D"
                onFiles={(files) => void handleFile(files[0])}
              />
            </div>

            <div className="planner-geology-transform">
              <label className="targetlock-survey-field">
                <span>Z convention</span>
                <select
                  value={zConvention}
                  onChange={(e) =>
                    setZConvention(e.target.value as GeologyZConvention)
                  }
                >
                  <option value="elevation">Z = elevation / RL (mining-package norm)</option>
                  <option value="depth">Z = depth (positive down)</option>
                </select>
              </label>
              <label className="targetlock-survey-field">
                <span>Offset E (m)</span>
                <input
                  type="number"
                  value={offsetE}
                  onChange={(e) => setOffsetE(Number(e.target.value) || 0)}
                />
              </label>
              <label className="targetlock-survey-field">
                <span>Offset N (m)</span>
                <input
                  type="number"
                  value={offsetN}
                  onChange={(e) => setOffsetN(Number(e.target.value) || 0)}
                />
              </label>
            </div>
          </div>

          {parsed ? (
            <div className="planner-geology-preview">
              {parsed.errors.map((error) => (
                <p key={error} className="planner-review-qa-blocker">
                  {error}
                </p>
              ))}
              {parsed.warnings.map((warning) => (
                <p key={warning} className="targetlock-helper">
                  {warning}
                </p>
              ))}
              {parsed.mesh ? (
                <>
                  <p className="targetlock-panel-copy">
                    <strong>{parsed.mesh.name}</strong> —{" "}
                    {parsed.mesh.vertexCount.toLocaleString()} vertices,{" "}
                    {parsed.mesh.triangleCount.toLocaleString()} triangles,{" "}
                    {parsed.mesh.polylines.length} polyline
                    {parsed.mesh.polylines.length === 1 ? "" : "s"}
                    {parsed.mesh.boundingBox
                      ? ` · extents ${(
                          parsed.mesh.boundingBox.max[0] -
                          parsed.mesh.boundingBox.min[0]
                        ).toFixed(0)} × ${(
                          parsed.mesh.boundingBox.max[1] -
                          parsed.mesh.boundingBox.min[1]
                        ).toFixed(0)} m`
                      : ""}
                  </p>
                  {placementWarning ? (
                    <p className="planner-review-qa-blocker">{placementWarning}</p>
                  ) : (
                    <p className="targetlock-helper">
                      Placement check OK — mesh overlaps the program extents.
                    </p>
                  )}
                  <button
                    type="button"
                    className="targetlock-btn targetlock-btn-sm"
                    onClick={handleAdd}
                    disabled={!parsed.ok || sizeStatus.level === "block"}
                  >
                    Add to scene
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {assets.length ? (
            <ul className="planner-geology-assets">
              {assets.map((asset) => {
                const warning = checkGeologyFramePlacement(
                  frameGeologyMesh(asset.mesh, asset.transform),
                  holeExtents
                );
                return (
                  <li key={asset.id} className="planner-geology-asset">
                    <label className="program-scene-3d-toggle">
                      <input
                        type="checkbox"
                        checked={asset.visible}
                        onChange={(e) =>
                          onUpdate(asset.id, { visible: e.target.checked })
                        }
                      />
                      <span className="planner-geology-asset-name">
                        {asset.name}
                      </span>
                    </label>
                    <span className="text-xs text-[var(--tl-muted)]">
                      {asset.kind} · {asset.mesh.vertexCount.toLocaleString()} pts
                    </span>
                    <input
                      type="color"
                      value={asset.color}
                      aria-label={`Color for ${asset.name}`}
                      onChange={(e) => onUpdate(asset.id, { color: e.target.value })}
                    />
                    <input
                      type="range"
                      min={0.05}
                      max={1}
                      step={0.05}
                      value={asset.opacity}
                      aria-label={`Opacity for ${asset.name}`}
                      onChange={(e) =>
                        onUpdate(asset.id, { opacity: Number(e.target.value) })
                      }
                    />
                    <button
                      type="button"
                      className="targetlock-link-btn"
                      onClick={() => onRemove(asset.id)}
                    >
                      Remove
                    </button>
                    {warning ? (
                      <p className="targetlock-helper planner-geology-asset-warning">
                        {warning}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
