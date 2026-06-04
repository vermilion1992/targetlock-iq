/** Shared palette + drawing helpers for TargetLock trajectory charts. */

export const CHART_FONT =
  '500 11px "IBM Plex Sans", "DM Sans", system-ui, sans-serif';
export const CHART_FONT_AXIS =
  '600 10px "IBM Plex Sans", "DM Sans", system-ui, sans-serif';
export const CHART_FONT_LABEL =
  '600 11px "IBM Plex Sans", "DM Sans", system-ui, sans-serif';

export const CHART = {
  canvasBg: "#eef2f6",
  plotBg: "#ffffff",
  plotBorder: "#d5dde6",
  gridMajor: "#e8edf2",
  gridMinor: "#f4f7fa",
  axis: "#8a9baa",
  axisTitle: "#5b6b78",
  plan: "#1d5bb8",
  planGlow: "rgba(29, 91, 184, 0.12)",
  actual: "#b45309",
  actualGlow: "rgba(180, 83, 9, 0.12)",
  projection: "#64748b",
  target: "#c41e12",
  targetFill: "rgba(196, 30, 18, 0.1)",
  targetStroke: "rgba(196, 30, 18, 0.55)",
  tolerance: "#0d7a42",
  toleranceFill: "rgba(13, 122, 66, 0.07)",
  deviation: "#0f766e",
  deviationFill: "rgba(15, 118, 110, 0.1)",
  deviationStroke: "rgba(15, 118, 110, 0.35)",
  zeroLine: "#94a3b8",
  collar: "#475569",
  current: "#1d5bb8",
  hint: "#8493a0",
  kickoff: "#dc2626",
  branchTarget: "#be185d",
} as const;

export type PlotRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export const DEFAULT_MARGIN = {
  left: 56,
  right: 22,
  top: 28,
  bottom: 44,
};

export function formatTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(0);
  if (abs >= 1) return value.toFixed(1);
  return value.toFixed(2);
}

export function linearTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
  if (Math.abs(max - min) < 1e-9) return [min];
  const step = (max - min) / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

export function drawCanvasBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#f8fafc");
  gradient.addColorStop(1, CHART.canvasBg);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function drawPlotArea(ctx: CanvasRenderingContext2D, plot: PlotRect) {
  const w = plot.right - plot.left;
  const h = plot.bottom - plot.top;
  ctx.save();
  ctx.fillStyle = CHART.plotBg;
  ctx.strokeStyle = CHART.plotBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(plot.left, plot.top, w, h, 6);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(plot.left, plot.top, w, h);
    ctx.strokeRect(plot.left, plot.top, w, h);
  }
  ctx.restore();
}

export function drawPlotGrid(
  ctx: CanvasRenderingContext2D,
  plot: PlotRect,
  xTicks: number[],
  yTicks: number[],
  xScale: (v: number) => number,
  yScale: (v: number) => number
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);
  ctx.clip();

  ctx.strokeStyle = CHART.gridMinor;
  ctx.lineWidth = 1;
  xTicks.forEach((tick) => {
    const x = xScale(tick);
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();
  });
  yTicks.forEach((tick) => {
    const y = yScale(tick);
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();
  });

  ctx.strokeStyle = CHART.gridMajor;
  ctx.strokeRect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);
  ctx.restore();
}

