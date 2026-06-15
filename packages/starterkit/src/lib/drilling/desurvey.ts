import {
  add,
  clamp,
  DEG,
  doglegDeg,
  dipAzFromVector,
  EPS,
  minCurveDisplacement,
  scale,
  shortestAngle,
  slerpDirection,
  vectorFromDipAz,
} from "./geometry";
import type { SurveyRecord, SurveyStation, Vec3 } from "./types";

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

export type DesurveyMethod =
  | "minimum-curvature"
  | "balanced-tangential"
  | "radius-of-curvature";

export const DESURVEY_METHOD_LABELS: Record<DesurveyMethod, string> = {
  "minimum-curvature": "Minimum curvature",
  "balanced-tangential": "Balanced tangential",
  "radius-of-curvature": "Radius of curvature",
};

/** Balanced tangential — average of the two station direction vectors. */
function balancedTangentialDisplacement(
  fromRecord: { dip: number; azimuth: number },
  toRecord: { dip: number; azimuth: number },
  length: number
): Vec3 {
  const v1 = vectorFromDipAz(fromRecord.dip, fromRecord.azimuth);
  const v2 = vectorFromDipAz(toRecord.dip, toRecord.azimuth);
  return scale(add(v1, v2), length / 2);
}

/**
 * Radius of curvature — inclination and azimuth assumed to change linearly
 * with MD over the interval (classic separable formula).
 */
function radiusOfCurvatureDisplacement(
  fromRecord: { dip: number; azimuth: number },
  toRecord: { dip: number; azimuth: number },
  length: number
): Vec3 {
  // Inclination measured from vertical: dip -90 (straight down) -> I = 0.
  const i1 = (90 + fromRecord.dip) * DEG;
  const i2 = (90 + toRecord.dip) * DEG;
  const a1 = fromRecord.azimuth * DEG;
  const a2 = a1 + shortestAngle(fromRecord.azimuth, toRecord.azimuth) * DEG;

  const di = i2 - i1;
  const da = a2 - a1;

  const vertical =
    Math.abs(di) < EPS
      ? length * Math.cos(i1)
      : (length * (Math.sin(i2) - Math.sin(i1))) / di;
  const horizontal =
    Math.abs(di) < EPS
      ? length * Math.sin(i1)
      : (length * (Math.cos(i1) - Math.cos(i2))) / di;

  const north =
    Math.abs(da) < EPS
      ? horizontal * Math.cos(a1)
      : (horizontal * (Math.sin(a2) - Math.sin(a1))) / da;
  const east =
    Math.abs(da) < EPS
      ? horizontal * Math.sin(a1)
      : (horizontal * (Math.cos(a1) - Math.cos(a2))) / da;

  return { e: east, n: north, d: vertical };
}

export function displacementWithMethod(
  fromRecord: { dip: number; azimuth: number },
  toRecord: { dip: number; azimuth: number },
  length: number,
  method: DesurveyMethod
): Vec3 {
  switch (method) {
    case "balanced-tangential":
      return balancedTangentialDisplacement(fromRecord, toRecord, length);
    case "radius-of-curvature":
      return radiusOfCurvatureDisplacement(fromRecord, toRecord, length);
    default:
      return minCurveDisplacement(fromRecord, toRecord, length);
  }
}

/** Desurvey using an alternative method — for cross-checking only. */
export function buildStationsWithMethod(
  records: SurveyRecord[],
  method: DesurveyMethod
): SurveyStation[] {
  if (method === "minimum-curvature") return buildStations(records);
  if (!records.length) return [];

  const stations: SurveyStation[] = [];
  let position = { e: 0, n: 0, d: 0 };

  records.forEach((record, index) => {
    if (index > 0) {
      const previous = records[index - 1];
      const length = record.md - previous.md;
      position = add(
        position,
        displacementWithMethod(previous, record, length, method)
      );
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

export type DesurveyMethodComparison = {
  method: DesurveyMethod;
  label: string;
  end: Vec3;
  /** 3D distance from the minimum-curvature bottom-hole position (m). */
  deltaFromMinCurveM: number;
};

/**
 * Bottom-hole position per desurvey method, with deltas against minimum
 * curvature — for reconciling against contractor databases that use a
 * different desurvey convention.
 */
export function compareDesurveyMethods(
  records: SurveyRecord[]
): DesurveyMethodComparison[] {
  if (records.length < 2) return [];

  const methods: DesurveyMethod[] = [
    "minimum-curvature",
    "balanced-tangential",
    "radius-of-curvature",
  ];

  const ends = methods.map((method) => {
    const stations = buildStationsWithMethod(records, method);
    const last = stations[stations.length - 1]!;
    return { method, end: { e: last.e, n: last.n, d: last.d } };
  });

  const reference = ends[0]!.end;
  return ends.map(({ method, end }) => ({
    method,
    label: DESURVEY_METHOD_LABELS[method],
    end,
    deltaFromMinCurveM: Math.hypot(
      end.e - reference.e,
      end.n - reference.n,
      end.d - reference.d
    ),
  }));
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
