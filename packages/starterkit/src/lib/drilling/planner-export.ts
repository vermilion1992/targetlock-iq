import { surveysToCsv } from "./csv";
import { gridTargetDisplay, normalizePlannerCollar } from "./coordinate-system";
import { GPS_COORDINATE_HONESTY_WARNING } from "./planner-coordinate-registry";
import { findHole, resolveProgramCoordinateSystem, type HoleLibrary } from "./hole-library";
import {
  resolvePlannerApprovalStatus,
  type PlannerApprovalSnapshot,
} from "./planner-approval";
import { downloadHolePlanningPdf } from "./planner-report-pdf";
import { holePlanningFilename } from "./planner-report-data";
import { exportHolePlanningTxt } from "./planner-report-text";
import { exportHoleSpatialFields } from "./planner-spatial";
import {
  derivePlannerPrograms,
  holesInProgram,
  plannerHoleSummary,
  plannerPlanType,
} from "./planner-program";
import { buildProgramQaReport, exportProgramClearanceCsv } from "./planner-qa";
import { plannerStatus } from "./planner-status";
import type {
  PlannerClearancePair,
  PlannerHoleQaSummary,
  PlannerProgram,
  PlannerProjectCoordinateSystem,
  PlannerQaSettings,
} from "./planner-types";
import type { SavedHoleProject } from "./storage";
import type { SurveyRecord } from "./types";

export function exportPlannerPlanCsv(
  planRecords: SurveyRecord[],
  holeId?: string
): string {
  const body = surveysToCsv(planRecords);
  if (!holeId) return body;
  const lines = body.split("\n");
  const header = "hole_id,md,dip,azimuth";
  const dataLines = lines.slice(1).filter(Boolean).map((line) => `${holeId},${line}`);
  return [header, ...dataLines].join("\n");
}

