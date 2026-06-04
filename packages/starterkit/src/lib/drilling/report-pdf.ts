import {
  buildHandoverReportData,
  handoverFilename,
  type HandoverReportData,
  type HandoverReportOptions,
} from "./report-data";
import {
  buildHandoverPdfViewModel,
  type HandoverPdfLayoutContext,
  type HandoverPdfViewModel,
} from "./report-pdf-layout";
import {
  drawPdfAppendixHeader,
  drawPdfDisclaimerPanel,
  drawPdfEyebrow,
  drawPdfHeroMetric,
  drawPdfInlineMetricPair,
  drawPdfKeyValueRows,
  drawPdfLeadLine,
  drawPdfMasthead,
  drawPdfMetricPairRow,
  drawPdfModalCardFrame,
  drawPdfNoticeStrip,
  drawPdfPageBackground,
  drawPdfPageFooter,
  drawPdfSectionHeader,
  drawPdfStatusBand,
  drawPdfTrajectoryBlock,
  HANDOVER_TRAJECTORY_LEGEND,
  loadPdfLogoBase64,
  measureModalCardBody,
  PDF_CARD_PAD,
  PDF_COLORS,
  PDF_CORRECTION_TABLE_OPTS,
  PDF_LINE_HEIGHT,
  PDF_MARGIN,
  PDF_QA_TABLE_OPTS,
  qaLevelColor,
} from "./pdf-brand";
import { getTrajectorySnapshot } from "./trajectory-snapshot";
import { round } from "./format";
import type { Recommendation, SurveyStation } from "./types";

type JsPdfWithTable = import("jspdf").jsPDF & {
  lastAutoTable: { finalY: number };
};

type PdfLayout = {
  margin: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  doc: JsPdfWithTable;
  y: number;
  pageNum: number;
  holeName: string;
};

function beginNewPage(layout: PdfLayout): void {
  const { doc, margin, pageWidth, pageHeight, holeName } = layout;
  drawPdfPageFooter(doc, layout.pageNum, holeName, margin, pageWidth, pageHeight);
  doc.addPage();
  layout.pageNum += 1;
  layout.y = PDF_MARGIN;
  drawPdfPageBackground(doc, pageWidth, pageHeight);
}

function ensureSpace(layout: PdfLayout, needed: number) {
  const { pageHeight } = layout;
  if (layout.y + needed > pageHeight - 18) {
    beginNewPage(layout);
  }
}

function writeLines(
  layout: PdfLayout,
  lines: string[],
  opts?: { fontSize?: number; bold?: boolean; color?: [number, number, number] }
) {
  const { doc, margin, contentWidth } = layout;
  const fontSize = opts?.fontSize ?? 8.5;
  const innerX = margin + 6;
  const innerW = contentWidth - 12;
  doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...(opts?.color ?? PDF_COLORS.ink));
  for (const line of lines) {
    ensureSpace(layout, 6);
    const wrapped = doc.splitTextToSize(line, innerW);
    doc.text(wrapped, innerX, layout.y);
    layout.y += wrapped.length * (fontSize * 0.44) + 2;
  }
}

function writeKeyValueBlock(layout: PdfLayout, rows: { label: string; value: string; muted?: boolean }[]) {
  ensureSpace(layout, rows.length * PDF_LINE_HEIGHT + 4);
  layout.y = drawPdfKeyValueRows(
    layout.doc,
    layout.margin + 6,
    layout.y,
    layout.contentWidth - 12,
    rows
  );
  layout.y += 2;
}

