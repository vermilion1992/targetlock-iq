import { buildDeviationSeries } from "@/lib/drilling/desurvey";
import type { Recommendation, SurveyStation } from "@/lib/drilling/types";
import type { StationMarkerHit } from "./chart-hit";
import type { BranchChartOverlay } from "./chart-branch-overlay";
import { bounds, makeScale, type ChartScaleMap } from "./chart-scale";

type Point = Record<string, number>;

export type ChartViewLayout = {
  scaleMap: ChartScaleMap;
  planMarkers: StationMarkerHit[];
  actualMarkers: StationMarkerHit[];
};

function stationMarkers(
  stations: SurveyStation[],
  kind: "plan" | "actual",
  toXY: (s: SurveyStation) => { x: number; y: number }
): StationMarkerHit[] {
  return stations.map((station) => {
    const { x, y } = toXY(station);
    return { md: station.md, x, y, kind, station };
  });
}

function appendBranchPlanPoints(points: Point[], overlay?: BranchChartOverlay | null) {
  if (!overlay) return;
  overlay.extraTrajectories?.forEach((t) => points.push(...t.stations));
  overlay.targetMarkers?.forEach((t) => points.push({ e: t.e, n: t.n }));
  overlay.kickoffMarkers?.forEach((k) => points.push(k.station));
}

export function buildPlanViewLayout(
  width: number,
  height: number,
  planStations: SurveyStation[],
  actualStations: SurveyStation[],
  reco: Recommendation | null,
  branchOverlay?: BranchChartOverlay | null
): ChartViewLayout {
  const points: Point[] = [...planStations, ...actualStations];
  appendBranchPlanPoints(points, branchOverlay);
  if (reco) {
    points.push({ e: reco.target.e, n: reco.target.n });
    points.push({ e: reco.projection.e, n: reco.projection.n });
    points.push({ e: reco.current.e, n: reco.current.n });
  }
  points.push({ e: 0, n: 0 });

  const scaleMap = makeScale(width, height, bounds(points, "e", "n"));
  const toXY = (s: SurveyStation) => ({ x: scaleMap.x(s.e), y: scaleMap.y(s.n) });

  return {
    scaleMap,
    planMarkers: stationMarkers(planStations, "plan", toXY),
    actualMarkers: stationMarkers(actualStations, "actual", toXY),
  };
}

export function buildSectionViewLayout(
  width: number,
  height: number,
  planStations: SurveyStation[],
  actualStations: SurveyStation[],
  reco: Recommendation | null,
  branchOverlay?: BranchChartOverlay | null
): ChartViewLayout {
  const points: Point[] = [...planStations, ...actualStations].map((point) => ({
    md: point.md,
    d: point.d,
  }));
  if (branchOverlay) {
    branchOverlay.extraTrajectories?.forEach((t) =>
      t.stations.forEach((s) => points.push({ md: s.md, d: s.d }))
    );
    branchOverlay.targetMarkers?.forEach((t) => {
      const md =
        branchOverlay.kickoffMarkers?.[0]?.md ??
        actualStations[actualStations.length - 1]?.md ??
        0;
      points.push({ md, d: t.d });
    });
  }
  if (reco) {
    points.push({ md: reco.target.md, d: reco.target.d });
    points.push({ md: reco.target.md, d: reco.projection.d });
    points.push({ md: reco.current.md, d: reco.current.d });
  }

  const scaleMap = makeScale(width, height, bounds(points, "md", "d"));
  const toXY = (s: SurveyStation) => ({ x: scaleMap.x(s.md), y: scaleMap.y(s.d) });

  return {
    scaleMap,
    planMarkers: stationMarkers(planStations, "plan", toXY),
    actualMarkers: stationMarkers(actualStations, "actual", toXY),
  };
}

export type DeviationViewLayout = ChartViewLayout & {
  deviationMarkers: StationMarkerHit[];
};

export function buildDeviationViewLayout(
  width: number,
  height: number,
  planStations: SurveyStation[],
  actualStations: SurveyStation[],
  reco: Recommendation | null
): DeviationViewLayout {
  const deviationPoints = buildDeviationSeries(planStations, actualStations);
  const points = deviationPoints.length ? deviationPoints : [{ md: 0, offset: 0, dls: 0 }];
  const peakOffset = Math.max(
    0,
    ...points.map((point) => point.offset),
    reco ? reco.tolerance : 0
  );
  const span = Math.max(5, peakOffset * 1.15, reco ? reco.tolerance * 1.35 : 0);
  const mdMin = Math.min(...points.map((point) => point.md));
  const mdMax = Math.max(...points.map((point) => point.md), reco ? reco.target.md : 0);
  const bound = { minX: mdMin, maxX: mdMax + 1, minY: -span, maxY: span };

  const scaleMap = makeScale(width, height, bound);
  const deviationMarkers: StationMarkerHit[] = deviationPoints.map((point) => {
    const station =
      actualStations.find((s) => Math.abs(s.md - point.md) < 0.01) ??
      actualStations[actualStations.length - 1];
    return {
      md: point.md,
      x: scaleMap.x(point.md),
      y: scaleMap.y(point.offset),
      kind: "actual" as const,
      station: station ?? { md: point.md, dip: 0, azimuth: 0, e: 0, n: 0, d: 0, dls: point.dls, dogleg: 0 },
    };
  });

  return {
    scaleMap,
    planMarkers: [],
    actualMarkers: deviationMarkers,
    deviationMarkers,
  };
}
