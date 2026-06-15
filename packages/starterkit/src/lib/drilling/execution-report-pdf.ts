import { findHole, type HoleLibrary } from "./hole-library";
import { loadPdfLogoBase64 } from "./pdf-brand";
import {
  drawPdfDisclaimerPanel,
  drawPdfEyebrow,
  drawPdfKeyValueRows,
  drawPdfMasthead,
  drawPdfPageBackground,
  drawPdfPageFooter,
  drawPdfSectionHeader,
  PDF_COLORS,
  PDF_MARGIN,
} from "./pdf-brand";
import {
  buildExecutionReportData,
  executionReportFilename,
  type ExecutionReportData,
} from "./execution-report-data";
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

export function collectExecutionPdfStrings(data: ExecutionReportData): string[] {
  return [
    data.holeName,
    data.programName,
    data.disclaimer,
    ...data.events.map((e) => e.summary),
  ].map(sanitizePdfText);
}

export async function buildExecutionPdfBlob(
  data: ExecutionReportData
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" }) as JsPdfWithAutoTable;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN;
  const contentWidth = pageWidth - margin * 2;

  const layout: PdfLayout = {
    doc,
    margin,
    pageWidth,
    pageHeight,
    contentWidth,
    y: margin,
    pageNum: 1,
    holeName: data.holeName,
  };

  drawPdfPageBackground(doc, pageWidth, pageHeight);

  layout.y = drawPdfMasthead(doc, {
    margin,
    pageWidth,
    reportType: "Execution evidence",
    holeName: data.holeName,
    siteName: data.siteName,
    dateLabel: data.dateLabel,
    timeLabel: data.timeLabel,
    logoImagePng: await loadPdfLogoBase64(),
    extraLine: `${data.status} / ${data.planRevision}`,
  });

  layout.y = drawPdfEyebrow(doc, margin, layout.y, "Planner execution audit trail");

  layout.y = drawPdfSectionHeader(
    doc,
    layout.y,
    margin,
    contentWidth,
    "Hole summary"
  );
  layout.y = drawPdfKeyValueRows(doc, margin, layout.y, contentWidth, [
    { label: "Program", value: data.programName },
    { label: "Status / revision", value: `${data.status} / ${data.planRevision}` },
    { label: "Generated", value: `${data.dateLabel} ${data.timeLabel}` },
    { label: "Execution state", value: data.executionState },
  ]);

  layout.y = drawPdfSectionHeader(
    doc,
    layout.y,
    margin,
    contentWidth,
    "Locked plan & approval"
  );
  layout.y = drawPdfKeyValueRows(doc, margin, layout.y, contentWidth, [
    { label: "Lock status", value: data.lockStatusLabel },
    { label: "Locked plan hash", value: data.lockedPlanHash ?? "—" },
    { label: "Approval", value: data.approvalLabel },
    { label: "Approved by", value: data.approvedBy ?? "—" },
  ]);

  layout.y = drawPdfSectionHeader(
    doc,
    layout.y,
    margin,
    contentWidth,
    "Actual vs locked plan"
  );
  layout.y = drawPdfKeyValueRows(doc, margin, layout.y, contentWidth, [
    { label: "Survey count", value: String(data.actualSurveyCount) },
    { label: "Latest actual MD", value: data.latestActualMd },
    { label: "Latest tracking", value: data.latestTrackingStatus },
    { label: "Summary", value: data.actualVsPlanSummary },
  ]);

  if (data.completionSummary.length) {
    layout.y = drawPdfSectionHeader(
      doc,
      layout.y,
      margin,
      contentWidth,
      "Completion"
    );
    writeLines(layout, data.completionSummary);
  }

  if (data.revisionLineage) {
    layout.y = drawPdfSectionHeader(
      doc,
      layout.y,
      margin,
      contentWidth,
      "Revision lineage"
    );
    writeLines(layout, [data.revisionLineage]);
  }

  if (data.decisionHistorySummary.length) {
    layout.y = drawPdfSectionHeader(
      doc,
      layout.y,
      margin,
      contentWidth,
      "Decision history"
    );
    writeLines(layout, data.decisionHistorySummary);
  }

  layout.y = drawPdfSectionHeader(
    doc,
    layout.y,
    margin,
    contentWidth,
    "Audit events"
  );
  writeLines(
    layout,
    data.events.slice(-15).map(
      (e) =>
        `${e.timestamp.slice(0, 16).replace("T", " ")} — ${e.summary}`
    )
  );

  ensureSpace(layout, 28);
  layout.y = drawPdfDisclaimerPanel(
    doc,
    layout.y,
    margin,
    contentWidth,
    data.disclaimer
  );

  drawPdfPageFooter(
    doc,
    layout.pageNum,
    layout.holeName,
    margin,
    pageWidth,
    pageHeight
  );

  return doc.output("blob");
}

export async function downloadExecutionPdf(
  library: HoleLibrary,
  holeId: string
): Promise<boolean> {
  const hole = findHole(library, holeId);
  if (!hole) return false;
  const data = buildExecutionReportData(hole, library);
  if (!data) return false;
  const blob = await buildExecutionPdfBlob(data);
  if (typeof window === "undefined") return false;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = executionReportFilename(hole.holeName, "pdf");
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}