function renderPage1(
  layout: PdfLayout,
  data: HandoverReportData,
  vm: HandoverPdfViewModel
) {
  const { doc, margin, pageWidth, pageHeight, contentWidth } = layout;
  const p1 = vm.page1;

  drawPdfPageBackground(doc, pageWidth, pageHeight);

  layout.y = drawPdfMasthead(doc, {
    margin,
    pageWidth,
    reportType: data.reportType,
    holeName: data.holeName,
    siteName: data.siteName,
    dateLabel: data.dateLabel,
    timeLabel: data.timeLabel,
    logoImagePng: data.logoImagePng,
    extraLine: data.testScenarioName,
  });

  layout.y = drawPdfEyebrow(doc, margin, layout.y, "Decision summary");

  layout.y = drawPdfStatusBand(doc, layout.y, {
    margin,
    pageWidth,
    contentWidth,
    status: data.status,
    confidence: data.confidence,
    currentMd: data.currentMd,
    statusClassName: data.statusClassName,
  });

  layout.y = drawPdfEyebrow(doc, margin, layout.y, "Key metrics");

  layout.y = drawPdfHeroMetric(
    doc,
    margin,
    layout.y,
    contentWidth,
    "Projected miss vs tolerance",
    p1.projectedMissVsTolerance
  );

  layout.y = drawPdfMetricPairRow(doc, layout.y, margin, contentWidth, {
    label: "Offset from plan",
    value: p1.offsetFromPlan,
  }, {
    label: "DLS required vs limit",
    value: p1.dlsRequiredVsLimit,
  });

  const innerX = margin + PDF_CARD_PAD;
  const innerW = contentWidth - PDF_CARD_PAD * 2;
  const aimKeyValues = [
    { label: "Change from latest", value: p1.changeFromLatest, muted: true },
    { label: "Next check depth", value: p1.nextCheckDepth },
  ];
  const aimBodyH = measureModalCardBody(doc, innerW, {
    leadLine: p1.nextIntervalAimLine,
    inlineMetrics: [
      { label: "Dip aim", value: p1.aimDip },
      { label: "Azimuth aim", value: p1.aimAzimuth },
    ],
    keyValues: aimKeyValues,
  });
  const aimCardTop = layout.y;
  const aimContentY = drawPdfModalCardFrame(doc, aimCardTop, aimBodyH, {
    margin,
    contentWidth,
    title: "Next interval aim",
    accent: PDF_COLORS.accent,
  });
  layout.y = drawPdfLeadLine(doc, innerX, aimContentY, innerW, p1.nextIntervalAimLine);
  layout.y = drawPdfInlineMetricPair(doc, innerX, layout.y + 1, innerW, {
    label: "Dip aim",
    value: p1.aimDip,
  }, {
    label: "Azimuth aim",
    value: p1.aimAzimuth,
  });
  layout.y = drawPdfKeyValueRows(doc, innerX, layout.y, innerW, aimKeyValues);
  layout.y = aimCardTop + 8 + aimBodyH + 6;

  layout.y = drawPdfNoticeStrip(doc, layout.y, margin, contentWidth, p1.recoveryOneLiner);

  layout.y = drawPdfTrajectoryBlock(doc, layout.y, {
    margin,
    contentWidth,
    imageDataUrl: data.trajectoryImagePng,
    legend: HANDOVER_TRAJECTORY_LEGEND,
    imageHeightMm: 52,
  });
}

