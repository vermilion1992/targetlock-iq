import type { Recommendation, SurveyStation } from "@/lib/drilling/types";
import {
  CHART,
  CHART_FONT_AXIS,
  drawCanvasBackdrop,
  drawMarker,
  drawStationDots,
  STATION_DOT,
} from "./chart-theme";
import type { StationMarkerHit } from "./chart-hit";
import { CHART_HIT_RADIUS_PX } from "./chart-hit";

export type Point3 = { e: number; n: number; d: number };

export type View3D = {
  yaw: number;
  pitch: number;
  zoom: number;
  panX: number;
  panY: number;
};

export const DEFAULT_VIEW_3D: View3D = {
  yaw: 0.72,
  pitch: 0.42,
  zoom: 1.35,
  panX: 0,
  panY: 0,
};

export const VIEW_PRESETS: Record<string, View3D> = {
  iso: { ...DEFAULT_VIEW_3D },
  plan: { yaw: 0, pitch: 1.28, zoom: 1.4, panX: 0, panY: 0 },
  north: { yaw: 0, pitch: 0.18, zoom: 1.35, panX: 0, panY: 0 },
  east: { yaw: Math.PI / 2, pitch: 0.22, zoom: 1.35, panX: 0, panY: 0 },
};

/** Pitch limits — stay shy of ±90° to avoid view flip. */
export const PITCH_MIN = -1.35;
export const PITCH_MAX = 1.35;

export function clampPitch(pitch: number): number {
  return Math.max(PITCH_MIN, Math.min(PITCH_MAX, pitch));
}

export type SceneBounds = ReturnType<typeof boundsPoints>;

/** Orbit rotation around trajectory centroid: yaw about Down, then pitch about East. */
export function rotateOrbit(
  p: Point3,
  origin: Point3,
  yaw: number,
  pitch: number
): { x: number; y: number; z: number } {
  const e = p.e - origin.e;
  const n = p.n - origin.n;
  const d = p.d - origin.d;

  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x1 = e * cosY - n * sinY;
  const y1 = e * sinY + n * cosY;
  const z1 = d;

  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const x2 = x1 * cosP + z1 * sinP;
  const z2 = -x1 * sinP + z1 * cosP;

  return { x: x2, y: y1, z: z2 };
}

export function projectPoint(
  p: Point3,
  angles: Pick<View3D, "yaw" | "pitch">,
  centerX: number,
  centerY: number,
  scale: number,
  origin: Point3 = { e: 0, n: 0, d: 0 }
): { x: number; y: number; depth: number } {
  const r = rotateOrbit(p, origin, angles.yaw, angles.pitch);
  return {
    x: centerX + r.x * scale,
    y: centerY - r.y * scale - r.z * scale * 0.88,
    depth: r.x + r.y + r.z,
  };
}

export function boundsPoints(points: Point3[]) {
  if (!points.length) {
    return {
      span: 20,
      centroid: { e: 0, n: 0, d: 0 },
      minE: -10,
      maxE: 10,
      minN: -10,
      maxN: 10,
      minD: 0,
      maxD: 20,
    };
  }
  let minE = Infinity;
  let maxE = -Infinity;
  let minN = Infinity;
  let maxN = -Infinity;
  let minD = Infinity;
  let maxD = -Infinity;
  points.forEach((p) => {
    minE = Math.min(minE, p.e);
    maxE = Math.max(maxE, p.e);
    minN = Math.min(minN, p.n);
    maxN = Math.max(maxN, p.n);
    minD = Math.min(minD, p.d);
    maxD = Math.max(maxD, p.d);
  });
  const span = Math.max(maxE - minE, maxN - minN, maxD - minD, 12);
  return {
    span,
    centroid: {
      e: (minE + maxE) / 2,
      n: (minN + maxN) / 2,
      d: (minD + maxD) / 2,
    },
    minE,
    maxE,
    minN,
    maxN,
    minD,
    maxD,
  };
}

export function sceneLayout(
  width: number,
  height: number,
  bound: SceneBounds,
  view: View3D
) {
  const pad = 12;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;
  const baseScale = (Math.min(plotW, plotH) * 0.52) / bound.span;
  const scale = baseScale * view.zoom;
  return {
    pad,
    plotW,
    plotH,
    scale,
    centerX: width * 0.5 + view.panX,
    centerY: height * 0.5 + view.panY,
    origin: bound.centroid,
  };
}

export type Scene3DLayout = ReturnType<typeof sceneLayout> & {
  bound: SceneBounds;
  view: View3D;
};

