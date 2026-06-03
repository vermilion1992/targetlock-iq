import { normalizeAngle } from "./geometry";
import { toNumber } from "./format";
import type { SurveyRecord } from "./types";

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function readField(row: Record<string, string>, names: string[]): string | undefined {
  for (const name of names) {
    const key = normalizeHeader(name);
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== "") {
      return row[key];
    }
  }
  return undefined;
}

export function parseSurveyCsv(text: string): SurveyRecord[] {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const records: SurveyRecord[] = [];

  for (const line of lines.slice(1)) {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    const md = toNumber(
      readField(row, [
        "md",
        "depth",
        "measured_depth",
        "measured depth",
        "measured_depth_m",
        "survey_depth",
      ]),
      NaN
    );
    const dip = toNumber(
      readField(row, ["dip", "inclination", "inc", "inclination_deg", "dip_deg"]),
      NaN
    );
    const azimuth = toNumber(
      readField(row, ["azimuth", "azi", "az", "azimuth_deg", "bearing"]),
      NaN
    );

    if (Number.isFinite(md) && Number.isFinite(dip) && Number.isFinite(azimuth)) {
      const tolerance = toNumber(
        readField(row, ["tolerance_m", "tolerance", "target_tolerance"]),
        NaN
      );
      const dipTolerance = toNumber(
        readField(row, ["dip_tolerance_deg", "dip_tolerance"]),
        NaN
      );
      const aziTolerance = toNumber(
        readField(row, [
          "azi_tolerance_deg",
          "azimuth_tolerance_deg",
          "azi_tolerance",
        ]),
        NaN
      );
      records.push({
        md,
        dip,
        azimuth: normalizeAngle(azimuth),
        ...(Number.isFinite(tolerance) ? { tolerance } : {}),
        ...(Number.isFinite(dipTolerance) ? { dipTolerance } : {}),
        ...(Number.isFinite(aziTolerance) ? { aziTolerance } : {}),
      });
    }
  }

  return records.sort((a, b) => a.md - b.md);
}

export function surveysToCsv(
  rows: Pick<SurveyRecord, "md" | "dip" | "azimuth">[]
): string {
  return [
    "md,dip,azimuth",
    ...rows.map((r) => `${r.md},${r.dip.toFixed(1)},${r.azimuth.toFixed(1)}`),
  ].join("\n");
}
