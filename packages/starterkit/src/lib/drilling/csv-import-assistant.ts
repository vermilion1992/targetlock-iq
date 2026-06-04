import { toNumber } from "./format";
import { normalizeAngle } from "./geometry";
import {
  AZIMUTH_FIELD_ALIASES,
  DIP_FIELD_ALIASES,
  findMappedHeader,
  HOLE_FIELD_ALIASES,
  MD_FIELD_ALIASES,
  normalizeHeader,
  readField,
  splitCsvLine,
  splitCsvText,
  TOLERANCE_FIELD_ALIASES,
} from "./csv-parse-utils";
import type { SurveyRecord } from "./types";

export type ImportKind = "plan" | "actual";

export type ImportConfidence = "ready" | "needs_review" | "cannot_import";

export type CsvColumnMapping = {
  md: string | null;
  dip: string | null;
  azimuth: string | null;
  holeId: string | null;
  hasToleranceColumns: boolean;
};

export type ParsedCsvRow = {
  lineNumber: number;
  raw: Record<string, string>;
  md: number;
  dip: number;
  azimuth: number;
  holeId?: string;
  valid: boolean;
  skipReason?: string;
};

export type DetailedCsvParse = {
  headers: string[];
  mapping: CsvColumnMapping;
  rows: ParsedCsvRow[];
  records: SurveyRecord[];
  detectedHoleIds: string[];
  skippedCount: number;
};

export type ImportIssue = {
  row?: number;
  message: string;
};

export type CsvImportValidation = {
  confidence: ImportConfidence;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  previewRows: ParsedCsvRow[];
  stationsReady: number;
  skippedCount: number;
  records: SurveyRecord[];
  mapping: CsvColumnMapping;
  detectedHoleIds: string[];
};

export type ValidateImportContext = {
  importKind: ImportKind;
  activeHoleId: string;
  activeHoleName: string;
  existingPlanRecords?: SurveyRecord[];
  existingActualRecords?: SurveyRecord[];
  fileName?: string;
};

export const CSV_IMPORT_TEMPLATES = {
  simplePlan: `md_m,dip_deg,azimuth_deg
0,-80,270
30,-79.8,270.4
60,-79.5,271.1
90,-79.1,271.9`,
  simpleSurvey: `md_m,dip_deg,azimuth_deg
0,-80,270
30,-79.8,270.4
60,-79.5,271.1`,
  professionalSurvey: `hole_id,md_m,dip_deg,azimuth_deg,survey_tool,survey_date,comments
DDH-0247,0,-80,270,REFLEX EZ-TRAC,2026-06-05,collar
DDH-0247,30,-79.8,270.4,REFLEX EZ-TRAC,2026-06-05,`,
} as const;

export function buildPlainEnglishError(
  row: number,
  field: "md" | "dip" | "azimuth",
  issue: "missing" | "non_numeric" | "out_of_range"
): string {
  const col =
    field === "md"
      ? "md_m (measured depth)"
      : field === "dip"
        ? "dip_deg"
        : "azimuth_deg";
  if (issue === "missing") {
    return `Row ${row} is missing ${field === "azimuth" ? "azimuth" : field}. Add a value in \`${col}\` or remove the row.`;
  }
  if (issue === "non_numeric") {
    return `Row ${row}: \`${col}\` must be a number. Check for text or empty cells.`;
  }
  if (field === "dip") {
    return `Row ${row}: dip must be between −90° and +90° (exploration dip, negative downward).`;
  }
  return `Row ${row}: azimuth must be between 0° and 360°.`;
}

function rowFromLine(
  line: string,
  headers: string[],
  lineNumber: number
): Record<string, string> {
  const values = splitCsvLine(line);
  const row: Record<string, string> = {};
  headers.forEach((header, index) => {
    row[header] = values[index] ?? "";
  });
  return row;
}

function isRowEmpty(row: Record<string, string>): boolean {
  return Object.values(row).every((v) => v.trim() === "");
}

