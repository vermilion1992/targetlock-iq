import type { BranchReportData } from "./branch-report-data";
import { buildBranchPdfViewModel } from "./report-pdf-layout";
import {
  BRANCH_TRAJECTORY_LEGEND,
  drawPdfAppendixHeader,
  drawPdfDisclaimerPanel,
  drawPdfEyebrow,
  drawPdfHeroMetric,
  drawPdfKeyMetricsRow,
  drawPdfMasthead,
  drawPdfNoticeStrip,
  drawPdfPageBackground,
  drawPdfPageFooter,
  drawPdfSectionHeader,
  drawPdfStatusBand,
  drawPdfTrajectoryBlock,
  PDF_COLORS,
  PDF_MARGIN,
} from "./pdf-brand";

export async function buildBranchReportPdfBlob(data: BranchReportData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = PDF_MARGIN;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = 0;
  let pageNum = 1;

  const vm = buildBranchPdfViewModel(data);
  const p1 = vm.page1;

  const dateLabel = data.generatedAt.toLocaleDateString("en-AU", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeLabel = data.generatedAt.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const beginNewPage = () => {
    drawPdfPageFooter(doc, pageNum, data.holeName, margin, pageWidth, pageHeight);
    doc.addPage();
    pageNum += 1;
    y = PDF_MARGIN;
    drawPdfPageBackground(doc, pageWidth, pageHeight);
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 18) {
      beginNewPage();
    }
  };

  drawPdfPageBackground(doc, pageWidth, pageHeight);

  y = drawPdfMasthead(doc, {
    margin,
    pageWidth,
    reportType: data.reportType,
    holeName: data.holeName,
    siteName: data.siteName,
    dateLabel,
    timeLabel,
    logoImagePng: data.logoImagePng,
    extraLine: data.daughterContext,
  });

  y = drawPdfEyebrow(doc, margin, y, "Branch program summary");

  const isWarn = p1.summaryApproval.includes("WARNING");
  y = drawPdfStatusBand(doc, y, {
    margin,
    pageWidth,
    contentWidth,
    status: p1.summaryApproval.replace(/^Approval:\s*/i, ""),
    confidence: p1.daughterId,
    currentMd: p1.title,
    statusClassName: isWarn ? "risk" : "on-track",
  });

  y = drawPdfEyebrow(doc, margin, y, "Key metrics");

  y = drawPdfHeroMetric(doc, margin, y, contentWidth, "Selected target", p1.summaryTarget);

  y = drawPdfKeyMetricsRow(doc, y, margin, contentWidth, [
    { label: "Kickoff MD", value: p1.summaryKickoffMd },
    { label: "Required DLS", value: p1.summaryRequiredDls },
    { label: "Separation", value: p1.summarySeparation },
    { label: "Daughter", value: p1.daughterId },
  ]);

  if (p1.toolfaceOneLiner) {
    y = drawPdfNoticeStrip(doc, y, margin, contentWidth, p1.toolfaceOneLiner, "Toolface guidance");
  }

  y = drawPdfTrajectoryBlock(doc, y, {
    margin,
    contentWidth,
    imageDataUrl: data.trajectoryImagePng,
    legend: BRANCH_TRAJECTORY_LEGEND,
    imageHeightMm: 52,
  });

  if (vm.appendix.hasAppendixContent) {
    beginNewPage();
    y = drawPdfAppendixHeader(doc, y, margin, contentWidth, data.holeName);

    if (vm.appendix.kickoffLines.length) {
      y = drawPdfSectionHeader(doc, y, margin, contentWidth, "Kickoff options");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...PDF_COLORS.ink);
      for (const line of vm.appendix.kickoffLines) {
        ensureSpace(6);
        doc.text(doc.splitTextToSize(line, contentWidth - 12), margin + 6, y);
        y += 5;
      }
      y += 4;
    }

    for (const section of vm.appendix.sections) {
      ensureSpace(14);
      y = drawPdfSectionHeader(doc, y, margin, contentWidth, section.title);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...PDF_COLORS.ink);
      for (const line of section.lines) {
        ensureSpace(6);
        const isLineWarn = line.startsWith("WARNING");
        if (isLineWarn) doc.setTextColor(...PDF_COLORS.risk);
        const wrapped = doc.splitTextToSize(line, contentWidth - 12);
        doc.text(wrapped, margin + 6, y);
        y += wrapped.length * 4 + 1.5;
        if (isLineWarn) doc.setTextColor(...PDF_COLORS.ink);
      }
      y += 4;
    }
  }

  ensureSpace(24);
  y = drawPdfDisclaimerPanel(doc, y, margin, contentWidth, vm.appendix.disclaimer);
  drawPdfPageFooter(doc, pageNum, data.holeName, margin, pageWidth, pageHeight);

  return doc.output("blob");
}

export async function downloadBranchReportPdf(data: BranchReportData): Promise<void> {
  const blob = await buildBranchReportPdfBlob(data);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = data.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
