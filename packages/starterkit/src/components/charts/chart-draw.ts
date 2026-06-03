import { buildDeviationSeries } from "@/lib/drilling/desurvey";
import { round } from "@/lib/drilling/format";
import type { Recommendation, SurveyStation } from "@/lib/drilling/types";
import {
  buildDeviationViewLayout,
  buildPlanViewLayout,
  buildSectionViewLayout,
} from "./chart-layout";
import { bounds, makeScale } from "./chart-scale";
import {
  CHART,
  DEFAULT_MARGIN,
  drawAxisLabels,
  drawCanvasBackdrop,
  drawChartHint,
  drawDeviationProfile,
  drawHorizontalRule,
  drawMarker,
  drawPlotVerticalRule,
  drawPlotZeroLine,
  drawPlotArea,
  drawPlotGrid,
  drawStationDots,
  drawToleranceEnvelope,
  drawTrajectory,
  linearTicks,
  STATION_DOT,
} from "./chart-theme";
import type { StationMarkerHit } from "./chart-hit";

export { bounds, makeScale } from "./chart-scale";

type Point = Record<string, number>;

export type ChartDrawOptions = {
  highlightMd?: number | null;
};

function drawSurveyStationDots(
  ctx: CanvasRenderingContext2D,
  planMarkers: StationMarkerHit[],
  actualMarkers: StationMarkerHit[],
  highlightMd: number | null | undefined
) {
  const mdMatch = (md: number) =>
    highlightMd != null && Math.abs(md - highlightMd) < 0.01;

  drawStationDots(
    ctx,
    planMarkers.map((m) => ({
      x: m.x,
      y: m.y,
      color: CHART.plan,
      radius: mdMatch(m.md) ? STATION_DOT.planHover : STATION_DOT.plan,
      highlighted: mdMatch(m.md),
    }))
  );
  drawStationDots(
    ctx,
    actualMarkers.map((m) => ({
      x: m.x,
      y: m.y,
      color: CHART.actual,
      radius: mdMatch(m.md) ? STATION_DOT.actualHover : STATION_DOT.actual,
      highlighted: mdMatch(m.md),
    }))
  );
}

function renderChartFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bound: ReturnType<typeof bounds>,
  xLabel: string,
  yLabel: string
) {
  const scaleMap = makeScale(width, height, bound, DEFAULT_MARGIN);
  const xTicks = linearTicks(bound.minX, bound.maxX);
  const yTicks = linearTicks(bound.minY, bound.maxY);

  drawCanvasBackdrop(ctx, width, height);
  drawPlotArea(ctx, scaleMap.plot);
  drawPlotGrid(
    ctx,
    scaleMap.plot,
    xTicks,
    yTicks,
    scaleMap.x,
    scaleMap.y
  );
  drawAxisLabels(
    ctx,
    scaleMap.plot,
    xLabel,
    yLabel,
    xTicks,
    yTicks,
    scaleMap.x,
    scaleMap.y,
    height
  );

  return scaleMap;
}

export function drawPlanView(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  planStations: SurveyStation[],
  actualStations: SurveyStation[],
  reco: Recommendation | null,
  options?: ChartDrawOptions
) {
  const layout = buildPlanViewLayout(width, height, planStations, actualStations, reco);
  const scaleMap = renderChartFrame(
    ctx,
    width,
    height,
    layout.scaleMap.bound,
    "East (m)",
    "North (m)"
  );
  const toXY = (point: Point) => ({ x: scaleMap.x(point.e), y: scaleMap.y(point.n) });

  drawTrajectory(ctx, planStations, toXY, CHART.plan, CHART.planGlow, 2.75, undefined, false);
  drawTrajectory(ctx, actualStations, toXY, CHART.actual, CHART.actualGlow, 2.75, undefined, false);
  drawSurveyStationDots(ctx, layout.planMarkers, layout.actualMarkers, options?.highlightMd);

  drawMarker(ctx, scaleMap.x(0), scaleMap.y(0), CHART.collar, "Collar", 5);

  if (reco) {
    drawTrajectory(
      ctx,
      [reco.current, reco.projection],
      toXY,
      CHART.projection,
      "rgba(100, 116, 139, 0.15)",
      2,
      [6, 5]
    );
    drawToleranceEnvelope(
      ctx,
      scaleMap.x(reco.target.e),
      scaleMap.y(reco.target.n),
      Math.abs(scaleMap.x(reco.target.e + reco.target.tolerance) - scaleMap.x(reco.target.e)),
      Math.abs(scaleMap.y(reco.target.n + reco.target.tolerance) - scaleMap.y(reco.target.n))
    );
    drawMarker(
      ctx,
      scaleMap.x(reco.target.e),
      scaleMap.y(reco.target.n),
      CHART.target,
      "Target"
    );
    drawMarker(
      ctx,
      scaleMap.x(reco.current.e),
      scaleMap.y(reco.current.n),
      CHART.current,
      "Current",
      5
    );
  }

  drawChartHint(ctx, width, height, "Plan view · looking down");
}