function parseOptionalTolerances(row: Record<string, string>): Partial<SurveyRecord> {
  const tolerance = toNumber(
    readField(row, [...TOLERANCE_FIELD_ALIASES]),
    NaN
  );
  const dipTolerance = toNumber(
    readField(row, ["dip_tolerance_deg", "dip_tolerance"]),
    NaN
  );
  const aziTolerance = toNumber(
    readField(row, ["azi_tolerance_deg", "azimuth_tolerance_deg", "azi_tolerance"]),
    NaN
  );
  return {
    ...(Number.isFinite(tolerance) ? { tolerance } : {}),
    ...(Number.isFinite(dipTolerance) ? { dipTolerance } : {}),
    ...(Number.isFinite(aziTolerance) ? { aziTolerance } : {}),
  };
}

export function parseSurveyCsvDetailed(text: string): DetailedCsvParse {
  const lines = splitCsvText(text);
  const empty: DetailedCsvParse = {
    headers: [],
    mapping: { md: null, dip: null, azimuth: null, holeId: null, hasToleranceColumns: false },
    rows: [],
    records: [],
    detectedHoleIds: [],
    skippedCount: 0,
  };
  if (lines.length < 1) return empty;

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const mapping: CsvColumnMapping = {
    md: findMappedHeader(headers, MD_FIELD_ALIASES) ?? null,
    dip: findMappedHeader(headers, DIP_FIELD_ALIASES) ?? null,
    azimuth: findMappedHeader(headers, AZIMUTH_FIELD_ALIASES) ?? null,
    holeId: findMappedHeader(headers, HOLE_FIELD_ALIASES) ?? null,
    hasToleranceColumns: Boolean(findMappedHeader(headers, TOLERANCE_FIELD_ALIASES)),
  };

  const rows: ParsedCsvRow[] = [];
  const records: SurveyRecord[] = [];
  const holeIdSet = new Set<string>();
  let skippedCount = 0;

  for (let i = 1; i < lines.length; i += 1) {
    const lineNumber = i + 1;
    const raw = rowFromLine(lines[i], headers, lineNumber);
    if (isRowEmpty(raw)) {
      skippedCount += 1;
      rows.push({
        lineNumber,
        raw,
        md: NaN,
        dip: NaN,
        azimuth: NaN,
        valid: false,
        skipReason: "Empty row",
      });
      continue;
    }

    const mdRaw = readField(raw, [...MD_FIELD_ALIASES]);
    const dipRaw = readField(raw, [...DIP_FIELD_ALIASES]);
    const aziRaw = readField(raw, [...AZIMUTH_FIELD_ALIASES]);
    const md = toNumber(mdRaw, NaN);
    const dip = toNumber(dipRaw, NaN);
    const azimuth = toNumber(aziRaw, NaN);
    const holeRaw = readField(raw, [...HOLE_FIELD_ALIASES]);
    if (holeRaw?.trim()) holeIdSet.add(holeRaw.trim());

    const valid =
      Number.isFinite(md) && Number.isFinite(dip) && Number.isFinite(azimuth);
    const parsed: ParsedCsvRow = {
      lineNumber,
      raw,
      md,
      dip,
      azimuth,
      ...(holeRaw?.trim() ? { holeId: holeRaw.trim() } : {}),
      valid,
      skipReason: valid ? undefined : "Missing or non-numeric MD, dip, or azimuth",
    };
    rows.push(parsed);
    if (valid) {
      records.push({
        md,
        dip,
        azimuth: normalizeAngle(azimuth),
        ...parseOptionalTolerances(raw),
      });
    } else {
      skippedCount += 1;
    }
  }

  return {
    headers,
    mapping,
    rows,
    records: [...records].sort((a, b) => a.md - b.md),
    detectedHoleIds: [...holeIdSet],
    skippedCount,
  };
}

