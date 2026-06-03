import type { DecisionHistoryEntry } from "./history";
import {
  buildHandoverReportData,
  handoverFilename,
  type HandoverReportOptions,
} from "./report-data";
import { round } from "./format";
import type { Recommendation, SurveyStation } from "./types";

const RULE = "═".repeat(62);
const RULE_LIGHT = "─".repeat(62);

function section(title: string, lines: string[]): string[] {
  return ["", title.toUpperCase(), RULE_LIGHT, ...lines];
}

function padLabel(label: string, width = 28): string {
  return `${label.padEnd(width)}`;
}

export function buildReportText(
  reco: Recommendation,
  actualStations: SurveyStation[],
  options?: HandoverReportOptions
): string {
  const data = buildHandoverReportData(reco, actualStations, options);

  const lines: string[] = [
    RULE,
    "  TARGETLOCK IQ — SHIFT HANDOVER REPORT",
    RULE,
    "",
    padLabel("Hole ID / name:") + data.holeName,
    ...(data.siteName
      ? [padLabel("Site / project:") + data.siteName]
      : []),
    ...(data.testScenarioName
      ? [padLabel("Test scenario:") + data.testScenarioName]
      : []),
    padLabel("Report generated:") + `${data.dateLabel}  ${data.timeLabel}`,
    padLabel("Latest survey depth:") + data.currentMd,
    padLabel("Overall status:") + data.status,
    padLabel("Confidence:") + data.confidence,
  ];

  lines.push(
    ...section("Hole position at last survey", [
      padLabel("Latest survey depth:") + data.currentMd,
      padLabel("Actual dip / azimuth:") + data.actualDipAzi,
      padLabel("Offset from plan:") + data.planOffset,
    ])
  );

  lines.push(
    ...section("Target definition", [
      padLabel("Target MD:") + data.targetMd,
      padLabel("Target offset (E / N / D):") + data.targetEnu.replace(/\|/g, "/"),
      padLabel("Target tolerance:") + `${data.tolerance} (3D envelope)`,
      padLabel("Max DLS (steering limit):") + data.dlsLimit,
      padLabel("Next survey interval:") + data.nextInterval,
    ])
  );

  lines.push(
    ...section("Trajectory outlook (no correction)", [
      padLabel("Projected miss at target:") + data.projectedMiss,
      padLabel("Miss vector (E / N / D):") + data.missVector.replace(/\|/g, "/"),
      padLabel("DLS required to target:") + data.dlsRequired,
    ])
  );

  lines.push(
    ...section("Recommended next interval", [
      padLabel("Aim dip:") + `${data.aimDip}  (${data.dipCorrection})`,
      padLabel("Aim azimuth:") + `${data.aimAzimuth}  (${data.aziCorrection})`,
      "",
      "Driller guidance:",
      `  ${data.drillerGuidance}`,
    ])
  );

  if (data.recoveryGuidance) {
    const rg = data.recoveryGuidance;
    lines.push(
      ...section("Recovery guidance", [
        padLabel("Current action:") + rg.currentAction,
        padLabel("Best method:") + rg.bestMethod,
        padLabel("Next aim:") + rg.nextAim,
        padLabel("Confidence:") + rg.confidence,
        padLabel("Escalation:") + rg.escalation,
        padLabel("Point of no return:") + rg.pointOfNoReturn,
        padLabel("Methods within assumptions:") + rg.methodSummary,
      ])
    );
  }

  if (data.planCorridorSummary) {
    lines.push(
      ...section("Plan corridor", [`  ${data.planCorridorSummary}`])
    );
  }

  if (data.surveyToolSummary.length) {
    lines.push(
      ...section("Survey tool profile", [
        ...data.surveyToolSummary.map((line) => `  ${line}`),
        ...(data.surveyUncertaintyNote
          ? ["", `  Uncertainty note: ${data.surveyUncertaintyNote}`]
          : []),
      ])
    );
  }

  if (data.recoveryAssumptionsSummary.length) {
    lines.push(
      ...section("Recovery capability assumptions (this hole)", [
        ...data.recoveryAssumptionsSummary.map((line) => `  ${line}`),
        "",
        "  These are configurable assumptions, not guaranteed tool performance.",
      ])
    );
  }

  lines.push(
    ...section("Validation status", [
      padLabel("Assumptions:") + data.validationStatus,
      `  ${data.validationDetail}`,
      "",
      "  Coordinate / survey conventions assumed:",
      ...data.conventions.map((line) => `    - ${line}`),
    ])
  );

  lines.push(
    ...section("Correction options by interval", [
      ...data.correctionOptions.map(
        (option, index) =>
          `  ${index + 1}. ${option.label.padEnd(18)} | Aim ${round(option.aimDip, 1)}° / ${round(option.aimAzimuth, 1)}° | Turn ${round(option.turn, 1)}° (${round(option.dls, 2)} DLS) | ${option.status}`
      ),
    ])
  );

  lines.push(
    ...section("Survey QA / QC", [
      ...data.qaFlags.map((flag) => {
        const tag = flag.level.toUpperCase().padEnd(5);
        return `  [${tag}] ${flag.label}: ${flag.message}`;
      }),
    ])
  );

  if (data.recentHistory.length) {
    lines.push(
      ...section("Recent decision history (this session)", [
        ...data.recentHistory.map((entry) => {
          const action = entry.action ? ` → ${entry.action}` : "";
          return `  ${entry.time}  ${entry.summary}${action}`;
        }),
      ])
    );
  }

  lines.push("", RULE_LIGHT, data.disclaimer.toUpperCase(), RULE);

  return lines.join("\n");
}

export function downloadReport(
  reco: Recommendation,
  actualStations: SurveyStation[],
  options?: HandoverReportOptions
) {
  const text = buildReportText(reco, actualStations, options);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = handoverFilename(
    options?.holeName ?? "hole",
    reco.current.md,
    "txt"
  );
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export { buildHandoverReportData, handoverFilename } from "./report-data";
