import {
  add,
  clamp,
  doglegDeg,
  dipAzFromVector,
  EPS,
  minCurveDisplacement,
  slerpDirection,
  vectorFromDipAz,
} from "./geometry";
import type { SurveyRecord, SurveyStation } from "./types";

export function buildStations(records: SurveyRecord[]): SurveyStation[] {
  if (!records.length) return [];
  const stations: SurveyStation[] = [];
  let position = { e: 0, n: 0, d: 0 };

  records.forEach((record, index) => {
    if (index > 0) {
      const previous = records[index - 1];
      const length = record.md - previous.md;
      const displacement = minCurveDisplacement(previous, record, length);
      position = add(position, displacement);
    }

    const previousRecord = records[index - 1];
    const dogleg = previousRecord
      ? doglegDeg(
          vectorFromDipAz(previousRecord.dip, previousRecord.azimuth),
          vectorFromDipAz(record.dip, record.azimuth)
        )
      : 0;
    const interval = previousRecord ? record.md - previousRecord.md : 0;

    stations.push({
      ...record,
      e: position.e,
      n: position.n,
      d: position.d,
      dls: interval > EPS ? dogleg / (interval / 30) : 0,
      dogleg,
    });
  });

  return stations;
}

/**
 * Planned position at MD along the minimum-curvature path through planned surveys.
 * Prefer this over linear E/N/D interpolation between desurveyed plan stations.
 */
export function positionOnPlanAtMd(
  planRecords: SurveyRecord[],
  md: number
): SurveyStation | null {
  if (!planRecords.length) return null;

  const first = planRecords[0];
  if (md <= first.md + EPS) {
    return buildStations([first])[0] ?? null;
  }

  let upperIdx = 1;
  while (upperIdx < planRecords.length && planRecords[upperIdx].md < md - EPS) {
    upperIdx += 1;
  }

  if (upperIdx >= planRecords.length) {
    const stations = buildStations(planRecords);
    return interpolateAtMd(stations, md);
  }

  const upper = planRecords[upperIdx];
  const lower = planRecords[upperIdx - 1];

  if (Math.abs(upper.md - md) < EPS) {
    return buildStations(planRecords.slice(0, upperIdx + 1)).pop() ?? null;
  }
  if (Math.abs(lower.md - md) < EPS) {
    return buildStations(planRecords.slice(0, upperIdx)).pop() ?? null;
  }

  const span = upper.md - lower.md;
  const t = clamp((md - lower.md) / span, 0, 1);
  const av = vectorFromDipAz(lower.dip, lower.azimuth);
  const bv = vectorFromDipAz(upper.dip, upper.azimuth);
  const aim = dipAzFromVector(slerpDirection(av, bv, t));
  const mid: SurveyRecord = { md, dip: aim.dip, azimuth: aim.azimuth };
  return buildStations([...planRecords.slice(0, upperIdx), mid]).pop() ?? null;
}

export function planOffsetAtMd(
  actual: SurveyStation,
  planRecords: SurveyRecord[]
): number | null {
  const plan = positionOnPlanAtMd(planRecords, actual.md);
  if (!plan) return null;
  return Math.hypot(actual.e - plan.e, actual.n - plan.n, actual.d - plan.d);
}

export function interpolateAtMd(
  stations: SurveyStation[],
  md: number
): SurveyStation | null {
  if (!stations.length) return null;
  if (md <= stations[0].md) return { ...stations[0] };

  for (let i = 1; i < stations.length; i += 1) {
    const a = stations[i - 1];
    const b = stations[i];
    if (md <= b.md) {
      const span = b.md - a.md || 1;
      const t = clamp((md - a.md) / span, 0, 1);
      const av = vectorFromDipAz(a.dip, a.azimuth);
      const bv = vectorFromDipAz(b.dip, b.azimuth);
      const aim = dipAzFromVector(slerpDirection(av, bv, t));
      return {
        md,
        dip: aim.dip,
        azimuth: aim.azimuth,
        e: a.e + (b.e - a.e) * t,
        n: a.n + (b.n - a.n) * t,
        d: a.d + (b.d - a.d) * t,
        dls: a.dls + (b.dls - a.dls) * t,
        dogleg: a.dogleg + (b.dogleg - a.dogleg) * t,
      };
    }
  }

  const last = stations[stations.length - 1];
  const vector = vectorFromDipAz(last.dip, last.azimuth);
  const extra = md - last.md;
  return {
    ...last,
    md,
    e: last.e + vector.e * extra,
    n: last.n + vector.n * extra,
    d: last.d + vector.d * extra,
  };
}

export function buildDeviationSeries(
  planStations: SurveyStation[],
  actualStations: SurveyStation[]
): { md: number; offset: number; dls: number }[] {
  return actualStations.map((station) => ({
    md: station.md,
    offset: planOffsetAtMd(station, planStations) ?? 0,
    dls: station.dls,
  }));
}
