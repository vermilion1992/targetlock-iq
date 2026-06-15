"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DAUGHTER_TRAJECTORY_COLORS,
  MUTED_MOTHER_TRAJECTORY,
} from "@/components/charts/chart-branch-overlay";
import type {
  PlannerMapHoleLayer,
  PlannerMapLayerToggle,
  PlannerMapModel,
} from "@/lib/drilling/planner-spatial";
import { interpolateAtMd } from "@/lib/drilling/desurvey";
import { programMapScale } from "@/lib/drilling/planner-spatial";
import type { PlannerPlanStatus } from "@/lib/drilling/planner-types";
import { round } from "@/lib/drilling/format";

export type PlannerMapFitMode = "program" | "selection";

type Props = {
  model: PlannerMapModel;
  toggles: PlannerMapLayerToggle;
  fitMode?: PlannerMapFitMode;
  focusHoleIds?: string[];
  onSelectHole: (holeId: string) => void;
};

const STATUS_STROKE: Record<PlannerPlanStatus, string> = {
  draft: "#94a3b8",
  planned: "#1a4fa3",
  approved: "#1a6b3c",
  active: "#856404",
  completed: "#155724",
  archived: "#6c757d",
};

function tracePath(
  layer: PlannerMapHoleLayer,
  scale: ReturnType<typeof programMapScale>
): string {
  const stations = layer.trace;
  if (!stations.length) return "";
  return stations
    .map((s, i) => {
      const x = scale.x(s.e);
      const y = scale.y(s.n);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function motherTracePath(
  layer: PlannerMapHoleLayer,
  scale: ReturnType<typeof programMapScale>
): string {
  if (!layer.motherTrace?.length) return "";
  return layer.motherTrace
    .map((s, i) => {
      const x = scale.x(s.e);
      const y = scale.y(s.n);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function targetToleranceRadiusPx(
  layer: PlannerMapHoleLayer,
  scale: ReturnType<typeof programMapScale>
): number {
  const tol = layer.target.tolerance;
  if (!Number.isFinite(tol) || tol <= 0) return 5;
  const cx = scale.x(layer.target.e);
  const cy = scale.y(layer.target.n);
  const rx = Math.abs(scale.x(layer.target.e + tol) - cx);
  const ry = Math.abs(scale.y(layer.target.n + tol) - cy);
  return Math.max(4, Math.min(80, (rx + ry) / 2));
}

export function PlannerMiniMap({
  model,
  toggles,
  fitMode = "program",
  focusHoleIds,
  onSelectHole,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 640, height: 420 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: Math.max(320, entry.contentRect.width),
        height: Math.max(280, entry.contentRect.height),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scaleOpts = useMemo(
    () => ({
      focusHoleIds:
        fitMode === "selection" && focusHoleIds?.length
          ? focusHoleIds
          : undefined,
      projectOrigin: model.projectCoordinateSystem?.projectOrigin,
    }),
    [fitMode, focusHoleIds, model.projectCoordinateSystem?.projectOrigin]
  );

  const scale = programMapScale(size.width, size.height, model.layers, scaleOpts);
  const { plot, bound } = scale;

  let daughterColorIndex = 0;

  const extentLabel = `${round(bound.minX, 0)}–${round(bound.maxX, 0)} E · ${round(bound.minY, 0)}–${round(bound.maxY, 0)} N`;

  return (
    <div ref={containerRef} className="planner-minimap-wrap">
      <svg
        className="planner-minimap"
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${size.width} ${size.height}`}
        role="img"
        aria-label="Program plan view map"
      >
        <rect
          x={plot.left}
          y={plot.top}
          width={plot.right - plot.left}
          height={plot.bottom - plot.top}
          fill="var(--tl-panel)"
          stroke="var(--tl-line-strong)"
          strokeWidth={1}
          rx={4}
        />

        {toggles.localGrid ? (
          <g className="planner-minimap-grid" clipPath="url(#planner-map-clip)">
            {Array.from({ length: 8 }, (_, i) => {
              const x = plot.left + ((plot.right - plot.left) * i) / 7;
              return (
                <line
                  key={`v-${i}`}
                  x1={x}
                  y1={plot.top}
                  x2={x}
                  y2={plot.bottom}
                  stroke="var(--tl-line)"
                  strokeWidth={0.5}
                  opacity={0.55}
                />
              );
            })}
            {Array.from({ length: 6 }, (_, i) => {
              const y = plot.top + ((plot.bottom - plot.top) * i) / 5;
              return (
                <line
                  key={`h-${i}`}
                  x1={plot.left}
                  y1={y}
                  x2={plot.right}
                  y2={y}
                  stroke="var(--tl-line)"
                  strokeWidth={0.5}
                  opacity={0.55}
                />
              );
            })}
          </g>
        ) : null}

        <defs>
          <clipPath id="planner-map-clip">
            <rect
              x={plot.left}
              y={plot.top}
              width={plot.right - plot.left}
              height={plot.bottom - plot.top}
            />
          </clipPath>
        </defs>

        <g clipPath="url(#planner-map-clip)">
          {model.projectCoordinateSystem?.projectOrigin?.easting !== undefined &&
          model.projectCoordinateSystem?.projectOrigin?.northing !== undefined ? (
            <g className="planner-minimap-origin">
              <circle
                cx={scale.x(model.projectCoordinateSystem.projectOrigin.easting!)}
                cy={scale.y(model.projectCoordinateSystem.projectOrigin.northing!)}
                r={5}
                fill="var(--tl-blue)"
                stroke="#fff"
                strokeWidth={1.5}
              />
              {toggles.labels ? (
                <text
                  x={scale.x(model.projectCoordinateSystem.projectOrigin.easting!) + 8}
                  y={scale.y(model.projectCoordinateSystem.projectOrigin.northing!) - 6}
                  className="planner-minimap-label"
                >
                  Origin
                </text>
              ) : null}
            </g>
          ) : null}

          {model.clearanceHighlights?.map((highlight) => {
            const layerA = model.layers.find((l) => l.holeId === highlight.holeAId);
            const layerB = model.layers.find((l) => l.holeId === highlight.holeBId);
            const stationA = layerA
              ? interpolateAtMd(layerA.trace, highlight.mdA)
              : null;
            const stationB = layerB
              ? interpolateAtMd(layerB.trace, highlight.mdB)
              : null;
            const fill = highlight.severity === "risk" ? "#dc2626" : "#d97706";
            return (
              <g key={`${highlight.holeAId}-${highlight.holeBId}-hl`}>
                {stationA ? (
                  <circle
                    cx={scale.x(stationA.e)}
                    cy={scale.y(stationA.n)}
                    r={6}
                    fill={fill}
                    stroke="#fff"
                    strokeWidth={2}
                    opacity={0.9}
                  />
                ) : null}
                {stationB ? (
                  <circle
                    cx={scale.x(stationB.e)}
                    cy={scale.y(stationB.n)}
                    r={6}
                    fill={fill}
                    stroke="#fff"
                    strokeWidth={2}
                    opacity={0.9}
                  />
                ) : null}
              </g>
            );
          })}

          {model.layers.map((layer) => {
            const isDaughter = layer.planType === "daughter";
            const daughterColors = isDaughter
              ? DAUGHTER_TRAJECTORY_COLORS[
                  daughterColorIndex++ % DAUGHTER_TRAJECTORY_COLORS.length
                ]!
              : null;
            const stroke = layer.highlighted
              ? "#e85d04"
              : layer.related
                ? "#f4a261"
                : isDaughter
                  ? daughterColors!.stroke
                  : STATUS_STROKE[layer.status];
            const strokeWidth = layer.highlighted ? 3 : layer.related ? 2.5 : 2;
            const opacity = layer.related ? 0.85 : 1;
            const tolerancePx = targetToleranceRadiusPx(layer, scale);

            return (
              <g
                key={layer.holeId}
                className="planner-minimap-hole"
                onClick={() => onSelectHole(layer.holeId)}
                style={{ cursor: "pointer" }}
              >
                {layer.motherTrace?.length ? (
                  <path
                    d={motherTracePath(layer, scale)}
                    fill="none"
                    stroke={MUTED_MOTHER_TRAJECTORY.stroke}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    opacity={0.7}
                  />
                ) : null}

                <path
                  d={tracePath(layer, scale)}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {layer.trace[0] ? (
                  <circle
                    cx={scale.x(layer.trace[0]!.e)}
                    cy={scale.y(layer.trace[0]!.n)}
                    r={layer.highlighted ? 7 : 5}
                    fill={stroke}
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                ) : null}

                {layer.kickoff ? (
                  <g>
                    <polygon
                      points={`${scale.x(layer.kickoff.e)},${scale.y(layer.kickoff.n) - 6} ${scale.x(layer.kickoff.e) - 5},${scale.y(layer.kickoff.n) + 4} ${scale.x(layer.kickoff.e) + 5},${scale.y(layer.kickoff.n) + 4}`}
                      fill="#7c3aed"
                      stroke="#fff"
                      strokeWidth={1}
                    />
                    {toggles.labels ? (
                      <text
                        x={scale.x(layer.kickoff.e) + 8}
                        y={scale.y(layer.kickoff.n) - 4}
                        className="planner-minimap-label"
                      >
                        KO
                      </text>
                    ) : null}
                  </g>
                ) : null}

                {toggles.targets ? (
                  <g>
                    <circle
                      cx={scale.x(layer.target.e)}
                      cy={scale.y(layer.target.n)}
                      r={tolerancePx}
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      opacity={0.75}
                    />
                    <circle
                      cx={scale.x(layer.target.e)}
                      cy={scale.y(layer.target.n)}
                      r={4}
                      fill="#dc2626"
                      stroke="#fff"
                      strokeWidth={1}
                    />
                  </g>
                ) : null}

                {toggles.labels && layer.trace[0] ? (
                  <text
                    x={scale.x(layer.trace[0]!.e) + 8}
                    y={scale.y(layer.trace[0]!.n) - 8}
                    className="planner-minimap-label"
                  >
                    {layer.holeName}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>

        <text
          x={plot.left + 6}
          y={plot.bottom - 6}
          className="planner-minimap-axis-label"
        >
          East (m)
        </text>
        <text
          x={plot.left + 6}
          y={plot.top + 14}
          className="planner-minimap-axis-label"
        >
          North (m)
        </text>
        <text
          x={plot.right - 6}
          y={plot.top + 14}
          textAnchor="end"
          className="planner-minimap-extent-label"
        >
          {extentLabel}
        </text>
        {fitMode === "selection" && focusHoleIds?.length ? (
          <text
            x={plot.right - 6}
            y={plot.bottom - 6}
            textAnchor="end"
            className="planner-minimap-extent-label"
          >
            Fit: selection
          </text>
        ) : null}
      </svg>
    </div>
  );
}
