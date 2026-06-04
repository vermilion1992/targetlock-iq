"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlanCorridorStatus } from "@/lib/drilling/plan-corridor";
import type { Recommendation, SurveyStation } from "@/lib/drilling/types";
import { buildDeviationSeries } from "@/lib/drilling/desurvey";
import { ChartSurveyTooltip } from "./ChartSurveyTooltip";
import {
  buildActualTooltipLines,
  buildDeviationTooltipLines,
  buildPlannedTooltipLines,
  clampTooltipPosition,
  nearestStationMarker,
  type StationMarkerHit,
} from "./chart-hit";
import {
  buildDeviationViewLayout,
  buildPlanViewLayout,
  buildSectionViewLayout,
} from "./chart-layout";
import {
  drawDeviationView,
  drawPlanView,
  drawSectionView,
  type ChartDrawOptions,
} from "./chart-draw";
import type { BranchChartOverlay } from "./chart-branch-overlay";

type ChartKind = "plan" | "section" | "deviation";

const CHART_LABELS: Record<ChartKind, string> = {
  plan: "Plan view: planned and actual hole trajectories in map view. Hover survey dots for station detail.",
  section:
    "Vertical section: planned and actual paths with target. Hover survey dots for station detail.",
  deviation: "Deviation from plan at each survey depth. Hover dots for offset detail.",
};

type Props = {
  kind: ChartKind;
  planStations: SurveyStation[];
  actualStations: SurveyStation[];
  recommendation: Recommendation | null;
  className?: string;
  corridorStatus?: PlanCorridorStatus | null;
  branchOverlay?: BranchChartOverlay | null;
};

type HoverState = {
  marker: StationMarkerHit;
  clientX: number;
  clientY: number;
};

export function TrajectoryCanvas({
  kind,
  planStations,
  actualStations,
  recommendation,
  className,
  corridorStatus,
  branchOverlay,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<StationMarkerHit[]>([]);
  const [hover, setHover] = useState<HoverState | null>(null);

  const latestActualMd = actualStations[actualStations.length - 1]?.md;

  const highlightMd = hover?.marker.md ?? null;
  const drawOptions: ChartDrawOptions = { highlightMd, branchOverlay };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const w = rect.width;
    const h = rect.height;

    if (kind === "plan") {
      const layout = buildPlanViewLayout(w, h, planStations, actualStations, recommendation);
      markersRef.current = [...layout.planMarkers, ...layout.actualMarkers];
      drawPlanView(ctx, w, h, planStations, actualStations, recommendation, drawOptions);
    } else if (kind === "section") {
      const layout = buildSectionViewLayout(w, h, planStations, actualStations, recommendation);
      markersRef.current = [...layout.planMarkers, ...layout.actualMarkers];
      drawSectionView(ctx, w, h, planStations, actualStations, recommendation, drawOptions);
    } else {
      const layout = buildDeviationViewLayout(
        w,
        h,
        planStations,
        actualStations,
        recommendation
      );
      markersRef.current = layout.actualMarkers;
      drawDeviationView(
        ctx,
        w,
        h,
        planStations,
        actualStations,
        recommendation,
        drawOptions
      );
    }
  }, [
    kind,
    planStations,
    actualStations,
    recommendation,
    highlightMd,
  ]);

  useEffect(() => {
    redraw();
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(redraw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [redraw]);

  const tooltipLines = (() => {
    if (!hover) return [];
    const { marker } = hover;
    if (kind === "deviation") {
      const series = buildDeviationSeries(planStations, actualStations);
      const point = series.find((p) => Math.abs(p.md - marker.md) < 0.01);
      if (!point) return buildActualTooltipLines(marker.station, planStations);
      return buildDeviationTooltipLines(point.md, point.offset, point.dls);
    }
    if (marker.kind === "plan") {
      return buildPlannedTooltipLines(marker.station);
    }
    return buildActualTooltipLines(marker.station, planStations, {
      isLatest: latestActualMd != null && Math.abs(marker.md - latestActualMd) < 0.01,
      corridorStatus,
    });
  })();

  const containerRect = containerRef.current?.getBoundingClientRect();
  const tooltipPos =
    hover && containerRect
      ? clampTooltipPosition(
          hover.clientX - containerRect.left,
          hover.clientY - containerRect.top,
          168,
          tooltipLines.length * 18 + 12,
          containerRect.width,
          containerRect.height
        )
      : { left: 0, top: 0 };

  const handlePointerMove = (e: React.PointerEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const hit = nearestStationMarker(markersRef.current, px, py);
    if (hit) {
      setHover({ marker: hit, clientX: e.clientX, clientY: e.clientY });
    } else {
      setHover(null);
    }
  };

  const handlePointerLeave = () => {
    setHover(null);
  };

  return (
    <div
      ref={containerRef}
      className={`chart-canvas-wrap chart-canvas-wrap--interactive ${className ?? ""}`.trim()}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        role="img"
        aria-label={CHART_LABELS[kind]}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      />
      <ChartSurveyTooltip
        lines={tooltipLines}
        left={tooltipPos.left}
        top={tooltipPos.top}
        visible={hover != null}
      />
    </div>
  );
}
