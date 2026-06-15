import {
  findMappedHeader,
  normalizeHeader,
  readField,
  splitCsvLine,
  splitCsvText,
  DIP_FIELD_ALIASES,
  AZIMUTH_FIELD_ALIASES,
  MD_FIELD_ALIASES,
  HOLE_FIELD_ALIASES,
} from "./csv-parse-utils";
import {
  upsertHole,
  type HoleLibrary,
} from "./hole-library";
import { defaultProgramId } from "./planner-types";
import type {
  PlannerPlanStatus,
  PlannerPlanType,
  PlannerProjectMetadata,
} from "./planner-types";
import { buildBlankProject } from "./hole-library";
import type { SavedHoleProject } from "./storage";
import type { SurveyRecord, TargetConfig } from "./types";

export type PlannerImportPreviewRow = {
  rowIndex: number;
  holeId: string;
  fields: Record<string, string>;
  warnings: string[];
  errors: string[];
};

export type PlannerImportParseResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  previewRows: PlannerImportPreviewRow[];
  detectedHoleCount: number;
  programId: string;
  programName: string;
  holes: SavedHoleProject[];
};

export type PlannerImportFiles = {
  collarCsv: string;
  surveyCsv?: string;
  targetCsv?: string;
  daughterCsv?: string;
  programName?: string;
};

const COLLAR_ID_ALIASES = ["hole_id", "hole", "name"];
const EAST_ALIASES = ["easting", "east", "x", "collar_easting"];
const NORTH_ALIASES = ["northing", "north", "y", "collar_northing"];
const ELEV_ALIASES = ["elevation", "rl", "z", "collar_elevation"];
const LAT_ALIASES = ["latitude", "lat"];
const LON_ALIASES = ["longitude", "lon", "long"];
const PROGRAM_ALIASES = ["program", "program_name", "site"];
const STATUS_ALIASES = ["status"];
const PLAN_TYPE_ALIASES = ["plan_type", "type"];

const TARGET_MD_ALIASES = ["target_md", "md_target"];
// Collar-relative local offsets (down-positive depth below the collar).
// Deliberately no "rl" alias: a true-RL column must not be misread as a depth.
const TARGET_E_ALIASES = ["target_e", "local_e", "e"];
const TARGET_N_ALIASES = ["target_n", "local_n", "n"];
const TARGET_D_ALIASES = ["target_d", "target_down", "local_d", "d"];
// Grid coordinates: easting/northing plus a true elevation / RL (up-positive),
// converted to collar-relative offsets via the hole's collar.
const TARGET_GRID_E_ALIASES = ["target_easting"];
const TARGET_GRID_N_ALIASES = ["target_northing"];
const TARGET_GRID_RL_ALIASES = ["target_elevation", "target_rl"];
const TOLERANCE_ALIASES = ["tolerance", "target_tolerance"];

const DAUGHTER_ID_ALIASES = ["daughter_hole_id", "daughter_id", "daughter"];
const MOTHER_ID_ALIASES = ["mother_hole_id", "mother_id", "mother"];
const KICKOFF_ALIASES = ["kickoff_md", "kickoff", "ko_md"];

function parseCsvRows(text: string): Record<string, string>[] {
  const lines = splitCsvText(text);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!).map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? "";
    });
    return row;
  });
}

