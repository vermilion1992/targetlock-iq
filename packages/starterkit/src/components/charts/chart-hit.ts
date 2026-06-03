import { planOffsetAtMd } from "@/lib/drilling/desurvey";
import { round } from "@/lib/drilling/format";
import type { PlanCorridorStatus } from "@/lib/drilling/plan-corridor";
import type { SurveyStation } from "@/lib/drilling/types";

export { planOffsetAtMd };

/** Alias kept for compatibility with older bundles. */
export function offsetFromPlanAtMd(
  actual: SurveyStation,
  planStations: SurveyStation[]
): number | null {
  return planOffsetAtMd(actual, planStations);
}

export const CHART_HIT_RADIUS_PX = 9;

export type StationMarkerHit = {
  md: number;
  x: number;
  y: number;
  kind: "plan" | "actual";
  station: SurveyStation;
};

export function nearestStationMarker(
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

function formatDeg(value: number): string {
  return `${round(value, 1)}°`;
}

export function buildPlannedTooltipLines(station: SurveyStation): string[] {
  return [
    `MD ${round(station.md, 0)} m`,
    `Dip ${formatDeg(station.dip)} · Azi ${formatDeg(station.azimuth)}`,
    `E ${round(station.e, 1)} · N ${round(station.n, 1)} · D ${round(station.d, 1)} m`,
  ];
}

export function buildActualTooltipLines(
  station: SurveyStation,
  planStations: SurveyStation[],
  options?: {
    isLatest?: boolean;
    corridorStatus?: PlanCorridorStatus | null;
  }
): string[] {
  const lines = [
    `MD ${round(station.md, 0)} m`,
    `Dip ${formatDeg(station.dip)} · Azi ${formatDeg(station.azimuth)}`,
    `E ${round(station.e, 1)} · N ${round(station.n, 1)} · D ${round(station.d, 1)} m`,
    `DLS ${round(station.dls, 2)}°/30 m`,
  ];

  const offset = planOffsetAtMd(station, planStations);
  if (offset != null) {
    lines.push(`Offset from plan ${round(offset, 1)} m`);
  }

  if (options?.isLatest && options.corridorStatus?.outsidePlannedCorridor) {
    lines.push("Outside planned corridor");
  }

  return lines;
}

export function buildDeviationTooltipLines(
  md: number,
  offset: number,
  dls: number
): string[] {
  return [
    `MD ${round(md, 0)} m`,
    `Offset from plan ${round(offset, 1)} m`,
    `DLS ${round(dls, 2)}°/30 m`,
  ];
}

/** Clamp tooltip position inside chart container (CSS pixels). */
export function clampTooltipPosition(
  anchorX: number,
  anchorY: number,
  tooltipW: number,
  tooltipH: number,
  containerW: number,
  containerH: number,
  offset = 14
): { left: number; top: number } {
  let left = anchorX + offset;
  let top = anchorY - tooltipH - offset;
  if (left + tooltipW > containerW - 8) {
    left = anchorX - tooltipW - offset;
  }
  if (left < 8) left = 8;
  if (top < 8) {
    top = anchorY + offset;
  }
  if (top + tooltipH > containerH - 8) {
    top = containerH - tooltipH - 8;
  }
  return { left, top };
}