function renderAppendix(
  layout: PdfLayout,
  vm: HandoverPdfViewModel,
  autoTable: (typeof import("jspdf-autotable"))["default"]
) {
  const { doc, margin, contentWidth, holeName } = layout;
  const apx = vm.appendix;

  if (!apx.hasAppendixContent) return;

  beginNewPage(layout);
  layout.y = drawPdfAppendixHeader(doc, layout.y, margin, contentWidth, holeName);

  if (apx.recoveryGuidanceFull) {
    layout.y = drawPdfSectionHeader(doc, layout.y, margin, contentWidth, "Recovery guidance");
    const rg = apx.recoveryGuidanceFull;
    writeKeyValueBlock(layout, [
      { label: "Current action", value: rg.currentAction },
      { label: "Best method", value: rg.bestMethod },
      { label: "Next aim", value: rg.nextAim },
      { label: "Confidence", value: rg.confidence },
      { label: "Escalation", value: rg.escalation },
      { label: "Point of no return", value: rg.pointOfNoReturn },
      { label: "Within assumptions", value: rg.methodSummary },
    ]);
    if (apx.recoveryLoopNotes.length) {
      writeLines(layout, apx.recoveryLoopNotes, { fontSize: 8, color: PDF_COLORS.muted });
    }
    if (apx.feasibilityEscalationNote) {
      writeLines(layout, [apx.feasibilityEscalationNote], { color: PDF_COLORS.watch, fontSize: 8 });
    }
    layout.y += 4;
  }

  if (apx.recoveryAssumptionsLines.length) {
    layout.y = drawPdfSectionHeader(
      doc,
      layout.y,
      margin,
      contentWidth,
      "Recovery capability assumptions"
    );
    writeLines(layout, apx.recoveryAssumptionsLines);
    writeLines(
      layout,
      ["Configurable assumptions for this hole - not guaranteed tool performance."],
      { fontSize: 7.5, color: PDF_COLORS.muted }
    );
    layout.y += 3;
  } else if (apx.recoveryAssumptionsOneLiner) {
    writeLines(layout, [apx.recoveryAssumptionsOneLiner], { color: PDF_COLORS.muted });
    layout.y += 3;
  }

  if (apx.validationStatus && apx.validationDetail) {
    layout.y = drawPdfSectionHeader(doc, layout.y, margin, contentWidth, "Validation status");
    writeKeyValueBlock(layout, [
      { label: "Assumptions", value: apx.validationStatus },
      { label: "Detail", value: apx.validationDetail },
    ]);
    if (apx.conventions.length) {
      writeLines(layout, apx.conventions.map((c) => `- ${c}`), {
        fontSize: 7.5,
        color: PDF_COLORS.muted,
      });
    }
    layout.y += 3;
  }

  if (apx.surveyToolSummary.length) {
    layout.y = drawPdfSectionHeader(doc, layout.y, margin, contentWidth, "Survey tool profile");
    writeLines(layout, apx.surveyToolSummary);
    if (apx.surveyUncertaintyNote) {
      writeLines(layout, [apx.surveyUncertaintyNote], { color: PDF_COLORS.muted });
    }
    layout.y += 3;
  } else if (apx.surveyToolOneLiner) {
    writeLines(layout, [`Survey tool: ${apx.surveyToolOneLiner}`], { color: PDF_COLORS.muted });
    layout.y += 3;
  }

  if (apx.planCorridorSummary) {
    layout.y = drawPdfSectionHeader(doc, layout.y, margin, contentWidth, "Plan corridor");
    writeLines(layout, [apx.planCorridorSummary]);
    layout.y += 3;
  }

  if (apx.correctionOptions.length) {
    ensureSpace(layout, 14);
    layout.y = drawPdfSectionHeader(doc, layout.y, margin, contentWidth, "Correction options");
    autoTable(doc, {
      startY: layout.y,
      margin: { left: margin, right: margin },
      head: [["Interval", "Aim dip", "Aim azi", "Turn / DLS", "Status"]],
      body: apx.correctionOptions.map((o) => [
        o.label,
        `${round(o.aimDip, 1)} deg`,
        `${round(o.aimAzimuth, 1)} deg`,
        `${round(o.turn, 1)} deg / ${round(o.dls, 2)}`,
        o.status,
      ]),
      ...PDF_CORRECTION_TABLE_OPTS,
    });
    layout.y = doc.lastAutoTable.finalY + 8;
  }

  const qaBody =
    apx.includeTechnicalDetail && apx.qaFlagsAll.length
      ? apx.qaFlagsAll
      : apx.qaFlagsNonOk;
  if (qaBody.length) {
    ensureSpace(layout, 14);
    layout.y = drawPdfSectionHeader(doc, layout.y, margin, contentWidth, "Survey QA / QC");
    autoTable(doc, {
      startY: layout.y,
      margin: { left: margin, right: margin },
      head: [["Level", "Check", "Message"]],
      body: qaBody.map((f) => [f.level.toUpperCase(), f.label, f.message]),
      ...PDF_QA_TABLE_OPTS,
      didParseCell: (hook) => {
        if (hook.section === "body" && hook.column.index === 0 && hook.cell.raw) {
          const level = String(hook.cell.raw).toLowerCase();
          hook.cell.styles.textColor = qaLevelColor(level);
          hook.cell.styles.fontStyle = "bold";
        }
      },
    });
    layout.y = doc.lastAutoTable.finalY + 8;
  }

  if (apx.recentHistory.length) {
    ensureSpace(layout, 14);
    layout.y = drawPdfSectionHeader(doc, layout.y, margin, contentWidth, "Recent decision history");
    autoTable(doc, {
      startY: layout.y,
      margin: { left: margin, right: margin },
      head: [["Time", "Event", "Action"]],
      body: apx.recentHistory.map((e) => [e.time, e.summary, e.action ?? "-"]),
      ...PDF_QA_TABLE_OPTS,
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 50 },
        2: { cellWidth: "auto" as const },
      },
    });
    layout.y = doc.lastAutoTable.finalY + 6;
  }
}