export function drawSectionView(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  planStations: SurveyStation[],
  actualStations: SurveyStation[],
  reco: Recommendation | null,
  options?: ChartDrawOptions
) {
  const layout = buildSectionViewLayout(width, height, planStations, actualStations, reco);
  const scaleMap = renderChartFrame(
    ctx,
    width,
    height,
    layout.scaleMap.bound,
    "Measured depth (m)",
    "Down (m)"
  );
  const toXY = (point: Point) => ({ x: scaleMap.x(point.md), y: scaleMap.y(point.d) });

  drawTrajectory(ctx, planStations, toXY, CHART.plan, CHART.planGlow, 2.75, undefined, false);
  drawTrajectory(ctx, actualStations, toXY, CHART.actual, CHART.actualGlow, 2.75, undefined, false);
  drawSurveyStationDots(ctx, layout.planMarkers, layout.actualMarkers, options?.highlightMd);

  if (reco) {
    drawTrajectory(
      ctx,
      [reco.current, { md: reco.target.md, d: reco.projection.d }],
      toXY,
      CHART.projection,
      "rgba(100, 116, 139, 0.15)",
      2,
      [6, 5]
    );
    drawToleranceEnvelope(
      ctx,
      scaleMap.x(reco.target.md),
      scaleMap.y(reco.target.d),
      Math.abs(scaleMap.x(reco.target.md + reco.target.tolerance) - scaleMap.x(reco.target.md)),
      Math.abs(scaleMap.y(reco.target.d + reco.target.tolerance) - scaleMap.y(reco.target.d))
    );
    drawMarker(ctx, scaleMap.x(reco.target.md), scaleMap.y(reco.target.d), CHART.target, "Target");
    drawMarker(
      ctx,
      scaleMap.x(reco.current.md),
      scaleMap.y(reco.current.d),
      CHART.current,
      "Current",
      5
    );
  }

  drawChartHint(ctx, width, height, "Vertical section");
}

export function drawDeviationView(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  planStations: SurveyStation[],
  actualStations: SurveyStation[],
  reco: Recommendation | null,
  options?: ChartDrawOptions
) {
  const layout = buildDeviationViewLayout(
    width,
    height,
    planStations,
    actualStations,
    reco
  );
  const deviationPoints = buildDeviationSeries(planStations, actualStations);
  const points = deviationPoints.length ? deviationPoints : [{ md: 0, offset: 0, dls: 0 }];

  const scaleMap = renderChartFrame(
    ctx,
    width,
    height,
    layout.scaleMap.bound,
    "Measured depth (m)",
    "Offset (m)"
  );
  const toXY = (point: Point) => ({ x: scaleMap.x(point.md), y: scaleMap.y(point.offset) });

  const zeroY = scaleMap.y(0);
  const plot = scaleMap.plot;

  if (reco) {
    const yTolPos = scaleMap.y(reco.tolerance);
    const yTolNeg = scaleMap.y(-reco.tolerance);
    ctx.save();
    ctx.fillStyle = CHART.toleranceFill;
    ctx.fillRect(plot.left, yTolPos, plot.right - plot.left, yTolNeg - yTolPos);
    ctx.restore();
    drawHorizontalRule(
      ctx,
      plot,
      yTolPos,
      CHART.tolerance,
      `Target tolerance +${reco.tolerance} m`
    );
    drawHorizontalRule(ctx, plot, yTolNeg, CHART.tolerance, `−${reco.tolerance} m`);
  }

  drawPlotZeroLine(ctx, plot, zeroY);
  drawDeviationProfile(ctx, points, toXY, zeroY);

  if (reco) {
    const xTarget = scaleMap.x(reco.target.md);
    if (xTarget >= plot.left && xTarget <= plot.right) {
      drawPlotVerticalRule(ctx, plot, xTarget, CHART.target, `Target ${round(reco.target.md, 0)} m`);
      ctx.save();
      ctx.fillStyle = CHART.target;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(xTarget, zeroY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  drawStationDots(
    ctx,
    layout.actualMarkers.map((m) => ({
      x: m.x,
      y: m.y,
      color: CHART.deviation,
      radius:
        options?.highlightMd != null && Math.abs(m.md - options.highlightMd) < 0.01
          ? STATION_DOT.actualHover
          : STATION_DOT.actual * 0.9,
      highlighted:
        options?.highlightMd != null && Math.abs(m.md - options.highlightMd) < 0.01,
    }))
  );

  drawChartHint(ctx, width, height, "Offset from plan · 0 centred · target depth marked");
}
