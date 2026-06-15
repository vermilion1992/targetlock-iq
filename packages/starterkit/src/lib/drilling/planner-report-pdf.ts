import { findHole, type HoleLibrary } from "./hole-library";
import { loadPdfLogoBase64 } from "./pdf-brand";
import {
  drawPdfAppendixHeader,
  drawPdfDisclaimerPanel,
  drawPdfEyebrow,
  drawPdfKeyValueRows,
  drawPdfMasthead,
  drawPdfPageBackground,
  drawPdfPageFooter,
  drawPdfSectionHeader,
  drawPdfStatusBand,
  drawPdfTrajectoryBlock,
  PDF_COLORS,
  PDF_MARGIN,
  PDF_QA_TABLE_OPTS,
} from "./pdf-brand";
import {
  buildHolePlanningReportData,
  buildProgramPlanningReportData,
  holePlanningFilename,
  programPlanningFilename,
  type PlannerHoleReportData,
  type PlannerProgramReportData,
} from "./planner-report-data";
import { sanitizePdfText } from "./report-pdf-layout";

type JsPdfWithAutoTable = import("jspdf").jsPDF & {
  lastAutoTable: { finalY: number };
};

type PdfLayout = {
  doc: JsPdfWithAutoTable;
  margin: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  y: number;
  pageNum: number;
  holeName: string;
};

function approvalStatusClass(state: PlannerHoleReportData["approvalState"]): string {
  if (state === "current") return "on-track";
  if (state === "stale") return "risk";
  return "watch";
}

function ensureSpace(layout: PdfLayout, needed: number) {
  if (layout.y + needed > layout.pageHeight - 18) {
    drawPdfPageFooter(
      layout.doc,
      layout.pageNum,
      layout.holeName,
      layout.margin,
      layout.pageWidth,
      layout.pageHeight
    );
    layout.doc.addPage();
    layout.pageNum += 1;
    layout.y = PDF_MARGIN;
    drawPdfPageBackground(layout.doc, layout.pageWidth, layout.pageHeight);
  }
}

function writeLines(layout: PdfLayout, lines: string[]) {
  const doc = layout.doc;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.ink);
  for (const line of lines) {
    ensureSpace(layout, 6);
    const wrapped = doc.splitTextToSize(sanitizePdfText(line), layout.contentWidth - 12);
    doc.text(wrapped, layout.margin + 6, layout.y);
    layout.y += wrapped.length * 4.2 + 1;
  }
}

export function collectPlannerHolePdfStrings(data: PlannerHoleReportData): string[] {
  return [
    data.holeName,
    data.programName,
    data.approvalLabel,
    data.disclaimer,
    ...data.surveyRows.map((r) => `${r.md} ${r.dip} ${r.azimuth}`),
  ].map(sanitizePdfText);
}

export function collectPlannerProgramPdfStrings(
  data: PlannerProgramReportData
): string[] {
  return [
    data.programName,
    data.disclaimer,
    ...data.holeStatusRows.map((r) => r.holeName),
  ].map(sanitizePdfText);
}