export function buildScene3D(
  width: number,
  height: number,
  planStations: SurveyStation[],
  actualStations: SurveyStation[],
  recommendation: Recommendation | null,
  view: View3D
): { layout: Scene3DLayout; actualMarkers: StationMarkerHit[] } {
  const points: Point3[] = [
    ...planStations.map((s) => ({ e: s.e, n: s.n, d: s.d })),
    ...actualStations.map((s) => ({ e: s.e, n: s.n, d: s.d })),
  ];
  if (recommendation) {
    points.push({
      e: recommendation.target.e,
      n: recommendation.target.n,
      d: recommendation.target.d,
    });
    points.push({
      e: recommendation.projection.e,
      n: recommendation.projection.n,
      d: recommendation.projection.d,
    });
    points.push({
      e: recommendation.current.e,
      n: recommendation.current.n,
      d: recommendation.current.d,
    });
  }

  const bound = boundsPoints(points);
  const layout = { ...sceneLayout(width, height, bound, view), bound, view };

  const actualMarkers: StationMarkerHit[] = actualStations.map((station) => {
    const projected = projectPoint(
      { e: station.e, n: station.n, d: station.d },
      view,
      layout.centerX,
      layout.centerY,
      layout.scale,
      layout.origin
    );
    return {
      md: station.md,
      x: projected.x,
      y: projected.y,
      kind: "actual" as const,
      station,
    };
  });

  return { layout, actualMarkers };
}

export function hitTest3dMarkers(
  markers: StationMarkerHit[],
  px: number,
  py: number,
  radiusPx = CHART_HIT_RADIUS_PX
): StationMarkerHit | null {
  let best: StationMarkerHit | null = null;
  let bestDist = radiusPx * radiusPx;
  for (const marker of markers) {
    const dx = marker.x - px;
    const dy = marker.y - py;
    const dist = dx * dx + dy * dy;
    if (dist <= bestDist) {
      bestDist = dist;
      best = marker;
    }
  }
  return best;
}

