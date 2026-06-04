/** Shared CSV line/header helpers for survey import. */

export function splitCsvLine(line: string): string[] {
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

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function readField(
  row: Record<string, string>,
  names: string[]
): string | undefined {
  for (const name of names) {
    const key = normalizeHeader(name);
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== "") {
      return row[key];
    }
  }
  return undefined;
}

export const MD_FIELD_ALIASES = [
  "md",
  "md_m",
  "depth",
  "measured_depth",
  "measured depth",
  "measured_depth_m",
  "survey_depth",
] as const;

export const DIP_FIELD_ALIASES = [
  "dip",
  "dip_deg",
  "inclination",
  "inc",
  "inclination_deg",
] as const;

export const AZIMUTH_FIELD_ALIASES = [
  "azimuth",
  "azimuth_deg",
  "azi",
  "az",
  "bearing",
] as const;

export const HOLE_FIELD_ALIASES = ["hole_id", "hole"] as const;

export const TOLERANCE_FIELD_ALIASES = [
  "tolerance_m",
  "tolerance",
  "target_tolerance",
] as const;

export function findMappedHeader(
  headers: string[],
  aliases: readonly string[]
): string | undefined {
  const normalized = new Set(headers.map(normalizeHeader));
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (normalized.has(key)) return key;
  }
  return undefined;
}

export function splitCsvText(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