export async function buildHolePlanningPdfBlob(
  data: PlannerHoleReportData
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = PDF_MARGIN;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;

  const layout: PdfLayout = {
    doc: doc as JsPdfWithAutoTable,
    margin,
    pageWidth,
    pageHeight,
    contentWidth,
    y: 0,
    pageNum: 1,
    holeName: data.holeName,
  };

  drawPdfPageBackground(doc, pageWidth, pageHeight);

  layout.y = drawPdfMasthead(doc, {
    margin,
    pageWidth,
    reportType: data.reportType,
    holeName: data.holeName,
    siteName: data.programName,
    dateLabel: data.dateLabel,
    timeLabel: data.timeLabel,
    logoImagePng: await loadPdfLogoBase64(),
    extraLine: `Revision R${data.revision} · ${data.planType}`,
  });

  layout.y = drawPdfEyebrow(doc, margin, layout.y, "Plan summary");

  layout.y = drawPdfStatusBand(doc, layout.y, {
    margin,
    pageWidth,
    contentWidth,
    status: data.approvalLabel,
    confidence: data.qaBadge,
    currentMd: data.status,
    statusClassName: approvalStatusClass(data.approvalState),
  });

  layout.y = drawPdfKeyValueRows(doc, margin, layout.y, contentWidth, [
    { label: "Collar / kickoff", value: data.collarOrKickoff },
    { label: "Target", value: data.targetCoords },
    { label: "Planned TD", value: data.plannedTd },
    { label: "Target MD", value: data.targetMd },
    { label: "Dip / azimuth", value: data.dipAzimuthSummary },
    { label: "Stations", value: data.stationCount },
    { label: "Max DLS", value: data.maxDls },
  ]);

  if (data.planViewImageBase64) {
    layout.y = drawPdfTrajectoryBlock(doc, layout.y, {
      margin,
      contentWidth,
      imageDataUrl: data.planViewImageBase64,
      legend: [{ label: "Planned path", color: [29, 91, 184] }],
      imageHeightMm: 48,
    });
  }

  ensureSpace(layout, 20);
  layout.y = drawPdfSectionHeader(doc, layout.y, margin, contentWidth, "QA summary");
  writeLines(layout, [
    `QA badge: ${data.qaBadge}`,
    ...data.qaSettingsSummary,
    ...data.drillabilityWarnings.map((w) => `Drillability: ${w}`),
    ...data.clearanceWarnings.map((w) => `Clearance: ${w}`),
  ]);

  if (data.surveyRows.length) {
    ensureSpace(layout, 20);
    layout.y = drawPdfSectionHeader(doc, layout.y, margin, contentWidth, "Planned survey");
    autoTable(doc, {
      startY: layout.y,
      margin: { left: margin, right: margin },
      head: [["MD (m)", "Dip (deg)", "Azimuth (deg)"]],
      body: data.surveyRows.map((r) => [r.md, r.dip, r.azimuth]),
      ...PDF_QA_TABLE_OPTS,
    });
    layout.y = layout.doc.lastAutoTable.finalY + 8;
  }

  ensureSpace(layout, 20);
  layout.y = drawPdfSectionHeader(doc, layout.y, margin, contentWidth, "Coordinate metadata");
  writeLines(layout, data.coordinateMetadata);

  ensureSpace(layout, 20);
  layout.y = drawPdfSectionHeader(doc, layout.y, margin, contentWidth, "Approval");
  writeLines(layout, [
    data.approvalDetail,
    `Approved by: ${data.approvedBy}`,
    `Approved at: ${data.approvedAt}`,
  ]);

  ensureSpace(layout, 24);
  layout.y = drawPdfDisclaimerPanel(
    doc,
    layout.y,
    margin,
    contentWidth,
    data.disclaimer
  );

  drawPdfPageFooter(doc, layout.pageNum, data.holeName, margin, pageWidth, pageHeight);
  return doc.output("blob");
}

