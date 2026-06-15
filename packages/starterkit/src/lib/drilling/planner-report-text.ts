import { findHole, type HoleLibrary } from "./hole-library";
import {
  buildHolePlanningReportData,
  buildProgramPlanningReportData,
  holePlanningFilename,
  programPlanningFilename,
  type PlannerHoleReportData,
  type PlannerProgramReportData,
} from "./planner-report-data";

const RULE = "═".repeat(62);
const RULE_LIGHT = "─".repeat(62);

function section(title: string, lines: string[]): string[] {
  return ["", title.toUpperCase(), RULE_LIGHT, ...lines];
}

function padLabel(label: string, width = 28): string {
  return `${label.padEnd(width)}`;
}

function triggerDownload(content: string, filename: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildHolePlanningReportText(data: PlannerHoleReportData): string {
  const lines: string[] = [
    RULE,
    "  TARGETLOCK IQ — DRILL PLANNING REPORT",
    RULE,
    "",
    padLabel("Hole ID / name:") + data.holeName,
    padLabel("Program:") + data.programName,
    padLabel("Plan type:") + data.planType,
    padLabel("Status / revision:") + `${data.status} / R${data.revision}`,
    padLabel("Report generated:") + `${data.dateLabel}  ${data.timeLabel}`,
  ];

  lines.push(
    ...section("Plan summary", [
      padLabel("Collar / kickoff:") + data.collarOrKickoff,
      padLabel("Target coordinates:") + data.targetCoords,
      padLabel("Planned TD:") + data.plannedTd,
      padLabel("Target MD:") + data.targetMd,
      padLabel("Dip / azimuth:") + data.dipAzimuthSummary,
      padLabel("Station count:") + data.stationCount,
      padLabel("Max DLS:") + data.maxDls,
    ])
  );

  lines.push(
    ...section("Coordinate metadata", data.coordinateMetadata.map((l) => `  ${l}`))
  );

  lines.push(
    ...section("QA summary", [
      padLabel("QA badge:") + data.qaBadge,
      ...data.qaSettingsSummary.map((l) => `  ${l}`),
    ])
  );

  if (data.drillabilityWarnings.length) {
    lines.push(
      ...section("Drillability warnings", data.drillabilityWarnings.map((w) => `  - ${w}`))
    );
  }

  if (data.clearanceWarnings.length) {
    lines.push(
      ...section("Clearance warnings", data.clearanceWarnings.map((w) => `  - ${w}`))
    );
  }

  if (data.surveyRows.length) {
    lines.push("", "PLANNED SURVEY", RULE_LIGHT);
    lines.push(padLabel("MD (m)", 12) + padLabel("Dip (deg)", 14) + "Azimuth (deg)");
    for (const row of data.surveyRows) {
      lines.push(
        padLabel(row.md, 12) + padLabel(row.dip, 14) + row.azimuth
      );
    }
  }

  lines.push(
    ...section("Approval", [
      padLabel("Status:") + data.approvalLabel,
      padLabel("Detail:") + data.approvalDetail,
      padLabel("Approved by:") + data.approvedBy,
      padLabel("Approved at:") + data.approvedAt,
    ])
  );

  if (
    data.executionState ||
    data.completedAt ||
    data.finalActualMd ||
    data.revisionLineage
  ) {
    const execLines: string[] = [];
    if (data.executionState) {
      execLines.push(padLabel("Execution state:") + data.executionState);
    }
    if (data.completedAt) {
      execLines.push(
        padLabel("Completed:") +
          `${data.completedAt}${data.completedBy ? ` by ${data.completedBy}` : ""}`
      );
    }
    if (data.finalActualMd) {
      execLines.push(padLabel("Final actual MD:") + data.finalActualMd);
    }
    if (data.finalTrackingStatus) {
      execLines.push(padLabel("Final tracking:") + data.finalTrackingStatus);
    }
    if (data.revisionLineage) {
      execLines.push(padLabel("Revision lineage:") + data.revisionLineage);
    }
    lines.push(...section("Execution / completion", execLines));
  }

  lines.push("", "DISCLAIMER", RULE_LIGHT, `  ${data.disclaimer}`, "");
  return lines.join("\n");
}

export function buildProgramPlanningReportText(
  data: PlannerProgramReportData
): string {
  const lines: string[] = [
    RULE,
    "  TARGETLOCK IQ — PROGRAM PLANNING REPORT",
    RULE,
    "",
    padLabel("Program:") + data.programName,
    padLabel("Program ID:") + data.programId,
    padLabel("Status:") + data.programStatus,
    padLabel("Hole count:") + data.holeCount,
    padLabel("Report generated:") + `${data.dateLabel}  ${data.timeLabel}`,
  ];

  lines.push(
    ...section("Program QA summary", data.programQaSummary.map((l) => `  ${l}`))
  );

  lines.push(
    ...section("Coordinate metadata", data.coordinateMetadata.map((l) => `  ${l}`))
  );

  lines.push(
    ...section("QA settings", data.qaSettingsSummary.map((l) => `  ${l}`))
  );

  if (data.relationshipLines.length) {
    lines.push(
      ...section("Mother / daughter tree", data.relationshipLines.map((l) => `  ${l}`))
    );
  }

  if (data.clearanceRows.length) {
    lines.push("", "CLEARANCE TABLE", RULE_LIGHT);
    for (const row of data.clearanceRows) {
      lines.push(
        `  ${row.holeA} ↔ ${row.holeB} (${row.relationship}) — ${row.distance} [${row.severity}]`
      );
      lines.push(`    ${row.message}`);
    }
  }

  if (data.holeStatusRows.length) {
    lines.push("", "PER-HOLE STATUS", RULE_LIGHT);
    lines.push(
      padLabel("Hole", 16) +
        padLabel("Type", 10) +
        padLabel("Status", 12) +
        padLabel("Approval", 18) +
        "Stations"
    );
    for (const row of data.holeStatusRows) {
      lines.push(
        padLabel(row.holeName, 16) +
          padLabel(row.planType, 10) +
          padLabel(row.status, 12) +
          padLabel(row.approvalLabel, 18) +
          row.stationCount
      );
    }
  }

  lines.push(
    ...section("Export manifest", data.manifestSummary.map((l) => `  ${l}`))
  );

  lines.push("", "DISCLAIMER", RULE_LIGHT, `  ${data.disclaimer}`, "");
  return lines.join("\n");
}

export function exportHolePlanningTxt(
  library: HoleLibrary,
  holeId: string
): string | null {
  const data = buildHolePlanningReportData(library, holeId);
  if (!data) return null;
  return buildHolePlanningReportText(data);
}

export function exportProgramPlanningTxt(
  library: HoleLibrary,
  programId: string
): string | null {
  const data = buildProgramPlanningReportData(library, programId);
  if (!data) return null;
  return buildProgramPlanningReportText(data);
}

export function downloadHolePlanningReportTxt(
  library: HoleLibrary,
  holeId: string
): void {
  const hole = findHole(library, holeId);
  const text = exportHolePlanningTxt(library, holeId);
  if (!text || !hole) return;
  triggerDownload(text, holePlanningFilename(hole.holeName, "txt"));
}

export function downloadProgramPlanningReportTxt(
  library: HoleLibrary,
  programId: string,
  programName: string
): void {
  const text = exportProgramPlanningTxt(library, programId);
  if (!text) return;
  triggerDownload(text, programPlanningFilename(programName, "txt"));
}