function drawGroundGrid(
  ctx: CanvasRenderingContext2D,
  view: View3D,
  layout: ReturnType<typeof sceneLayout>,
  bound: SceneBounds
) {
  const { centerX, centerY, scale, origin } = layout;
  const steps = 5;
  const eStep = (bound.maxE - bound.minE) / steps || 10;
  const nStep = (bound.maxN - bound.minN) / steps || 10;
  const dPlane = bound.maxD;

  ctx.save();
  ctx.strokeStyle = CHART.gridMajor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.75;

  for (let i = 0; i <= steps; i += 1) {
    const e = bound.minE + eStep * i;
    const lineN: Point3[] = [
      { e, n: bound.minN, d: dPlane },
      { e, n: bound.maxN, d: dPlane },
    ];
    const projN = lineN.map((p) => projectPoint(p, view, centerX, centerY, scale, origin));
    ctx.beginPath();
    ctx.moveTo(projN[0].x, projN[0].y);
    ctx.lineTo(projN[1].x, projN[1].y);
    ctx.stroke();

    const n = bound.minN + nStep * i;
    const lineE: Point3[] = [
      { e: bound.minE, n, d: dPlane },
      { e: bound.maxE, n, d: dPlane },
    ];
    const projE = lineE.map((p) => projectPoint(p, view, centerX, centerY, scale, origin));
    ctx.beginPath();
    ctx.moveTo(projE[0].x, projE[0].y);
    ctx.lineTo(projE[1].x, projE[1].y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAxisGuides(
  ctx: CanvasRenderingContext2D,
  view: View3D,
  layout: ReturnType<typeof sceneLayout>,
  bound: SceneBounds
) {
  const { centerX, centerY, scale, origin } = layout;
  const originP = projectPoint(origin, view, centerX, centerY, scale, origin);
  const axes: { end: Point3; color: string; label: string }[] = [
    { end: { e: bound.maxE, n: origin.n, d: origin.d }, color: "#3b82c4", label: "East" },
    { end: { e: origin.e, n: bound.maxN, d: origin.d }, color: "#0d9488", label: "North" },
    { end: { e: origin.e, n: origin.n, d: bound.maxD }, color: "#b45309", label: "Down" },
  ];

  ctx.save();
  ctx.font = CHART_FONT_AXIS;
  axes.forEach(({ end, color, label }) => {
    const tip = projectPoint(end, view, centerX, centerY, scale, origin);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(originP.x, originP.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.globalAlpha = 1;
    ctx.fillText(label, tip.x + 4, tip.y - 2);
  });
  ctx.restore();
}

function drawPath3D(
  ctx: CanvasRenderingContext2D,
  points: Point3[],
  view: View3D,
  layout: ReturnType<typeof sceneLayout>,
  color: string,
  glow: string,
  width: number
) {
  if (points.length < 2) return;
  const { centerX, centerY, scale, origin } = layout;
  const projected = points.map((p) => projectPoint(p, view, centerX, centerY, scale, origin));

  ctx.save();
  ctx.strokeStyle = glow;
  ctx.lineWidth = width + 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);
  for (let i = 1; i < projected.length; i += 1) {
    ctx.lineTo(projected[i].x, projected[i].y);
  }
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);
  for (let i = 1; i < projected.length; i += 1) {
    ctx.lineTo(projected[i].x, projected[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawPathStationDots(
  ctx: CanvasRenderingContext2D,
  stations: SurveyStation[],
  view: View3D,
  layout: ReturnType<typeof sceneLayout>,
  color: string,
  highlightMd?: number | null
) {
  const { centerX, centerY, scale, origin } = layout;
  const mdMatch = (md: number) =>
    highlightMd != null && Math.abs(md - highlightMd) < 0.01;

  const projected = stations
    .map((station) => {
      const p = projectPoint(
        { e: station.e, n: station.n, d: station.d },
        view,
        centerX,
        centerY,
        scale,
        origin
      );
      return { station, ...p };
    })
    .sort((a, b) => a.depth - b.depth);

  drawStationDots(
    ctx,
    projected.map(({ station, x, y }) => ({
      x,
      y,
      color,
      radius: mdMatch(station.md) ? STATION_DOT.actualHover : STATION_DOT.actual * 0.85,
      highlighted: mdMatch(station.md),
    }))
  );
}

export type Draw3DOptions = {
  highlightMd?: number | null;
};

export function drawTrajectory3D(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  planStations: SurveyStation[],
  actualStations: SurveyStation[],
  recommendation: Recommendation | null,
  view: View3D,
  options?: Draw3DOptions
) {
  drawCanvasBackdrop(ctx, width, height);

  const pad = 10;
  ctx.save();
  ctx.fillStyle = CHART.plotBg;
  ctx.strokeStyle = CHART.plotBorder;
  ctx.lineWidth = 1;
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(pad, pad, width - pad * 2, height - pad * 2, 8);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  const { layout } = buildScene3D(
    width,
    height,
    planStations,
    actualStations,
    recommendation,
    view
  );
  const bound = layout.bound;

  drawGroundGrid(ctx, view, layout, bound);
  drawAxisGuides(ctx, view, layout, bound);

  drawPath3D(
    ctx,
    planStations.map((s) => ({ e: s.e, n: s.n, d: s.d })),
    view,
    layout,
    CHART.plan,
    CHART.planGlow,
    3
  );
  drawPath3D(
    ctx,
    actualStations.map((s) => ({ e: s.e, n: s.n, d: s.d })),
    view,
    layout,
    CHART.actual,
    CHART.actualGlow,
    3
  );

  if (planStations.length > 2) {
    const { centerX, centerY, scale, origin } = layout;
    const planDots = planStations
      .map((station) => {
        const p = projectPoint(
          { e: station.e, n: station.n, d: station.d },
          view,
          centerX,
          centerY,
          scale,
          origin
        );
        return { station, ...p };
      })
      .sort((a, b) => a.depth - b.depth);
    drawStationDots(
      ctx,
      planDots.map(({ station, x, y }) => ({
        x,
        y,
        color: CHART.plan,
        radius:
          options?.highlightMd != null && Math.abs(station.md - options.highlightMd) < 0.01
            ? STATION_DOT.planHover * 0.9
            : STATION_DOT.plan * 0.85,
        highlighted:
          options?.highlightMd != null && Math.abs(station.md - options.highlightMd) < 0.01,
      }))
    );
  }

  drawPathStationDots(
    ctx,
    actualStations,
    view,
    layout,
    CHART.actual,
    options?.highlightMd
  );

  if (recommendation) {
    const { centerX, centerY, scale, origin } = layout;

    const targetP = projectPoint(
      { e: recommendation.target.e, n: recommendation.target.n, d: recommendation.target.d },
      view,
      centerX,
      centerY,
      scale,
      origin
    );
    drawMarker(ctx, targetP.x, targetP.y, CHART.target, "Target");

    const collar = projectPoint({ e: 0, n: 0, d: 0 }, view, centerX, centerY, scale, origin);
    drawMarker(ctx, collar.x, collar.y, CHART.collar, "Collar", 5);

    const currentP = projectPoint(
      {
        e: recommendation.current.e,
        n: recommendation.current.n,
        d: recommendation.current.d,
      },
      view,
      centerX,
      centerY,
      scale,
      origin
    );
    drawMarker(ctx, currentP.x, currentP.y, CHART.current, "Current", 5);
  }
}