function holeIdMatchesActive(
  detected: string,
  activeHoleId: string,
  activeHoleName: string
): boolean {
  const norm = (s: string) => s.trim().toLowerCase();
  const d = norm(detected);
  return d === norm(activeHoleId) || d === norm(activeHoleName);
}

function looksLikeRadians(records: SurveyRecord[]): boolean {
  if (records.length === 0) return false;
  return records.every(
    (r) => Math.abs(r.dip) < 2 && Math.abs(r.azimuth) < 7
  );
}

function looksLikeWrongSlot(
  importKind: ImportKind,
  parse: DetailedCsvParse,
  records: SurveyRecord[]
): string | null {
  const { mapping, rows } = parse;
  const validCount = records.length;
  if (importKind === "plan") {
    if (validCount <= 2 && !mapping.hasToleranceColumns) {
      return "This file looks like a short survey results export. Upload it under Survey results, not Hole plan.";
    }
  } else {
    if (mapping.hasToleranceColumns && validCount >= 10) {
      return "This file has plan-style tolerance columns and many stations. Confirm you are not uploading a hole plan into Survey results.";
    }
  }
  if (importKind === "actual" && mapping.hasToleranceColumns && rows.length > 15) {
    return "Survey results usually do not include target tolerance columns. Check you selected the correct upload type.";
  }
  return null;
}