function parseNum(value: string | undefined, label: string): number | null {
  if (value === undefined || value === "") return null;
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function normalizeStatus(value: string | undefined): PlannerPlanStatus {
  const s = (value ?? "planned").toLowerCase();
  const allowed: PlannerPlanStatus[] = [
    "draft",
    "planned",
    "approved",
    "active",
    "completed",
    "archived",
  ];
  return allowed.includes(s as PlannerPlanStatus) ? (s as PlannerPlanStatus) : "planned";
}

function normalizePlanType(value: string | undefined): PlannerPlanType {
  const t = (value ?? "standard").toLowerCase();
  if (t === "daughter") return "daughter";
  if (t === "import") return "import";
  return "standard";
}

function defaultTarget(): TargetConfig {
  return {
    e: 0,
    n: 0,
    d: 0,
    md: 300,
    tolerance: 6,
    maxDls: 3,
    nextInterval: 30,
  };
}

export function parsePlannerImportFiles(
  files: PlannerImportFiles,
  existingLibrary: HoleLibrary
): PlannerImportParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const previewRows: PlannerImportPreviewRow[] = [];
  const holeMap = new Map<string, SavedHoleProject>();

  const collarRows = parseCsvRows(files.collarCsv);
  if (!collarRows.length) {
    errors.push("Collar file must include a header row and at least one data row.");
  }

  const programName =
    files.programName ??
    readField(collarRows[0] ?? {}, PROGRAM_ALIASES) ??
    "Imported Program";
  const programId = defaultProgramId(programName);
  const now = new Date().toISOString();

  for (let i = 0; i < collarRows.length; i += 1) {
    const row = collarRows[i]!;
    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];

    const holeId =
      readField(row, [...COLLAR_ID_ALIASES]) ??
      readField(row, [...HOLE_FIELD_ALIASES]) ??
      "";
    if (!holeId) {
      rowErrors.push("Missing hole_id / hole / name.");
    }

    const easting = parseNum(readField(row, EAST_ALIASES), "easting");
    const northing = parseNum(readField(row, NORTH_ALIASES), "northing");
    const elevation = parseNum(readField(row, ELEV_ALIASES), "elevation") ?? 0;
    const latitude = parseNum(readField(row, LAT_ALIASES), "latitude");
    const longitude = parseNum(readField(row, LON_ALIASES), "longitude");

    if (easting === null || northing === null) {
      rowWarnings.push("Missing easting/northing — collar-relative mode assumed.");
    }

    const existing = existingLibrary.holes.find(
      (h) =>
        h.holeId === holeId ||
        h.holeName.toLowerCase() === holeId.toLowerCase()
    );
    if (existing?.plannerMeta?.createdFromPlanner) {
      rowWarnings.push(`Hole "${holeId}" already exists — import will skip unless confirmed.`);
    }

    previewRows.push({
      rowIndex: i + 2,
      holeId,
      fields: row,
      warnings: rowWarnings,
      errors: rowErrors,
    });

    if (rowErrors.length) {
      errors.push(...rowErrors.map((e) => `Collar row ${i + 2}: ${e}`));
      continue;
    }

    const planType = normalizePlanType(readField(row, PLAN_TYPE_ALIASES));
    const status = normalizeStatus(readField(row, STATUS_ALIASES));

    const meta: PlannerProjectMetadata = {
      coordinateMode: latitude !== null && longitude !== null ? "gps" : "grid",
      northReference: "grid",
      collarSource: "imported",
      plannedAt: now,
      createdFromPlanner: true,
      status,
      planType,
      programId,
      programName,
      planRevision: 1,
      collar:
        easting !== null && northing !== null
          ? {
              easting,
              northing,
              elevation,
              latitude: latitude ?? undefined,
              longitude: longitude ?? undefined,
            }
          : undefined,
    };

    const hole: SavedHoleProject = {
      ...buildBlankProject(holeId, programName, holeId),
      planRecords: [],
      target: defaultTarget(),
      plannerMeta: meta,
    };

    if (planType === "daughter") {
      hole.holeRole = "daughter";
    }

    holeMap.set(holeId, hole);
  }

  if (files.surveyCsv) {
    const surveyRows = parseCsvRows(files.surveyCsv);
    const mdKey = findMappedHeader(Object.keys(surveyRows[0] ?? {}), MD_FIELD_ALIASES);
    const dipKey = findMappedHeader(Object.keys(surveyRows[0] ?? {}), DIP_FIELD_ALIASES);
    const azKey = findMappedHeader(Object.keys(surveyRows[0] ?? {}), AZIMUTH_FIELD_ALIASES);
    const holeKey = findMappedHeader(Object.keys(surveyRows[0] ?? {}), HOLE_FIELD_ALIASES);

    if (!mdKey || !dipKey || !azKey) {
      errors.push("Survey file must include md, dip, and azimuth columns.");
    } else {
      for (let i = 0; i < surveyRows.length; i += 1) {
        const row = surveyRows[i]!;
        const holeId = holeKey ? row[holeKey] : "";
        const targetHole =
          holeMap.get(holeId) ??
          [...holeMap.values()].find(
            (h) => h.holeName.toLowerCase() === holeId.toLowerCase()
          );
        if (!targetHole) {
          warnings.push(`Survey row ${i + 2}: unknown hole_id "${holeId}".`);
          continue;
        }
        const md = parseNum(row[mdKey], "md");
        const dip = parseNum(row[dipKey], "dip");
        const az = parseNum(row[azKey], "azimuth");
        if (md === null || dip === null || az === null) {
          errors.push(`Survey row ${i + 2}: invalid md/dip/azimuth.`);
          continue;
        }
        const record: SurveyRecord = { md, dip, azimuth: az };
        targetHole.planRecords.push(record);
      }
    }
  }

  if (files.targetCsv) {
    const targetRows = parseCsvRows(files.targetCsv);
    for (let i = 0; i < targetRows.length; i += 1) {
      const row = targetRows[i]!;
      const holeId =
        readField(row, [...COLLAR_ID_ALIASES]) ??
        readField(row, [...HOLE_FIELD_ALIASES]) ??
        "";
      const hole = holeMap.get(holeId);
      if (!hole) continue;
      const e = parseNum(readField(row, TARGET_E_ALIASES), "target_e");
      const n = parseNum(readField(row, TARGET_N_ALIASES), "target_n");
      const d = parseNum(readField(row, TARGET_D_ALIASES), "target_d");
      const md = parseNum(readField(row, TARGET_MD_ALIASES), "target_md");
      const tol = parseNum(readField(row, TOLERANCE_ALIASES), "tolerance");
      if (e !== null) hole.target.e = e;
      if (n !== null) hole.target.n = n;
      if (d !== null) hole.target.d = d;
      if (md !== null) hole.target.md = md;
      if (tol !== null) hole.target.tolerance = tol;

      // Grid target columns (local values win when both are supplied).
      const gridE = parseNum(readField(row, TARGET_GRID_E_ALIASES), "target_easting");
      const gridN = parseNum(readField(row, TARGET_GRID_N_ALIASES), "target_northing");
      const gridRl = parseNum(readField(row, TARGET_GRID_RL_ALIASES), "target_elevation");
      if (gridE !== null || gridN !== null || gridRl !== null) {
        const collar = hole.plannerMeta?.collar;
        if (!collar) {
          warnings.push(
            `Target row ${i + 2}: grid target columns ignored — hole "${holeId}" has no collar coordinates.`
          );
        } else {
          if (gridE !== null && e === null) hole.target.e = gridE - collar.easting;
          if (gridN !== null && n === null) hole.target.n = gridN - collar.northing;
          // target_elevation is a true RL (up-positive): depth = collar RL - RL.
          if (gridRl !== null && d === null) hole.target.d = collar.elevation - gridRl;
        }
      }
    }
  }

  if (files.daughterCsv) {
    const daughterRows = parseCsvRows(files.daughterCsv);
    for (let i = 0; i < daughterRows.length; i += 1) {
      const row = daughterRows[i]!;
      const daughterId = readField(row, DAUGHTER_ID_ALIASES) ?? "";
      const motherId = readField(row, MOTHER_ID_ALIASES) ?? "";
      const kickoff = parseNum(readField(row, KICKOFF_ALIASES), "kickoff_md");
      const daughter = holeMap.get(daughterId);
      if (!daughter) {
        warnings.push(`Daughter row ${i + 2}: unknown daughter "${daughterId}".`);
        continue;
      }
      daughter.holeRole = "daughter";
      daughter.parentHoleId = motherId;
      daughter.kickoffMd = kickoff ?? undefined;
      if (daughter.plannerMeta) {
        daughter.plannerMeta.planType = "daughter";
      }
    }
  }

  for (const hole of holeMap.values()) {
    if (hole.planRecords.length <= 1) {
      warnings.push(`${hole.holeName}: fewer than two planned survey stations.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    previewRows,
    detectedHoleCount: holeMap.size,
    programId,
    programName,
    holes: [...holeMap.values()],
  };
}

export type ApplyPlannerImportOpts = {
  overwriteExisting?: boolean;
};

export function applyPlannerImport(
  library: HoleLibrary,
  parsed: PlannerImportParseResult,
  opts: ApplyPlannerImportOpts = {}
): HoleLibrary {
  let next = library;
  for (const hole of parsed.holes) {
    const existing = next.holes.find(
      (h) =>
        h.holeId === hole.holeId ||
        h.holeName.toLowerCase() === hole.holeName.toLowerCase()
    );
    if (existing?.plannerMeta?.createdFromPlanner && !opts.overwriteExisting) {
      continue;
    }
    next = upsertHole(next, hole);
  }
  return next;
}
