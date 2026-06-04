import {
  buildHandoverReportData,
  handoverFilename,
  type HandoverReportData,
  type HandoverReportOptions,
} from "./report-data";
import { round } from "./format";
import type { Recommendation, SurveyStation } from "./types";

const COLORS = {
  ink: [23, 32, 42] as [number, number, number],
  muted: [93, 106, 117] as [number, number, number],
  line: [216, 222, 229] as [number, number, number],
  header: [17, 24, 32] as [number, number, number],
  accent: [31, 111, 235] as [number, number, number],
  cyan: [27, 135, 151] as [number, number, number],
  panel: [248, 250, 252] as [number, number, number],
  ok: [18, 114, 58] as [number, number, number],
  watch: [184, 92, 0] as [number, number, number],
  risk: [180, 35, 24] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

type JsPdfWithTable = import("jspdf").jsPDF & {
  lastAutoTable: { finalY: number };
};

function statusRgb(className: string): [number, number, number] {
  if (className === "on-track") return COLORS.ok;
  if (className === "watch") return COLORS.watch;
  if (className === "risk") return COLORS.risk;
  return COLORS.accent;
}

function qaLevelColor(level: string): [number, number, number] {
  if (level === "ok") return COLORS.ok;
  if (level === "watch") return COLORS.watch;
  return COLORS.risk;
}

export async function buildHandoverPdfBlob(data: HandoverReportData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "mm", format: "a4" }) as JsPdfWithTable;
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = 18;
    }
  };

  const sectionTitle = (title: string) => {
    ensureSpace(12);
    doc.setFillColor(...COLORS.panel);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.ink);
    doc.text(title.toUpperCase(), margin + 3, y + 5);
    y += 10;
  };

  doc.setFillColor(...COLORS.header);
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setFillColor(...COLORS.cyan);
  doc.rect(margin, 8, 10, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.white);
  doc.text("TL", margin + 2.2, 15.2);
  doc.setFontSize(16);
  doc.text("TargetLock IQ", margin + 14, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Shift handover report", margin + 14, 19);
  doc.text(`${data.dateLabel}  ${data.timeLabel}`, pageWidth - margin, 13, {
    align: "right",
  });
  doc.text(data.holeName, pageWidth - margin, 19, { align: "right" });
  if (data.siteName) {
    doc.setFontSize(8);
    doc.text(data.siteName, pageWidth - margin, 24, { align: "right" });
    doc.setFontSize(9);
  }
  if (data.testScenarioName) {
    doc.setFontSize(7.5);
    doc.text(data.testScenarioName, pageWidth - margin, data.siteName ? 28 : 24, {
      align: "right",
    });
    doc.setFontSize(9);
  }

  y = 40;
  const statusColor = statusRgb(data.statusClassName);
  doc.setFillColor(...statusColor);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.white);
  doc.text(`Status: ${data.status}`, margin + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Confidence: ${data.confidence}`, margin + 4, y + 11);
  doc.text(`Latest survey: ${data.currentMd}`, pageWidth - margin - 4, y + 8.5, {
    align: "right",
  });
  y += 20;

  sectionTitle("Key metrics");
  const colW = contentWidth / 2 - 4;
  const kv = (label: string, value: string, x: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(label, x, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.ink);
    doc.text(doc.splitTextToSize(value, colW), x, y + 4.5);
  };
  kv("Actual dip / azimuth", data.actualDipAzi, margin);
  kv("Offset from plan", data.planOffset, margin + colW + 8);
  y += 14;
  kv("Projected miss", data.projectedMiss, margin);
  kv("Miss vector", data.missVector, margin + colW + 8);
  y += 16;

  sectionTitle("Next interval aim");
  ensureSpace(40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  const aimNoteLines = doc.splitTextToSize(
    `${data.nextIntervalAimNote} ${data.nextIntervalAimExplainer}`,
    contentWidth
  );
  aimNoteLines.forEach((line: string) => {
    doc.text(line, margin, y);
    y += 4.2;
  });
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.ink);
  doc.text(`Dip ${data.aimDip}  ·  ${data.dipCorrection}`, margin, y);
  y += 5;
  doc.text(`Azimuth ${data.aimAzimuth}  ·  ${data.aziCorrection}`, margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`DLS required: ${data.dlsRequired}   |   Limit: ${data.dlsLimit}`, margin, y);
  y += 7;
  doc.setFillColor(...COLORS.panel);
  const guidanceLines = doc.splitTextToSize(data.drillerGuidance, contentWidth - 6);
  const boxH = guidanceLines.length * 4.2 + 6;
  ensureSpace(boxH + 4);
  doc.rect(margin, y, contentWidth, boxH, "F");
  doc.setTextColor(...COLORS.ink);
  doc.text(guidanceLines, margin + 3, y + 5);
  y += boxH + 8;

  if (data.recoveryGuidance) {
    sectionTitle("Recovery guidance");
    const rg = data.recoveryGuidance;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.ink);
    const recoveryLines = [
      `Current action: ${rg.currentAction}`,
      `Best method: ${rg.bestMethod}`,
      `Next aim: ${rg.nextAim}`,
      `Confidence: ${rg.confidence}`,
      `Escalation: ${rg.escalation}`,
      `Point of no return: ${rg.pointOfNoReturn}`,
      `Within assumptions: ${rg.methodSummary}`,
      ...data.recoveryLoopNotes,
      ...(data.feasibilityEscalationNote ? [data.feasibilityEscalationNote] : []),
    ];
    recoveryLines.forEach((line) => {
      ensureSpace(5);
      doc.text(line, margin, y);
      y += 4.5;
    });
    y += 4;
  }

  if (data.recoveryAssumptionsSummary.length) {
    sectionTitle("Recovery capability assumptions");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.ink);
    data.recoveryAssumptionsSummary.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, contentWidth);
      ensureSpace(wrapped.length * 4 + 2);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 4;
    });
    ensureSpace(8);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    const note = doc.splitTextToSize(
      "Configurable assumptions for this hole — not guaranteed tool performance.",
      contentWidth
    );
    doc.text(note, margin, y);
    y += note.length * 3.5 + 6;
  }

  sectionTitle("Validation status");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.ink);
  ensureSpace(6);
  doc.text(`Assumptions: ${data.validationStatus}`, margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const valDetail = doc.splitTextToSize(data.validationDetail, contentWidth);
  ensureSpace(valDetail.length * 4 + 2);
  doc.text(valDetail, margin, y);
  y += valDetail.length * 4 + 2;
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  data.conventions.forEach((line) => {
    const wrapped = doc.splitTextToSize(`• ${line}`, contentWidth);
    ensureSpace(wrapped.length * 3.6 + 1);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 3.6;
  });
  y += 6;

  sectionTitle("Target");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.ink);
  doc.text(
    `MD ${data.targetMd}   |   ${data.targetEnu}   |   Tolerance ${data.tolerance}   |   Next interval ${data.nextInterval}`,
    margin,
    y
  );
  y += 10;

  if (data.correctionOptions.length) {
    sectionTitle("Correction options");
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Interval", "Aim dip", "Aim azi", "Turn / DLS", "Status"]],
      body: data.correctionOptions.map((o) => [
        o.label,
        `${round(o.aimDip, 1)}°`,
        `${round(o.aimAzimuth, 1)}°`,
        `${round(o.turn, 1)}° / ${round(o.dls, 2)}`,
        o.status,
      ]),
      theme: "grid",
      headStyles: {
        fillColor: COLORS.header,
        textColor: COLORS.white,
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8, textColor: COLORS.ink },
      alternateRowStyles: { fillColor: COLORS.panel },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  sectionTitle("Survey QA / QC");
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Level", "Check", "Message"]],
    body: data.qaFlags.map((f) => [f.level.toUpperCase(), f.label, f.message]),
    theme: "grid",
    headStyles: {
      fillColor: COLORS.header,
      textColor: COLORS.white,
      fontSize: 8,
    },
    bodyStyles: { fontSize: 7.5, textColor: COLORS.ink },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.column.index === 0 && hook.cell.raw) {
        const level = String(hook.cell.raw).toLowerCase();
        hook.cell.styles.textColor = qaLevelColor(level);
        hook.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = doc.lastAutoTable.finalY + 6;

  if (data.recentHistory.length) {
    sectionTitle("Recent decision history");
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Time", "Event", "Action"]],
      body: data.recentHistory.map((e) => [e.time, e.summary, e.action ?? "—"]),
      theme: "striped",
      headStyles: {
        fillColor: COLORS.header,
        textColor: COLORS.white,
        fontSize: 8,
      },
      bodyStyles: { fontSize: 7.5 },
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  ensureSpace(22);
  doc.setDrawColor(...COLORS.line);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.text(doc.splitTextToSize(data.disclaimer, contentWidth), margin, y);

  return doc.output("blob");
}

export async function downloadReportPdf(
  reco: Recommendation,
  actualStations: SurveyStation[],
  options?: HandoverReportOptions
) {
  const data = buildHandoverReportData(reco, actualStations, options);
  const blob = await buildHandoverPdfBlob(data);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = handoverFilename(data.holeName, reco.current.md, "pdf");
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