export async function buildProgramPlanningPdfBlob(
  data: PlannerProgramReportData
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = PDF_MARGIN;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;

  const layout: PdfLayout = {
    doc: doc as JsPdfWithAutoTable,
    margin,
    pageWidth,
    pageHeight,
    contentWidth,
    y: 0,
    pageNum: 1,
    holeName: data.programName,
  };

  drawPdfPageBackground(doc, pageWidth, pageHeight);

  layout.y = drawPdfMasthead(doc, {
    margin,
    pageWidth,
    reportType: data.reportType,
    holeName: data.programName,
    siteName: data.siteName,
    dateLabel: data.dateLabel,
    timeLabel: data.timeLabel,
    logoImagePng: await loadPdfLogoBase64(),
    extraLine: `${data.holeCount} holes · ${data.programStatus}`,
  });

  layout.y = drawPdfEyebrow(doc, margin, layout.y, "Program summary");
  writeLines(layout, data.programQaSummary);

  if (data.programMapImageBase64) {
    layout.y = drawPdfTrajectoryBlock(doc, layout.y, {
      margin,
      contentWidth,
      imageDataUrl: data.programMapImageBase64,
      legend: [{ label: "Program map", color: [29, 91, 184] }],
      imageHeightMm: 52,
    });
  }

  if (data.relationshipLines.length) {
    ensureSpace(layout, 16);
    layout.y = drawPdfSectionHeader(doc, layout.y, margin, contentWidth, "Relationship tree");
    writeLines(layout, data.relationshipLines);
  }

  if (data.clearanceRows.length) {
    ensureSpace(layout, 20);
    layout.y = drawPdfSectionHeader(doc, layout.y, margin, contentWidth, "Clearance table");
    autoTable(doc, {
      startY: layout.y,
      margin: { left: margin, right: margin },
      head: [["Hole A", "Hole B", "Relationship", "Distance", "Severity"]],
      body: data.clearanceRows.map((r) => [
        r.holeA,
        r.holeB,
        r.relationship,
        r.distance,
        r.severity,
      ]),
      ...PDF_QA_TABLE_OPTS,
    });
    layout.y = layout.doc.lastAutoTable.finalY + 8;
  }

  if (data.holeStatusRows.length) {
    ensureSpace(layout, 20);
    layout.y = drawPdfSectionHeader(doc, layout.y, margin, contentWidth, "Per-hole status");
    autoTable(doc, {
      startY: layout.y,
      margin: { left: margin, right: margin },
      head: [["Hole", "Type", "Status", "Approval", "Stations"]],
      body: data.holeStatusRows.map((r) => [
        r.holeName,
        r.planType,
        r.status,
        r.approvalLabel,
        r.stationCount,
      ]),
      ...PDF_QA_TABLE_OPTS,
    });
    layout.y = layout.doc.lastAutoTable.finalY + 8;
  }

  ensureSpace(layout, 20);
  layout.y = drawPdfAppendixHeader(doc, layout.y, margin, contentWidth, data.programName);
  layout.y = drawPdfSectionHeader(doc, layout.y, margin, contentWidth, "Export manifest");
  writeLines(layout, data.manifestSummary);

  ensureSpace(layout, 24);
  layout.y = drawPdfDisclaimerPanel(
    doc,
    layout.y,
    margin,
    contentWidth,
    data.disclaimer
  );

  drawPdfPageFooter(doc, layout.pageNum, data.programName, margin, pageWidth, pageHeight);
  return doc.output("blob");
}

export type DownloadHolePdfOpts = {
  planViewImageBase64?: string;
};

export async function downloadHolePlanningPdf(
  library: HoleLibrary,
  holeId: string,
  opts: DownloadHolePdfOpts = {}
): Promise<void> {
  if (typeof window === "undefined") return;
  const data = buildHolePlanningReportData(library, holeId, {
    planViewImageBase64: opts.planViewImageBase64,
  });
  if (!data) return;
  const blob = await buildHolePlanningPdfBlob(data);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = holePlanningFilename(data.holeName, "pdf");
  anchor.click();
  URL.revokeObjectURL(url);
}

export type DownloadProgramPdfOpts = {
  programMapImageBase64?: string;
};

export async function downloadProgramPlanningPdf(
  library: HoleLibrary,
  programId: string,
  programName: string,
  opts: DownloadProgramPdfOpts = {}
): Promise<void> {
  if (typeof window === "undefined") return;
  const data = buildProgramPlanningReportData(library, programId, {
    programMapImageBase64: opts.programMapImageBase64,
  });
  if (!data) return;
  const blob = await buildProgramPlanningPdfBlob(data);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = programPlanningFilename(programName, "pdf");
  anchor.click();
  URL.revokeObjectURL(url);
}

export function resolveHoleForPdf(library: HoleLibrary, holeId: string) {
  return findHole(library, holeId);
}
