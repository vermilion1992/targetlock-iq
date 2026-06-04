import { round } from "./format";
import {
  normalizeCapabilityAssumptions,
  type CapabilityAssumptions,
} from "./capability-assumptions";
import type { SurveyStation, TargetConfig } from "./types";

/* ------------------------------------------------------------------ */
/* Coordinate / survey convention notes (informational only)          */
/* ------------------------------------------------------------------ */

export type ConventionNote = { label: string; value: string };

/**
 * The conventions TargetLock IQ assumes internally. These are NOT detected
 * from the data — they are what the math expects. Imports must match these
 * or the app can produce a believable but wrong correction.
 */
export const COORDINATE_CONVENTIONS: ConventionNote[] = [
  { label: "Dip sign", value: "Negative downward (0° horizontal, −90° vertical down)." },
  { label: "Azimuth reference", value: "Degrees clockwise from north, 0–360°. Magnetic vs true vs grid must match the plan." },
  { label: "East / North axes", value: "East = +X, North = +Y, right-handed in plan view." },
  { label: "Down / TVD", value: "Down is positive with increasing depth below collar." },
  { label: "Coordinates", value: "Collar-relative offsets (E/N/D from the collar), not mine grid coordinates." },
  { label: "Desurvey method", value: "Minimum curvature between survey stations." },
  { label: "Units", value: "Metres and degrees throughout." },
];

/* ------------------------------------------------------------------ */
/* Plan import sanity check                                            */
/* ------------------------------------------------------------------ */

export type SanityLevel = "ok" | "warn";
export type SanityRow = { label: string; value: string; level?: SanityLevel; note?: string };

