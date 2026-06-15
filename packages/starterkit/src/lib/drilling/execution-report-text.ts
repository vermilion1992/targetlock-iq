import { findHole, type HoleLibrary } from "./hole-library";
import {
  buildExecutionReportData,
  buildExecutionReportDataForHole,
  executionReportFilename,
  type ExecutionReportData,
} from "./execution-report-data";

const RULE = "═".repeat(62);
const RULE_LIGHT = "─".repeat(62);

function padLabel(label: string, width = 28): string {
  return `${label.padEnd(width)}`;
}

function section(title: string, lines: string[]): string[] {
  return ["", title.toUpperCase(), RULE_LIGHT, ...lines];
}

export function buildExecutionReportText(data: ExecutionReportData): string {
  const lines: string[] = [
    RULE,
    "  TARGETLOCK IQ — EXECUTION EVIDENCE REPORT",
    RULE,
    "",
    padLabel("Hole ID / name:") + data.holeName,
    padLabel("Program:") + data.programName,
    padLabel("Site:") + data.siteName,
    padLabel("Status / revision:") + `${data.status} / ${data.planRevision}`,
    padLabel("Report generated:") + `${data.dateLabel}  ${data.timeLabel}`,
  ];

  lines.push(
    ...section("Locked plan", [
      padLabel("Lock status:") + data.lockStatusLabel,
      padLabel("Locked at:") + (data.lockedAt?.slice(0, 19).replace("T", " ") ?? "—"),
      padLabel("Locked plan hash:") + (data.lockedPlanHash ?? "—"),
      padLabel("Execution state:") + data.executionState,
    ])
  );

  lines.push(
    ...section("Approval", [
      padLabel("Approval status:") + data.approvalLabel,
      padLabel("Detail:") + data.approvalDetail,
      padLabel("Approved by:") + (data.approvedBy ?? "—"),
      padLabel("Approved at:") +
        (data.approvedAt?.slice(0, 19).replace("T", " ") ?? "—"),
    ])
  );

  lines.push(
    ...section("Actual surveys", [
      padLabel("Survey count:") + String(data.actualSurveyCount),
      padLabel("Latest actual MD:") + data.latestActualMd,
      padLabel("Latest tracking:") + data.latestTrackingStatus,
      data.finalTrackingStatus
        ? padLabel("Final tracking:") + data.finalTrackingStatus
        : "",
    ].filter(Boolean))
  );

  lines.push(
    ...section("Actual vs locked plan", [
      padLabel("Summary:") + data.actualVsPlanSummary,
      ...data.actualVsPlanWarnings.map((w) => `  - ${w}`),
    ])
  );

  if (data.completionSummary.length) {
    lines.push(
      ...section("Completion", data.completionSummary.map((l) => `  ${l}`))
    );
  }

  if (data.decisionHistorySummary.length) {
    lines.push(
      ...section(
        "Decision history",
        data.decisionHistorySummary.map((l) => `  ${l}`)
      )
    );
  }

  if (data.revisionLineage) {
    lines.push(
      ...section("Revision lineage", [`  ${data.revisionLineage}`])
    );
  }

  if (data.warnings.length) {
    lines.push(
      ...section("Warnings", data.warnings.map((w) => `  - ${w}`))
    );
  }

  lines.push(
    ...section("Audit trail", [
      padLabel("Event count:") + String(data.auditEventCount),
      ...data.events.slice(-20).map(
        (e) =>
          `  ${e.timestamp.slice(0, 16).replace("T", " ")} [${e.kind}] ${e.summary}`
      ),
    ])
  );

  lines.push("", RULE_LIGHT, data.disclaimer, RULE);

  return lines.join("\n");
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

export function exportExecutionTxt(
  library: HoleLibrary,
  holeId: string
): string | null {
  const data = buildExecutionReportDataForHole(library, holeId);
  if (!data) return null;
  return buildExecutionReportText(data);
}

export function downloadExecutionTxt(
  library: HoleLibrary,
  holeId: string
): boolean {
  const hole = findHole(library, holeId);
  if (!hole) return false;
  const data = buildExecutionReportData(hole, library);
  if (!data) return false;
  const text = buildExecutionReportText(data);
  triggerDownload(text, executionReportFilename(hole.holeName, "txt"));
  return true;
}