export function validateSurveyCsvImport(
  parse: DetailedCsvParse,
  context: ValidateImportContext
): CsvImportValidation {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const { mapping, rows } = parse;

  if (!mapping.md) {
    errors.push({
      message:
        "No measured depth column found. Add a column named md_m, md, depth, or measured_depth_m.",
    });
  }
  if (!mapping.dip) {
    errors.push({
      message:
        "No dip column found. Add dip_deg, dip, or inclination_deg.",
    });
  }
  if (!mapping.azimuth) {
    errors.push({
      message:
        "No azimuth column found. Add azimuth_deg, azimuth, or azi.",
    });
  }

  if (rows.length === 0 && parse.headers.length > 0) {
    errors.push({ message: "The file has a header row but no data rows." });
  }

  const validRows = rows.filter((r) => r.valid);
  const mdSeen = new Map<number, number>();

  for (const row of rows) {
    if (isRowEmpty(row.raw)) continue;

    if (!Number.isFinite(row.md)) {
      if (row.raw && Object.values(row.raw).some((v) => v.trim() !== "")) {
        const mdRaw = readField(row.raw, [...MD_FIELD_ALIASES]);
        if (!mdRaw?.trim()) {
          errors.push({
            row: row.lineNumber,
            message: buildPlainEnglishError(row.lineNumber, "md", "missing"),
          });
        } else {
          errors.push({
            row: row.lineNumber,
            message: buildPlainEnglishError(row.lineNumber, "md", "non_numeric"),
          });
        }
      }
      continue;
    }
    if (!Number.isFinite(row.dip)) {
      errors.push({
        row: row.lineNumber,
        message: buildPlainEnglishError(
          row.lineNumber,
          "dip",
          readField(row.raw, [...DIP_FIELD_ALIASES]) ? "non_numeric" : "missing"
        ),
      });
      continue;
    }
    if (!Number.isFinite(row.azimuth)) {
      errors.push({
        row: row.lineNumber,
        message: buildPlainEnglishError(
          row.lineNumber,
          "azimuth",
          readField(row.raw, [...AZIMUTH_FIELD_ALIASES]) ? "non_numeric" : "missing"
        ),
      });
      continue;
    }

    if (row.dip < -90 || row.dip > 90) {
      errors.push({
        row: row.lineNumber,
        message: buildPlainEnglishError(row.lineNumber, "dip", "out_of_range"),
      });
    }
    const aziRaw = readField(row.raw, [...AZIMUTH_FIELD_ALIASES]);
    const aziNum = toNumber(aziRaw, NaN);
    if (Number.isFinite(aziNum) && (aziNum < 0 || aziNum > 360)) {
      errors.push({
        row: row.lineNumber,
        message: buildPlainEnglishError(row.lineNumber, "azimuth", "out_of_range"),
      });
    }

    const prevLine = mdSeen.get(row.md);
    if (prevLine !== undefined) {
      errors.push({
        row: row.lineNumber,
        message: `Row ${row.lineNumber} repeats measured depth ${row.md} m (also on row ${prevLine}). Remove the duplicate or merge into one row.`,
      });
    } else {
      mdSeen.set(row.md, row.lineNumber);
    }
  }

  let lastMd = -Infinity;
  for (const row of validRows) {
    if (row.md <= lastMd) {
      errors.push({
        row: row.lineNumber,
        message: `Row ${row.lineNumber}: measured depth must increase down the hole. ${row.md} m is not greater than the previous station.`,
      });
    }
    lastMd = row.md;
  }

  const records = parse.records;

  if (validRows.length > 0 && validRows[0].md !== 0) {
    warnings.push({
      message: `First survey is at ${validRows[0].md} m, not 0 m at collar. Confirm this is intentional.`,
    });
  }

  if (context.importKind === "actual" && validRows.length < 2) {
    warnings.push({
      message:
        "Only one survey station in this file. Actual paths usually need at least two stations for trajectory and recommendations.",
    });
  }

  if (context.importKind === "plan" && validRows.length < 2) {
    warnings.push({
      message: "Only one plan station — a planned trajectory needs at least two stations.",
    });
  }

  if (parse.detectedHoleIds.length > 0) {
    const mismatched = parse.detectedHoleIds.filter(
      (id) => !holeIdMatchesActive(id, context.activeHoleId, context.activeHoleName)
    );
    if (mismatched.length > 0) {
      warnings.push({
        message: `Hole ID in file (${mismatched.join(", ")}) does not match the active hole (${context.activeHoleName}). Confirm you are importing to the correct hole.`,
      });
    }
  }

  const positiveDips = records.filter((r) => r.dip > 0.5).length;
  if (records.length > 0 && positiveDips > records.length / 2) {
    warnings.push({
      message:
        "Most dips are positive. TargetLock expects dip negative downward — check whether the file uses inclination instead of exploration dip.",
    });
  }

  if (looksLikeRadians(records)) {
    warnings.push({
      message:
        "Values are very small — the file may use radians instead of degrees. Convert to degrees before importing.",
    });
  }

  const planMax =
    context.existingPlanRecords?.length
      ? Math.max(...context.existingPlanRecords.map((r) => r.md))
      : context.importKind === "plan" && records.length
        ? Math.max(...records.map((r) => r.md))
        : null;

  if (context.importKind === "actual" && planMax != null && records.length > 0) {
    const surveyMax = Math.max(...records.map((r) => r.md));
    if (surveyMax > planMax + 0.5) {
      warnings.push({
        message: `Deepest survey (${surveyMax} m) is beyond the planned hole (${planMax} m). Confirm depth units and plan import.`,
      });
    }
  }

  const wrongSlot = looksLikeWrongSlot(context.importKind, parse, records);
  if (wrongSlot) {
    warnings.push({ message: wrongSlot });
  }

  let confidence: ImportConfidence = "ready";
  if (errors.length > 0) {
    confidence = "cannot_import";
  } else if (warnings.length > 0) {
    confidence = "needs_review";
  }

  return {
    confidence,
    errors,
    warnings,
    previewRows: rows.filter((r) => !isRowEmpty(r.raw)).slice(0, 5),
    stationsReady: records.length,
    skippedCount: parse.skippedCount,
    records,
    mapping: parse.mapping,
    detectedHoleIds: parse.detectedHoleIds,
  };
}

export function validateCsvText(
  text: string,
  context: ValidateImportContext
): CsvImportValidation {
  return validateSurveyCsvImport(parseSurveyCsvDetailed(text), context);
}

export function downloadCsvBlob(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
