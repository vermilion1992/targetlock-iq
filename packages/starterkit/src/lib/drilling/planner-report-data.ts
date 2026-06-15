import { findHole, resolveProgramCoordinateSystem, type HoleLibrary } from "./hole-library";
import { round } from "./format";
import {
  buildPlannerApprovalCurrent,
  plannerApprovalStatus,
  resolvePlannerApprovalStatus,
} from "./planner-approval";
import { checkHoleDrillability } from "./planner-drillability";
import {
  buildProgramQaReport,
  resolveProgramQaSettings,
} from "./planner-qa";
import {
  buildRelationshipTree,
  derivePlannerPrograms,
  holesInProgram,
  plannerHoleSummary,
  plannerPlanType,
} from "./planner-program";
import { buildCoordinateCardData } from "./planner-spatial";
import { formatRevisionLineageSummary } from "./plan-revision";
import { plannerStatus } from "./planner-status";
import type {
  PlannerClearancePair,
  PlannerProjectCoordinateSystem,
  PlannerQaSettings,
  PlannerRelationshipNode,
} from "./planner-types";
import type { SavedHoleProject } from "./storage";

export const PLANNER_HANDOFF_DISCLAIMER =
  "Planning support only. Verify coordinates, survey conventions, clearances, and drilling method before field execution.";

export const PDF_APP_VERSION = "TargetLock IQ Planner";

export type PlannerSurveyRow = {
  md: string;
  dip: string;
  azimuth: string;
};

export type PlannerHoleReportData = {
  reportType: string;
  holeId: string;
  holeName: string;
  siteName: string;
  planType: string;
  programName: string;
  status: string;
  revision: string;
  collarOrKickoff: string;
  targetCoords: string;
  plannedTd: string;
  targetMd: string;
  dipAzimuthSummary: string;
  stationCount: string;
  maxDls: string;
  qaSettingsSummary: string[];
  qaBadge: string;
  drillabilityWarnings: string[];
  clearanceWarnings: string[];
  coordinateMetadata: string[];
  surveyRows: PlannerSurveyRow[];
  approvalLabel: string;
  approvalDetail: string;
  approvalState: "none" | "current" | "stale";
  approvedBy: string;
  approvedAt: string;
  executionState?: string;
  completedAt?: string;
  completedBy?: string;
  finalActualMd?: string;
  finalTrackingStatus?: string;
  revisionLineage?: string;
  planViewImageBase64?: string;
  disclaimer: string;
  generatedAt: Date;
  dateLabel: string;
  timeLabel: string;
  filenameBase: string;
};

export type PlannerProgramHoleStatusRow = {
  holeName: string;
  planType: string;
  status: string;
  approvalLabel: string;
  approvalState: "none" | "current" | "stale";
  stationCount: string;
};

export type PlannerProgramReportData = {
  reportType: string;
  programId: string;
  programName: string;
  siteName: string;
  programStatus: string;
  holeCount: string;
  coordinateMetadata: string[];
  qaSettingsSummary: string[];
  programQaSummary: string[];
  relationshipLines: string[];
  clearanceRows: Array<{
    holeA: string;
    holeB: string;
    relationship: string;
    distance: string;
    severity: string;
    message: string;
  }>;
  holeStatusRows: PlannerProgramHoleStatusRow[];
  manifestSummary: string[];
  programMapImageBase64?: string;
  disclaimer: string;
  generatedAt: Date;
  dateLabel: string;
  timeLabel: string;
  filenameBase: string;
};

function slugify(name: string): string {
  return name.replace(/[^\w.-]+/g, "-").toLowerCase() || "plan";
}

export function holePlanningFilename(holeName: string, ext: "pdf" | "txt"): string {
  return `${slugify(holeName)}-planning-report.${ext}`;
}

export function programPlanningFilename(programName: string, ext: "pdf" | "txt"): string {
  return `${slugify(programName)}-program-planning-report.${ext}`;
}