function renderDisclaimer(layout: PdfLayout, disclaimer: string) {
  ensureSpace(layout, 24);
  layout.y = drawPdfDisclaimerPanel(
    layout.doc,
    layout.y,
    layout.margin,
    layout.contentWidth,
    disclaimer
  );
  drawPdfPageFooter(
    layout.doc,
    layout.pageNum,
    layout.holeName,
    layout.margin,
    layout.pageWidth,
    layout.pageHeight
  );
}

export async function buildHandoverPdfBlob(
  data: HandoverReportData,
  ctx: HandoverPdfLayoutContext
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "mm", format: "a4" }) as JsPdfWithTable;
  const vm = buildHandoverPdfViewModel(data, ctx);

  const layout: PdfLayout = {
    doc,
    margin: PDF_MARGIN,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    contentWidth: doc.internal.pageSize.getWidth() - PDF_MARGIN * 2,
    y: 0,
    pageNum: 1,
    holeName: data.holeName,
  };

  renderPage1(layout, data, vm);
  renderAppendix(layout, vm, autoTable);

  if (vm.appendix.hasAppendixContent) {
    renderDisclaimer(layout, vm.appendix.disclaimer);
  } else {
    ensureSpace(layout, 24);
    layout.y = drawPdfDisclaimerPanel(
      layout.doc,
      layout.y,
      layout.margin,
      layout.contentWidth,
      vm.appendix.disclaimer
    );
    drawPdfPageFooter(
      layout.doc,
      layout.pageNum,
      layout.holeName,
      layout.margin,
      layout.pageWidth,
      layout.pageHeight
    );
  }

  return doc.output("blob");
}

export async function downloadReportPdf(
  reco: Recommendation,
  actualStations: SurveyStation[],
  options?: HandoverReportOptions & { planStations?: SurveyStation[] }
) {
  const planStations = options?.planStations ?? [];
  let logoImagePng: string | null = options?.logoImagePng ?? null;
  let trajectoryImagePng: string | null = options?.trajectoryImagePng ?? null;

  if (logoImagePng === undefined || logoImagePng === null) {
    logoImagePng = await loadPdfLogoBase64();
  }
  if (trajectoryImagePng === undefined || trajectoryImagePng === null) {
    trajectoryImagePng = getTrajectorySnapshot(planStations, actualStations, reco);
  }

  const data = buildHandoverReportData(reco, actualStations, {
    ...options,
    logoImagePng,
    trajectoryImagePng,
  });

  const ctx: HandoverPdfLayoutContext = {
    reco,
    steering: options?.steering ?? null,
    corridorStatus: options?.corridorStatus ?? null,
    surveyAssessment: options?.surveyAssessment ?? null,
    surveyToolProfile: options?.surveyToolProfile ?? null,
    assumptionSignOff: options?.assumptionSignOff ?? null,
    recoveryAssumptions: options?.recoveryAssumptions ?? null,
  };

  const blob = await buildHandoverPdfBlob(data, ctx);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = handoverFilename(data.holeName, reco.current.md, "pdf");
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