export type PlanSanityCheck = {
  rows: SanityRow[];
  warnings: string[];
  hasPlan: boolean;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function buildPlanSanityCheck(
  planStations: SurveyStation[],
  target: TargetConfig
): PlanSanityCheck {
  const warnings: string[] = [];
  const rows: SanityRow[] = [];

  if (planStations.length === 0) {
    return {
      rows: [],
      warnings: ["No planned trajectory loaded. Load a hole plan to run the sanity check."],
      hasPlan: false,
    };
  }

  const first = planStations[0];
  const last = planStations[planStations.length - 1];

  rows.push({ label: "Plan stations", value: `${planStations.length}` });
  rows.push({
    label: "MD range",
    value: `${round(first.md, 1)} m → ${round(last.md, 1)} m`,
  });
  rows.push({
    label: "Start dip / azimuth",
    value: `${round(first.dip, 1)}° / ${round(first.azimuth, 1)}°`,
  });
  rows.push({
    label: "End dip / azimuth",
    value: `${round(last.dip, 1)}° / ${round(last.azimuth, 1)}°`,
  });

  // Station spacing
  const intervals: number[] = [];
  for (let i = 1; i < planStations.length; i += 1) {
    intervals.push(planStations[i].md - planStations[i - 1].md);
  }
  if (intervals.length > 0) {
    const minInt = Math.min(...intervals);
    const maxInt = Math.max(...intervals);
    const medInt = median(intervals);
    const irregular = maxInt - minInt > Math.max(1, medInt * 0.5);
    rows.push({
      label: "Station spacing",
      value: `min ${round(minInt, 1)} · median ${round(medInt, 1)} · max ${round(maxInt, 1)} m`,
      level: irregular ? "warn" : "ok",
      note: irregular ? "Irregular spacing — confirm the plan export is complete." : undefined,
    });
  }

  rows.push({
    label: "Target MD",
    value: `${round(target.md, 1)} m`,
    level: target.md > last.md + 0.5 ? "warn" : undefined,
    note: target.md > last.md + 0.5 ? "Target MD is beyond the last plan station." : undefined,
  });
  rows.push({
    label: "Target offset (E / N / D)",
    value: `${round(target.e, 1)} / ${round(target.n, 1)} / ${round(target.d, 1)} m`,
  });
  rows.push({
    label: "Target tolerance",
    value: `${round(target.tolerance, 1)} m (3D envelope)`,
  });

  // Convention sanity warnings
  const positiveDips = planStations.filter((s) => s.dip > 0.5).length;
  if (positiveDips > planStations.length / 2) {
    warnings.push(
      "Most dips are positive. TargetLock expects dip negative downward — check whether the file uses inclination instead of dip."
    );
  }
  const aziOutOfRange = planStations.some((s) => s.azimuth < 0 || s.azimuth > 360);
  if (aziOutOfRange) {
    warnings.push("Some azimuths are outside 0–360°. Check the azimuth column and reference (magnetic vs true vs grid).");
  }
  const nonMonotonic = intervals.some((i) => i <= 0);
  if (nonMonotonic) {
    warnings.push("Plan MD is not strictly increasing. Stations may be out of order or duplicated.");
  }
  if (planStations.length < 2) {
    warnings.push("Only one plan station — a trajectory needs at least two.");
  }

  return { rows, warnings, hasPlan: true };
}

/* ------------------------------------------------------------------ */
/* Reference desurvey comparison                                      */
/* ------------------------------------------------------------------ */

export type ReferenceStation = { md: number; e: number; n: number; d: number };

function splitCsvLine(line: string): string[] {
  return line.split(",").map((cell) => cell.trim());
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function pick(row: Record<string, string>, names: string[]): number {
  for (const name of names) {
    const key = normalizeHeader(name);
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== "") {
      const n = Number(row[key]);
      if (Number.isFinite(n)) return n;
    }
  }
  return NaN;
}

/**
 * Parse a reference desurvey CSV from trusted software. Expects MD plus
 * East/North/Down (with common aliases). Rows missing any field are skipped.
 */
export function parseReferenceCsv(text: string): ReferenceStation[] {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const out: ReferenceStation[] = [];
  for (const line of lines.slice(1)) {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    const md = pick(row, ["md", "depth", "measured_depth", "measured depth"]);
    const e = pick(row, ["east", "easting", "e", "x", "local_east"]);
    const n = pick(row, ["north", "northing", "n", "y", "local_north"]);
    const d = pick(row, ["down", "tvd", "d", "z", "depth_tvd", "true_vertical_depth"]);
    if ([md, e, n, d].every(Number.isFinite)) {
      out.push({ md, e, n, d });
    }
  }
  return out.sort((a, b) => a.md - b.md);
}

export type ReferenceComparisonRow = {
  md: number;
  matched: boolean;
  matchedMd: number | null;
  refE: number;
  refN: number;
  refD: number;
  appE: number | null;
  appN: number | null;
  appD: number | null;
  dE: number;
  dN: number;
  dD: number;
  distance: number;
};

export type ReferenceComparison = {
  rows: ReferenceComparisonRow[];
  total: number;
  matched: number;
  maxDistance: number;
  meanDistance: number;
  worst: ReferenceComparisonRow | null;
};

/**
 * Compare reference station coordinates against the app's computed stations,
 * matching by nearest MD within `tolMd`. Validates the desurvey output when
 * both are built from the same survey inputs.
 */
export function compareReferenceStations(
  reference: ReferenceStation[],
  computed: SurveyStation[],
  tolMd = 0.5
): ReferenceComparison {
  const rows: ReferenceComparisonRow[] = reference.map((ref) => {
    let best: SurveyStation | null = null;
    let bestGap = Infinity;
    for (const station of computed) {
      const gap = Math.abs(station.md - ref.md);
      if (gap < bestGap) {
        bestGap = gap;
        best = station;
      }
    }
    if (!best || bestGap > tolMd) {
      return {
        md: ref.md,
        matched: false,
        matchedMd: null,
        refE: ref.e,
        refN: ref.n,
        refD: ref.d,
        appE: null,
        appN: null,
        appD: null,
        dE: NaN,
        dN: NaN,
        dD: NaN,
        distance: NaN,
      };
    }
    const dE = best.e - ref.e;
    const dN = best.n - ref.n;
    const dD = best.d - ref.d;
    return {
      md: ref.md,
      matched: true,
      matchedMd: best.md,
      refE: ref.e,
      refN: ref.n,
      refD: ref.d,
      appE: best.e,
      appN: best.n,
      appD: best.d,
      dE,
      dN,
      dD,
      distance: Math.sqrt(dE * dE + dN * dN + dD * dD),
    };
  });

  const matchedRows = rows.filter((r) => r.matched);
  const distances = matchedRows.map((r) => r.distance);
  const maxDistance = distances.length ? Math.max(...distances) : 0;
  const meanDistance = distances.length
    ? distances.reduce((a, b) => a + b, 0) / distances.length
    : 0;
  const worst =
    matchedRows.length > 0
      ? matchedRows.reduce((a, b) => (b.distance > a.distance ? b : a))
      : null;

  return {
    rows,
    total: reference.length,
    matched: matchedRows.length,
    maxDistance,
    meanDistance,
    worst,
  };
}

/* ------------------------------------------------------------------ */
/* Assumption sign-off / validation status                            */
/* ------------------------------------------------------------------ */

export type AssumptionSignOff = {
  validatedBy: string;
  validatedAt: string;
  assumptions: CapabilityAssumptions;
};

export type ValidationState = "unvalidated" | "validated" | "stale";

export type AssumptionValidationStatus = {
  state: ValidationState;
  label: string;
  detail: string;
};

export function assumptionsValidationStatus(
  signOff: AssumptionSignOff | null | undefined,
  current: CapabilityAssumptions
): AssumptionValidationStatus {
  if (!signOff || !signOff.validatedBy) {
    return {
      state: "unvalidated",
      label: "Not validated",
      detail:
        "Recovery capability assumptions have not been reviewed or signed off for this hole.",
    };
  }
  const signed = JSON.stringify(normalizeCapabilityAssumptions(signOff.assumptions));
  const now = JSON.stringify(normalizeCapabilityAssumptions(current));
  if (signed !== now) {
    return {
      state: "stale",
      label: "Changed since sign-off",
      detail: `Assumptions were changed after ${signOff.validatedBy} signed off. Re-validate before relying on steering feasibility.`,
    };
  }
  return {
    state: "validated",
    label: "Validated",
    detail: `Signed off by ${signOff.validatedBy}.`,
  };
}