export function downloadPlannerPlanCsv(
  planRecords: SurveyRecord[],
  filename: string
): void {
  if (typeof window === "undefined") return;
  const csv = exportPlannerPlanCsv(planRecords);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function plannerExportFilename(programName: string, suffix: string): string {
  const slug = programName.replace(/[^\w.-]+/g, "-").toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  return `targetlock-planner-${slug}-${date}-${suffix}`;
}

function collarRow(hole: SavedHoleProject): string {
  const collar = hole.plannerMeta?.collar;
  const meta = hole.plannerMeta;
  const type = plannerPlanType(hole);
  const status = plannerStatus(hole);
  const program = meta?.programName ?? hole.siteName ?? "";
  const easting = collar?.easting ?? "";
  const northing = collar?.northing ?? "";
  const elevation = collar?.elevation ?? "";
  const lat = collar?.latitude ?? "";
  const lon = collar?.longitude ?? "";
  const coordinateMode = meta?.coordinateMode ?? "";
  const northReference = meta?.northReference ?? "";
  return [
    hole.holeId,
    program,
    type,
    status,
    easting,
    northing,
    elevation,
    lat,
    lon,
    coordinateMode,
    northReference,
  ].join(",");
}

export const PROGRAM_COLLAR_CSV_HEADER =
  "hole_id,program,plan_type,status,easting,northing,elevation,latitude,longitude,coordinate_mode,north_reference";

export const PROGRAM_TARGET_CSV_HEADER =
  "hole_id,target_md,target_easting,target_northing,target_elevation,local_e,local_n,local_d,tolerance";

export function exportProgramCollarCsv(
  library: HoleLibrary,
  programId: string
): string {
  const holes = holesInProgram(library, programId, false);
  return [PROGRAM_COLLAR_CSV_HEADER, ...holes.map(collarRow)].join("\n");
}

export function exportProgramSurveyCsv(
  library: HoleLibrary,
  programId: string
): string {
  const holes = holesInProgram(library, programId, false);
  const lines = ["hole_id,md,dip,azimuth"];
  for (const hole of holes) {
    for (const row of hole.planRecords) {
      lines.push(
        `${hole.holeId},${row.md},${row.dip.toFixed(1)},${row.azimuth.toFixed(1)}`
      );
    }
  }
  return lines.join("\n");
}

export type PlannerManifestHole = {
  holeId: string;
  holeName: string;
  plannerMeta: SavedHoleProject["plannerMeta"];
  planRecords: SurveyRecord[];
  target: SavedHoleProject["target"];
  summary: ReturnType<typeof plannerHoleSummary>;
  collarCoordinates: ReturnType<typeof exportHoleSpatialFields>["collarCoordinates"];
  targetCoordinates: ReturnType<typeof exportHoleSpatialFields>["targetCoordinates"];
  localEnu: ReturnType<typeof exportHoleSpatialFields>["localEnu"];
  spatialWarnings: string[];
  approvalSnapshot?: PlannerApprovalSnapshot | null;
  approvalStatus?: {
    state: "none" | "current" | "stale";
    label: string;
    detail: string;
  };
};

export type PlannerManifestQa = {
  settings: PlannerQaSettings;
  generatedAt: string;
  clearancePairs: PlannerClearancePair[];
  holeSummaries: PlannerHoleQaSummary[];
  warnings: string[];
};

export type PlannerManifest = {
  exportedAt: string;
  program: PlannerProgram;
  projectCoordinateSystem?: PlannerProjectCoordinateSystem;
  coordinateExportNotice?: string;
  holes: PlannerManifestHole[];
  warnings: string[];
  qa?: PlannerManifestQa;
};

function coordinateRow(hole: SavedHoleProject): string {
  const collar = normalizePlannerCollar(hole.plannerMeta?.collar);
  const gridTarget = gridTargetDisplay(hole);
  const type = plannerPlanType(hole);
  const status = plannerStatus(hole);
  return [
    hole.holeId,
    type,
    status,
    collar?.easting ?? "",
    collar?.northing ?? "",
    collar?.elevation ?? "",
    collar?.latitude ?? "",
    collar?.longitude ?? "",
    gridTarget?.e ?? hole.target.e,
    gridTarget?.n ?? hole.target.n,
    gridTarget?.d ?? hole.target.d,
    hole.target.md ?? "",
  ].join(",");
}

export function exportProgramTargetCsv(
  library: HoleLibrary,
  programId: string
): string {
  const holes = holesInProgram(library, programId, false);
  const lines = holes.map((hole) => {
    const grid = gridTargetDisplay(hole);
    return [
      hole.holeId,
      hole.target.md ?? "",
      grid?.e ?? "",
      grid?.n ?? "",
      grid?.d ?? "",
      hole.target.e,
      hole.target.n,
      hole.target.d,
      hole.target.tolerance,
    ].join(",");
  });
  return [PROGRAM_TARGET_CSV_HEADER, ...lines].join("\n");
}

export function exportProgramDaughterCsv(
  library: HoleLibrary,
  programId: string
): string {
  const holes = holesInProgram(library, programId, false).filter(
    (h) => plannerPlanType(h) === "daughter"
  );
  const header = "daughter_hole_id,mother_hole_id,kickoff_md,target_id";
  const lines = holes.map((hole) =>
    [
      hole.holeId,
      hole.parentHoleId ?? "",
      hole.kickoffMd ?? "",
      hole.target.md ?? "",
    ].join(",")
  );
  return [header, ...lines].join("\n");
}

export function exportProgramCoordinateSystemCsv(
  library: HoleLibrary,
  programId: string
): string {
  const allHoles = holesInProgram(library, programId, true);
  const pcs = resolveProgramCoordinateSystem(allHoles);
  const sample = allHoles.find((h) => h.plannerMeta?.northReference);
  const northRef = sample?.plannerMeta?.northReference ?? "grid";
  const header =
    "program_id,program_name,pcs_mode,grid_name,epsg_code,north_reference,magnetic_declination_deg,grid_convergence_deg,origin_easting,origin_northing,origin_elevation,origin_latitude,origin_longitude,notes";
  if (!pcs) {
    return [
      header,
      [
        programId,
        allHoles[0]?.plannerMeta?.programName ?? "",
        "local",
        "",
        "",
        northRef,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ].join(","),
    ].join("\n");
  }
  const origin = pcs.projectOrigin;
  return [
    header,
    [
      programId,
      allHoles[0]?.plannerMeta?.programName ?? "",
      pcs.mode,
      pcs.gridName ?? "",
      pcs.epsgCode ?? "",
      northRef,
      pcs.magneticDeclinationDeg ?? "",
      pcs.gridConvergenceDeg ?? "",
      origin?.easting ?? "",
      origin?.northing ?? "",
      origin?.elevation ?? "",
      origin?.latitude ?? "",
      origin?.longitude ?? "",
      (pcs.notes ?? "").replace(/,/g, ";"),
    ].join(","),
  ].join("\n");
}

export function exportProgramCoordinateCsv(
  library: HoleLibrary,
  programId: string
): string {
  const holes = holesInProgram(library, programId, false);
  const header =
    "hole_id,plan_type,status,collar_easting,collar_northing,collar_elevation,latitude,longitude,target_e,target_n,target_d,target_md";
  return [header, ...holes.map((h) => coordinateRow(h))].join("\n");
}

export function buildProgramManifest(
  library: HoleLibrary,
  programId: string
): PlannerManifest | null {
  const programs = derivePlannerPrograms(library);
  const program = programs.find((p) => p.programId === programId);
  if (!program) return null;

  const holes = holesInProgram(library, programId, false);
  const allHoles = holesInProgram(library, programId, true);
  const pcs = resolveProgramCoordinateSystem(allHoles);
  const warnings: string[] = [...program.warnings];
  const qaReport = buildProgramQaReport(library, programId);
  const qaWarnings: string[] = [];

  if (qaReport) {
    for (const pair of qaReport.clearancePairs) {
      if (pair.severity !== "ok") qaWarnings.push(pair.message);
    }
    for (const summary of qaReport.holeSummaries) {
      for (const issue of summary.drillability.issues) {
        qaWarnings.push(`${summary.holeId}: ${issue.message}`);
      }
    }
  }

  const hasGps =
    pcs?.mode === "gps" ||
    holes.some(
      (h) =>
        h.plannerMeta?.collar?.latitude !== undefined &&
        h.plannerMeta?.collar?.longitude !== undefined
    );

  return {
    exportedAt: new Date().toISOString(),
    program,
    projectCoordinateSystem: pcs,
    coordinateExportNotice: hasGps ? GPS_COORDINATE_HONESTY_WARNING : undefined,
    holes: holes.map((hole) => {
      const spatial = exportHoleSpatialFields(hole, library, pcs);
      warnings.push(...spatial.spatialWarnings);
      const approval = resolvePlannerApprovalStatus(hole, library);
      return {
        holeId: hole.holeId,
        holeName: hole.holeName,
        plannerMeta: hole.plannerMeta,
        planRecords: hole.planRecords,
        target: hole.target,
        summary: plannerHoleSummary(hole, library),
        collarCoordinates: spatial.collarCoordinates,
        targetCoordinates: spatial.targetCoordinates,
        localEnu: spatial.localEnu,
        spatialWarnings: spatial.spatialWarnings,
        approvalSnapshot: hole.plannerMeta?.approvalSnapshot ?? null,
        approvalStatus: {
          state: approval.state,
          label: approval.label,
          detail: approval.detail,
        },
      };
    }),
    warnings: [...new Set(warnings)],
    qa: qaReport
      ? {
          settings: qaReport.settings,
          generatedAt: qaReport.generatedAt,
          clearancePairs: qaReport.clearancePairs,
          holeSummaries: qaReport.holeSummaries,
          warnings: [...new Set(qaWarnings)],
        }
      : undefined,
  };
}

export function exportProgramManifestJson(
  library: HoleLibrary,
  programId: string
): string | null {
  const manifest = buildProgramManifest(library, programId);
  if (!manifest) return null;
  return JSON.stringify(manifest, null, 2);
}

function triggerDownload(content: string, filename: string, mime: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadProgramCollarCsv(
  library: HoleLibrary,
  programId: string,
  programName: string
): void {
  const csv = exportProgramCollarCsv(library, programId);
  triggerDownload(
    csv,
    plannerExportFilename(programName, "collars.csv"),
    "text/csv;charset=utf-8"
  );
}

export function downloadProgramSurveyCsv(
  library: HoleLibrary,
  programId: string,
  programName: string
): void {
  const csv = exportProgramSurveyCsv(library, programId);
  triggerDownload(
    csv,
    plannerExportFilename(programName, "planned-surveys.csv"),
    "text/csv;charset=utf-8"
  );
}

export function downloadProgramTargetCsv(
  library: HoleLibrary,
  programId: string,
  programName: string
): void {
  const csv = exportProgramTargetCsv(library, programId);
  triggerDownload(
    csv,
    plannerExportFilename(programName, "targets.csv"),
    "text/csv;charset=utf-8"
  );
}

export function downloadProgramManifest(
  library: HoleLibrary,
  programId: string,
  programName: string
): void {
  const json = exportProgramManifestJson(library, programId);
  if (!json) return;
  triggerDownload(
    json,
    plannerExportFilename(programName, "manifest.json"),
    "application/json"
  );
}

export function downloadProgramCoordinateCsv(
  library: HoleLibrary,
  programId: string,
  programName: string
): void {
  const csv = exportProgramCoordinateCsv(library, programId);
  triggerDownload(
    csv,
    plannerExportFilename(programName, "coordinates.csv"),
    "text/csv;charset=utf-8"
  );
}

export function downloadProgramClearanceCsv(
  library: HoleLibrary,
  programId: string,
  programName: string
): void {
  const report = buildProgramQaReport(library, programId);
  if (!report) return;
  const csv = exportProgramClearanceCsv(report);
  triggerDownload(
    csv,
    plannerExportFilename(programName, "clearance.csv"),
    "text/csv;charset=utf-8"
  );
}

export function downloadProgramDaughterCsv(
  library: HoleLibrary,
  programId: string,
  programName: string
): void {
  const csv = exportProgramDaughterCsv(library, programId);
  triggerDownload(
    csv,
    plannerExportFilename(programName, "daughters.csv"),
    "text/csv;charset=utf-8"
  );
}

export function downloadProgramCoordinateSystemCsv(
  library: HoleLibrary,
  programId: string,
  programName: string
): void {
  const csv = exportProgramCoordinateSystemCsv(library, programId);
  triggerDownload(
    csv,
    plannerExportFilename(programName, "coordinate-system.csv"),
    "text/csv;charset=utf-8"
  );
}

export function downloadProgramPackage(
  library: HoleLibrary,
  programId: string,
  programName: string
): void {
  downloadProgramCollarCsv(library, programId, programName);
  downloadProgramSurveyCsv(library, programId, programName);
  downloadProgramTargetCsv(library, programId, programName);
  downloadProgramDaughterCsv(library, programId, programName);
  downloadProgramCoordinateCsv(library, programId, programName);
  downloadProgramCoordinateSystemCsv(library, programId, programName);
  downloadProgramClearanceCsv(library, programId, programName);
  downloadProgramManifest(library, programId, programName);
}

function exportSingleHoleCoordinateCsv(hole: SavedHoleProject): string {
  const header =
    "hole_id,plan_type,status,collar_easting,collar_northing,collar_elevation,latitude,longitude,target_e,target_n,target_d,target_md";
  return [header, coordinateRow(hole)].join("\n");
}

export type DownloadHolePackageOpts = {
  includePdf?: boolean;
  planViewImageBase64?: string;
};

export function downloadHolePlanningPackage(
  library: HoleLibrary,
  holeId: string,
  opts: DownloadHolePackageOpts = {}
): void {
  const hole = findHole(library, holeId);
  if (!hole) return;

  const slug = hole.holeName.replace(/[^\w.-]+/g, "-").toLowerCase();
  const programId = hole.plannerMeta?.programId;
  const programName = hole.plannerMeta?.programName ?? "program";

  downloadPlannerPlanCsv(hole.planRecords, `${slug}-plan-survey.csv`);

  const coordCsv = exportSingleHoleCoordinateCsv(hole);
  triggerDownload(coordCsv, `${slug}-coordinates.csv`, "text/csv;charset=utf-8");

  if (programId) {
    downloadProgramClearanceCsv(library, programId, programName);
    downloadProgramManifest(library, programId, programName);
  }

  const txt = exportHolePlanningTxt(library, holeId);
  if (txt) {
    triggerDownload(txt, holePlanningFilename(hole.holeName, "txt"), "text/plain;charset=utf-8");
  }

  if (opts.includePdf) {
    void downloadHolePlanningPdf(library, holeId, {
      planViewImageBase64: opts.planViewImageBase64,
    });
  }
}

export { exportHolePlanningTxt, plannerExportFilename };