export function drawAxisLabels(
  ctx: CanvasRenderingContext2D,
  plot: PlotRect,
  xLabel: string,
  yLabel: string,
  xTicks: number[],
  yTicks: number[],
  xScale: (v: number) => number,
  yScale: (v: number) => number,
  height: number
) {
  ctx.fillStyle = CHART.axis;
  ctx.font = CHART_FONT_AXIS;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  xTicks.forEach((tick) => {
    ctx.fillText(formatTick(tick), xScale(tick), plot.bottom + 6);
  });

  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  yTicks.forEach((tick) => {
    ctx.fillText(formatTick(tick), plot.left - 8, yScale(tick));
  });

  ctx.fillStyle = CHART.axisTitle;
  ctx.font = CHART_FONT_LABEL;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(xLabel, (plot.left + plot.right) / 2, height - 8);

  ctx.save();
  ctx.translate(16, (plot.top + plot.bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
}

type Point = Record<string, number>;

export const STATION_DOT = {
  plan: 2.25,
  actual: 3,
  planHover: 3.75,
  actualHover: 4.75,
} as const;

export function drawStationDots(
  ctx: CanvasRenderingContext2D,
  dots: { x: number; y: number; color: string; radius: number; highlighted?: boolean }[]
) {
  dots.forEach(({ x, y, color, radius, highlighted }) => {
    ctx.save();
    if (highlighted) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, radius + 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.strokeStyle = highlighted ? color : "rgba(255, 255, 255, 0.92)";
    ctx.lineWidth = highlighted ? 1.75 : 1.25;
    ctx.globalAlpha = highlighted ? 1 : 0.92;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

export function drawTrajectory(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  toXY: (point: Point) => { x: number; y: number },
  color: string,
  glowColor: string,
  lineWidth: number,
  dash?: number[],
  endCap = true
) {
  if (points.length < 2) return;
  const coords = points.map(toXY);

  ctx.save();
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = lineWidth + 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  coords.forEach((xy, index) => {
    if (index === 0) ctx.moveTo(xy.x, xy.y);
    else ctx.lineTo(xy.x, xy.y);
  });
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.setLineDash(dash || []);
  ctx.beginPath();
  coords.forEach((xy, index) => {
    if (index === 0) ctx.moveTo(xy.x, xy.y);
    else ctx.lineTo(xy.x, xy.y);
  });
  ctx.stroke();
  ctx.restore();

  if (!endCap) return;

  const last = coords[coords.length - 1];
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(last.x, last.y, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Deviation-from-plan chart: profile from centred zero line upward. */
export function drawDeviationProfile(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  toXY: (point: Point) => { x: number; y: number },
  zeroY: number
) {
  if (points.length < 2) return;
  const coords = points.map(toXY);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(coords[0].x, zeroY);
  coords.forEach((xy) => ctx.lineTo(xy.x, xy.y));
  ctx.lineTo(coords[coords.length - 1].x, zeroY);
  ctx.closePath();
  ctx.fillStyle = CHART.deviationFill;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = CHART.deviation;
  ctx.lineWidth = 2.25;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  coords.forEach((xy, index) => {
    if (index === 0) ctx.moveTo(xy.x, xy.y);
    else ctx.lineTo(xy.x, xy.y);
  });
  ctx.stroke();
  ctx.restore();
}

export function drawPlotZeroLine(
  ctx: CanvasRenderingContext2D,
  plot: PlotRect,
  zeroY: number
) {
  ctx.save();
  ctx.strokeStyle = CHART.axisTitle;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(plot.left, zeroY);
  ctx.lineTo(plot.right, zeroY);
  ctx.stroke();
  ctx.restore();
}

export function drawPlotVerticalRule(
  ctx: CanvasRenderingContext2D,
  plot: PlotRect,
  x: number,
  color: string,
  label: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(x, plot.top);
  ctx.lineTo(x, plot.bottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = color;
  ctx.font = CHART_FONT_AXIS;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(label, x, plot.top + 4);
  ctx.restore();
}

export function drawAreaUnderCurve(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  toXY: (point: Point) => { x: number; y: number },
  baselineY: number,
  fillTop: string,
  fillBottom: string
) {
  if (points.length < 2) return;
  const coords = points.map(toXY);
  const gradient = ctx.createLinearGradient(0, baselineY - 80, 0, baselineY);
  gradient.addColorStop(0, fillTop);
  gradient.addColorStop(1, fillBottom);

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(coords[0].x, baselineY);
  coords.forEach((xy) => ctx.lineTo(xy.x, xy.y));
  ctx.lineTo(coords[coords.length - 1].x, baselineY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  label: string,
  radius = 6
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = CHART.axisTitle;
  ctx.font = CHART_FONT_LABEL;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(label, x + radius + 4, y - 2);
  ctx.restore();
}

export function drawToleranceEnvelope(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number
) {
  ctx.save();
  ctx.fillStyle = CHART.targetFill;
  ctx.strokeStyle = CHART.targetStroke;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(6, radiusX), Math.max(6, radiusY), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawHorizontalRule(
  ctx: CanvasRenderingContext2D,
  plot: PlotRect,
  y: number,
  color: string,
  label: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 5]);
  ctx.beginPath();
  ctx.moveTo(plot.left, y);
  ctx.lineTo(plot.right, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = color;
  ctx.font = CHART_FONT_AXIS;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(label, plot.left + 8, y - 6);
  ctx.restore();
}

export function drawChartHint(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string
) {
  ctx.fillStyle = CHART.hint;
  ctx.font = CHART_FONT;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, width - 14, height - 10);
}
