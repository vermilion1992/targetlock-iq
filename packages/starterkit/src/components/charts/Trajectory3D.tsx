"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlanCorridorStatus } from "@/lib/drilling/plan-corridor";
import type { Recommendation, SurveyStation } from "@/lib/drilling/types";
import { ChartSurveyTooltip } from "./ChartSurveyTooltip";
import { buildActualTooltipLines, clampTooltipPosition } from "./chart-hit";
import {
  buildScene3D,
  clampPitch,
  DEFAULT_VIEW_3D,
  drawTrajectory3D,
  hitTest3dMarkers,
  VIEW_PRESETS,
  type View3D,
} from "./chart-3d";
import type { StationMarkerHit } from "./chart-hit";

type Props = {
  planStations: SurveyStation[];
  actualStations: SurveyStation[];
  recommendation: Recommendation | null;
  className?: string;
  corridorStatus?: PlanCorridorStatus | null;
};

const ZOOM_MIN = 0.45;
const ZOOM_MAX = 3.5;
const ROTATE_SENSITIVITY = 0.007;
const PAN_SENSITIVITY = 1;

function clampZoom(zoom: number) {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
}

type DragMode = "rotate" | "pan";

type HoverState = {
  marker: StationMarkerHit;
  clientX: number;
  clientY: number;
};

export function Trajectory3D({
  planStations,
  actualStations,
  recommendation,
  className,
  corridorStatus,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<StationMarkerHit[]>([]);
  const [view, setView] = useState<View3D>(DEFAULT_VIEW_3D);
  const [hover, setHover] = useState<HoverState | null>(null);
  const dragRef = useRef<{
    x: number;
    y: number;
    view: View3D;
    mode: DragMode;
  } | null>(null);

  const latestActualMd = actualStations[actualStations.length - 1]?.md;
  const highlightMd = hover?.marker.md ?? null;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    const rect = viewport.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const scene = buildScene3D(
      rect.width,
      rect.height,
      planStations,
      actualStations,
      recommendation,
      view
    );
    markersRef.current = scene.actualMarkers;

    drawTrajectory3D(
      ctx,
      rect.width,
      rect.height,
      planStations,
      actualStations,
      recommendation,
      view,
      { highlightMd }
    );
  }, [planStations, actualStations, recommendation, view, highlightMd]);

  useEffect(() => {
    redraw();
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(redraw);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [redraw]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      setView((prev) => ({ ...prev, zoom: clampZoom(prev.zoom * factor) }));
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  const updateHover = (clientX: number, clientY: number) => {
    const viewport = viewportRef.current;
    if (!viewport || dragRef.current) return;
    const rect = viewport.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const hit = hitTest3dMarkers(markersRef.current, px, py);
    if (hit) {
      setHover({ marker: hit, clientX, clientY });
    } else {
      setHover(null);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const mode: DragMode = e.shiftKey || e.button === 2 ? "pan" : "rotate";
    dragRef.current = { x: e.clientX, y: e.clientY, view: { ...view }, mode };
    setHover(null);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) {
      updateHover(e.clientX, e.clientY);
      return;
    }

    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;

    if (dragRef.current.mode === "pan") {
      setView({
        ...dragRef.current.view,
        panX: dragRef.current.view.panX + dx * PAN_SENSITIVITY,
        panY: dragRef.current.view.panY + dy * PAN_SENSITIVITY,
      });
      return;
    }

    setView({
      ...dragRef.current.view,
      yaw: dragRef.current.view.yaw + dx * ROTATE_SENSITIVITY,
      pitch: clampPitch(dragRef.current.view.pitch - dy * ROTATE_SENSITIVITY),
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const onPointerLeave = () => {
    dragRef.current = null;
    setHover(null);
  };

  const applyPreset = (key: keyof typeof VIEW_PRESETS) => {
    setView({ ...VIEW_PRESETS[key] });
  };

  const zoomBy = (factor: number) => {
    setView((prev) => ({ ...prev, zoom: clampZoom(prev.zoom * factor) }));
  };

  const tooltipLines = hover
    ? buildActualTooltipLines(hover.marker.station, planStations, {
        isLatest:
          latestActualMd != null && Math.abs(hover.marker.md - latestActualMd) < 0.01,
        corridorStatus,
      })
    : [];

  const viewportRect = viewportRef.current?.getBoundingClientRect();
  const tooltipPos =
    hover && viewportRect
      ? clampTooltipPosition(
          hover.clientX - viewportRect.left,
          hover.clientY - viewportRect.top,
          168,
          tooltipLines.length * 18 + 12,
          viewportRect.width,
          viewportRect.height
        )
      : { left: 0, top: 0 };

  return (
    <div className={`targetlock-chart-3d ${className ?? ""}`.trim()}>
      <div className="targetlock-chart-3d-toolbar" role="toolbar" aria-label="3D view controls">
        <div className="targetlock-chart-3d-toolbar-group" role="group" aria-label="Zoom">
          <button
            type="button"
            className="targetlock-chart-3d-btn"
            onClick={() => zoomBy(1.2)}
            aria-label="Zoom in"
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="targetlock-chart-3d-btn"
            onClick={() => zoomBy(1 / 1.2)}
            aria-label="Zoom out"
            title="Zoom out"
          >
            −
          </button>
        </div>
        <div className="targetlock-chart-3d-toolbar-group" role="group" aria-label="View angle">
          <button
            type="button"
            className="targetlock-chart-3d-btn"
            onClick={() => applyPreset("plan")}
          >
            Plan
          </button>
          <button
            type="button"
            className="targetlock-chart-3d-btn"
            onClick={() => applyPreset("north")}
          >
            North
          </button>
          <button
            type="button"
            className="targetlock-chart-3d-btn"
            onClick={() => applyPreset("east")}
          >
            East
          </button>
          <button
            type="button"
            className="targetlock-chart-3d-btn"
            onClick={() => applyPreset("iso")}
          >
            3D
          </button>
        </div>
        <button
          type="button"
          className="targetlock-chart-3d-btn targetlock-chart-3d-btn-reset"
          onClick={() => setView({ ...DEFAULT_VIEW_3D })}
        >
          Reset
        </button>
      </div>

      <div
        ref={viewportRef}
        className="targetlock-chart-3d-viewport"
        role="application"
        aria-label="Three-dimensional trajectory. Drag to rotate, scroll to zoom, shift-drag to pan. Hover survey dots for station detail."
      >
        <canvas
          ref={canvasRef}
          className="targetlock-chart-3d-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
          onContextMenu={(e) => e.preventDefault()}
        />
        <ChartSurveyTooltip
          lines={tooltipLines}
          left={tooltipPos.left}
          top={tooltipPos.top}
          visible={hover != null}
        />
      </div>

      <p className="targetlock-chart-3d-hint">
        Drag to rotate · Scroll zoom · <kbd>Shift</kbd>+drag pan
      </p>
    </div>
  );
}