function formatTimestamp(generatedAt: Date) {
  return {
    dateLabel: generatedAt.toLocaleDateString("en-AU", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    timeLabel: generatedAt.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function formatQaSettings(settings: PlannerQaSettings): string[] {
  return [
    `Min hole separation: ${settings.minHoleSeparationM} m`,
    `Mother-daughter separation: ${settings.minMotherDaughterSeparationM} m`,
    `Sibling daughter separation: ${settings.minSiblingDaughterSeparationM} m`,
    `Sample interval: ${settings.sampleIntervalM} m`,
    `Max DLS: ${settings.maxDls} deg/30 m`,
    `Require coordinate metadata before approval: ${settings.requireCoordinateMetadataBeforeApproval ? "yes" : "no"}`,
  ];
}

function formatCoordinateMetadata(pcs?: PlannerProjectCoordinateSystem): string[] {
  if (!pcs) return ["No project coordinate system recorded."];
  const lines: string[] = [`Mode: ${pcs.mode}`];
  if (pcs.gridName) lines.push(`Grid: ${pcs.gridName}`);
  if (pcs.epsgCode) lines.push(`EPSG: ${pcs.epsgCode}`);
  if (pcs.magneticDeclinationDeg !== undefined) {
    lines.push(`Magnetic declination: ${pcs.magneticDeclinationDeg} deg`);
  }
  if (pcs.gridConvergenceDeg !== undefined) {
    lines.push(`Grid convergence: ${pcs.gridConvergenceDeg} deg`);
  }
  if (pcs.notes?.trim()) lines.push(`Notes: ${pcs.notes.trim()}`);
  return lines;
}

function serializeRelationshipTree(
  nodes: PlannerRelationshipNode[],
  depth = 0
): string[] {
  const lines: string[] = [];
  for (const node of nodes) {
    const indent = "  ".repeat(depth);
    lines.push(
      `${indent}${node.holeName} (${node.planType}, ${node.status})${node.warning ? ` — ${node.warning}` : ""}`
    );
    lines.push(...serializeRelationshipTree(node.children, depth + 1));
  }
  return lines;
}

function dipAzimuthSummary(hole: SavedHoleProject): string {
  const first = hole.planRecords[0];
  const last = hole.planRecords[hole.planRecords.length - 1];
  if (!first || !last) return "—";
  return `Start ${round(first.dip, 1)} deg / ${round(first.azimuth, 1)} deg → End ${round(last.dip, 1)} deg / ${round(last.azimuth, 1)} deg`;
}

export type BuildHoleReportOpts = {
  planViewImageBase64?: string;
  generatedAt?: Date;
};

export function buildHolePlanningReportData(
  library: HoleLibrary,
  holeId: string,
  opts: BuildHoleReportOpts = {}
): PlannerHoleReportData | null {
  const hole = findHole(library, holeId);
  if (!hole) return null;

  const generatedAt = opts.generatedAt ?? new Date();
  const { dateLabel, timeLabel } = formatTimestamp(generatedAt);
  const summary = plannerHoleSummary(hole, library);
  const programId = hole.plannerMeta?.programId;
  const settings = programId
    ? resolveProgramQaSettings(library, programId)
    : resolveProgramQaSettings(library, hole.plannerMeta?.programId ?? "");
  const drillability = checkHoleDrillability(hole, library, settings);
  const qaReport = programId ? buildProgramQaReport(library, programId) : null;
  const holeQa = qaReport?.holeSummaries.find((h) => h.holeId === holeId);
  const clearanceWarnings =
    qaReport?.clearancePairs
      .filter(
        (p) =>
          p.severity !== "ok" &&
          (p.holeAId === holeId || p.holeBId === holeId)
      )
      .map((p) => p.message) ?? [];

  const programHoles = programId ? holesInProgram(library, programId, true) : [hole];
  const pcs = resolveProgramCoordinateSystem(programHoles);
  const coordCard = buildCoordinateCardData(hole, library, pcs);
  const approval = resolvePlannerApprovalStatus(hole, library);

  const drillWarnings = drillability.issues
    .filter((i) => i.level === "warning")
    .map((i) => i.message);

  return {
    reportType: "Drill Planning Report",
    holeId: hole.holeId,
    holeName: hole.holeName,
    siteName: hole.siteName ?? hole.plannerMeta?.programName ?? "",
    planType: plannerPlanType(hole),
    programName: hole.plannerMeta?.programName ?? hole.siteName ?? "—",
    status: plannerStatus(hole),
    revision: String(hole.plannerMeta?.planRevision ?? 1),
    collarOrKickoff: summary.collarOrKickoff,
    targetCoords: coordCard.targetLabel,
    plannedTd: summary.plannedTd !== null ? `${round(summary.plannedTd, 1)} m` : "—",
    targetMd:
      summary.targetMd !== null ? `${round(summary.targetMd, 1)} m` : "—",
    dipAzimuthSummary: dipAzimuthSummary(hole),
    stationCount: String(summary.stationCount),
    maxDls:
      summary.maxDls !== null
        ? `${round(summary.maxDls, 2)} deg/30 m (limit ${settings.maxDls})`
        : "—",
    qaSettingsSummary: formatQaSettings(settings),
    qaBadge: holeQa?.badge ?? "—",
    drillabilityWarnings: drillWarnings,
    clearanceWarnings,
    coordinateMetadata: formatCoordinateMetadata(pcs),
    surveyRows: hole.planRecords.map((r) => ({
      md: round(r.md, 1),
      dip: round(r.dip, 1),
      azimuth: round(r.azimuth, 1),
    })),
    approvalLabel: approval.label,
    approvalDetail: approval.detail,
    approvalState: approval.state,
    approvedBy: hole.plannerMeta?.approvalSnapshot?.approvedBy ?? hole.plannerMeta?.approvedBy ?? "—",
    approvedAt: hole.plannerMeta?.approvalSnapshot?.approvedAt
      ? new Date(hole.plannerMeta.approvalSnapshot.approvedAt).toLocaleString("en-AU")
      : hole.plannerMeta?.approvedAt
        ? new Date(hole.plannerMeta.approvedAt).toLocaleString("en-AU")
        : "—",
    executionState: hole.plannerMeta?.executionStatus?.state,
    completedAt: hole.plannerMeta?.completionSnapshot?.completedAt
      ? new Date(hole.plannerMeta.completionSnapshot.completedAt).toLocaleString(
          "en-AU"
        )
      : undefined,
    completedBy: hole.plannerMeta?.completionSnapshot?.completedBy,
    finalActualMd:
      hole.plannerMeta?.completionSnapshot?.finalActualMd != null
        ? `${round(hole.plannerMeta.completionSnapshot.finalActualMd, 1)} m`
        : undefined,
    finalTrackingStatus:
      hole.plannerMeta?.completionSnapshot?.finalTrackingStatus,
    revisionLineage: formatRevisionLineageSummary(library, hole.holeId),
    planViewImageBase64: opts.planViewImageBase64,
    disclaimer: PLANNER_HANDOFF_DISCLAIMER,
    generatedAt,
    dateLabel,
    timeLabel,
    filenameBase: slugify(hole.holeName),
  };
}

export type BuildProgramReportOpts = {
  programMapImageBase64?: string;
  generatedAt?: Date;
};

function clearanceRow(pair: PlannerClearancePair) {
  return {
    holeA: pair.holeAName,
    holeB: pair.holeBName,
    relationship: pair.relationship,
    distance: `${round(pair.minDistanceM, 2)} m`,
    severity: pair.severity,
    message: pair.message,
  };
}

export function buildProgramPlanningReportData(
  library: HoleLibrary,
  programId: string,
  opts: BuildProgramReportOpts = {}
): PlannerProgramReportData | null {
  const program = derivePlannerPrograms(library).find((p) => p.programId === programId);
  if (!program) return null;

  const generatedAt = opts.generatedAt ?? new Date();
  const { dateLabel, timeLabel } = formatTimestamp(generatedAt);
  const programHoles = holesInProgram(library, programId, false);
  const programHolesAll = holesInProgram(library, programId, true);
  const pcs = resolveProgramCoordinateSystem(programHolesAll);
  const tree = buildRelationshipTree(programHolesAll, library);
  const qaReport = buildProgramQaReport(library, programId);
  const settings = resolveProgramQaSettings(library, programId);

  const holeStatusRows: PlannerProgramHoleStatusRow[] = programHoles.map((hole) => {
    const summary = plannerHoleSummary(hole, library);
    const approval = resolvePlannerApprovalStatus(hole, library);
    return {
      holeName: hole.holeName,
      planType: plannerPlanType(hole),
      status: plannerStatus(hole),
      approvalLabel: approval.label,
      approvalState: approval.state,
      stationCount: String(summary.stationCount),
    };
  });

  const manifestSummary = [
    `${programHoles.length} planned holes`,
    `${qaReport?.clearancePairs.filter((p) => p.severity !== "ok").length ?? 0} clearance warnings`,
    `${qaReport?.programSummary.blockedHoleCount ?? 0} blocked holes`,
    "Package files: collars.csv, surveys.csv, coordinates.csv, clearance.csv, manifest.json",
    "Optional: planning-report.pdf, planning-report.txt",
  ];

  return {
    reportType: "Program Planning Report",
    programId,
    programName: program.name,
    siteName: program.siteName ?? "",
    programStatus: program.status,
    holeCount: String(program.holeCount),
    coordinateMetadata: formatCoordinateMetadata(pcs),
    qaSettingsSummary: formatQaSettings(settings),
    programQaSummary: qaReport
      ? [
          `Risk pairs: ${qaReport.programSummary.riskCount}`,
          `Watch pairs: ${qaReport.programSummary.watchCount}`,
          `Closest clearance: ${
            qaReport.programSummary.closestClearanceM !== null
              ? `${round(qaReport.programSummary.closestClearanceM, 2)} m`
              : "—"
          }`,
          `Blocked holes: ${qaReport.programSummary.blockedHoleCount}`,
        ]
      : ["No QA report available."],
    relationshipLines: serializeRelationshipTree(tree),
    clearanceRows: (qaReport?.clearancePairs ?? [])
      .filter((p) => p.severity !== "ok")
      .map(clearanceRow),
    holeStatusRows,
    manifestSummary,
    programMapImageBase64: opts.programMapImageBase64,
    disclaimer: PLANNER_HANDOFF_DISCLAIMER,
    generatedAt,
    dateLabel,
    timeLabel,
    filenameBase: slugify(program.name),
  };
}

export function buildPlannerApprovalCurrentForHole(
  hole: SavedHoleProject,
  library: HoleLibrary
) {
  return buildPlannerApprovalCurrent(hole, library);
}

export { plannerApprovalStatus };
