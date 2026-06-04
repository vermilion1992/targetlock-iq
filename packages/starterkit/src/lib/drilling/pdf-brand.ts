/** Shared branding and layout helpers for TargetLock IQ PDF exports. */

import type { jsPDF } from "jspdf";

export const PDF_APP_VERSION = "TargetLock IQ v2 RC1";
export const PDF_MARGIN = 16;
export const PDF_LINE_HEIGHT = 4.2;
/** Sharp institutional corners — minimal rounding. */
export const PDF_RADIUS = 0.6;
export const PDF_CARD_PAD = 5;

/** Matches TargetLock modal tokens (--tl-*). */
export const PDF_COLORS = {
  ink: [20, 32, 43] as [number, number, number],
  muted: [91, 107, 120] as [number, number, number],
  faint: [132, 147, 160] as [number, number, number],
  line: [227, 232, 238] as [number, number, number],
  lineStrong: [205, 214, 223] as [number, number, number],
  accent: [31, 111, 235] as [number, number, number],
  brand: [19, 124, 139] as [number, number, number],
  panel: [255, 255, 255] as [number, number, number],
  panelSoft: [247, 249, 251] as [number, number, number],
  panelTint: [251, 253, 255] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  ok: [18, 114, 58] as [number, number, number],
  watch: [184, 92, 0] as [number, number, number],
  risk: [180, 35, 24] as [number, number, number],
  shadow: [210, 218, 226] as [number, number, number],
} as const;

const LOGO_ASPECT = 2.75;
const LOGO_WIDTH_MM = 42;

export type PdfLegendItem = {
  label: string;
  color: [number, number, number];
};

export const HANDOVER_TRAJECTORY_LEGEND: PdfLegendItem[] = [
  { label: "Planned path", color: [29, 91, 184] },
  { label: "Actual path", color: [180, 83, 9] },
  { label: "Target", color: [196, 30, 18] },
];

export const BRANCH_TRAJECTORY_LEGEND: PdfLegendItem[] = [
  { label: "Planned path", color: [29, 91, 184] },
  { label: "Actual path (mother)", color: [148, 163, 184] },
  { label: "Daughter path", color: [124, 58, 237] },
  { label: "Sibling path", color: [203, 213, 225] },
  { label: "Target", color: [190, 24, 93] },
];

export type PdfMastheadOptions = {
  margin: number;
  pageWidth: number;
  reportType: string;
  holeName: string;
  siteName?: string | null;
  dateLabel: string;
  timeLabel: string;
  logoImagePng?: string | null;
  extraLine?: string | null;
};

export type PdfStatusBandOptions = {
  margin: number;
  pageWidth: number;
  contentWidth: number;
  status: string;
  confidence: string;
  currentMd: string;
  statusClassName: string;
};

export type PdfMetricPair = { label: string; value: string; note?: string };
export type PdfKeyValue = { label: string; value: string; muted?: boolean };

export type PdfCardFrameOpts = {
  margin: number;
  contentWidth: number;
  title: string;
  accent?: [number, number, number];
};

const LOGO_PATH_BROWSER = "/brand/targetlock-iq-logo.png";
const MIN_IMAGE_DATA_URL_LENGTH = 200;
const CARD_HEADER_H = 8;

function statusRgb(className: string): [number, number, number] {
  if (className === "on-track") return PDF_COLORS.ok;
  if (className === "watch") return PDF_COLORS.watch;
  if (className === "risk") return PDF_COLORS.risk;
  return PDF_COLORS.accent;
}

function drawPanel(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  opts?: { shadow?: boolean; fill?: [number, number, number] }
): void {
  const r = PDF_RADIUS;
  if (opts?.shadow !== false) {
    doc.setFillColor(...PDF_COLORS.shadow);
    doc.roundedRect(x + 0.5, y + 0.7, w, h, r, r, "F");
  }
  doc.setFillColor(...(opts?.fill ?? PDF_COLORS.white));
  doc.setDrawColor(...PDF_COLORS.lineStrong);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, r, r, "FD");
}

function drawTopAccentBar(doc: jsPDF, x: number, y: number, w: number): void {
  doc.setFillColor(...PDF_COLORS.accent);
  doc.rect(x, y, w * 0.55, 1.2, "F");
  doc.setFillColor(...PDF_COLORS.brand);
  doc.rect(x + w * 0.55, y, w * 0.45, 1.2, "F");
}

export function isValidImageDataUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== "string") return false;
  if (!url.startsWith("data:image/")) return false;
  if (url.length < MIN_IMAGE_DATA_URL_LENGTH) return false;
  return true;
}

export async function loadPdfLogoBase64(): Promise<string | null> {
  if (typeof window === "undefined") {
    try {
      const { readFileSync, existsSync } = await import("node:fs");
      const { join, dirname } = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const here = dirname(fileURLToPath(import.meta.url));
      const candidate = join(here, "..", "..", "..", "public", "brand", "targetlock-iq-logo.png");
      if (existsSync(candidate)) {
        const buf = readFileSync(candidate);
        return `data:image/png;base64,${buf.toString("base64")}`;
      }
    } catch {
      return null;
    }
    return null;
  }
  if (typeof fetch === "undefined") return null;
  try {
    const res = await fetch(LOGO_PATH_BROWSER);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function addPdfImageSafe(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  w: number,
  h: number,
  format?: "PNG" | "JPEG"
): boolean {
  if (!isValidImageDataUrl(dataUrl)) return false;
  try {
    const fmt =
      format ??
      (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")
        ? "JPEG"
        : "PNG");
    doc.addImage(dataUrl, fmt, x, y, w, h);
    return true;
  } catch {
    return false;
  }
}

export function drawPdfPageBackground(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number
): void {
  doc.setFillColor(...PDF_COLORS.panelSoft);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  doc.setFillColor(...PDF_COLORS.panelTint);
  doc.rect(0, 0, pageWidth, pageHeight * 0.28, "F");
}

export function drawPdfAccentRail(
  doc: jsPDF,
  pageWidth: number,
  y: number,
  height = 1.4
): void {
  const third = pageWidth / 3;
  doc.setFillColor(...PDF_COLORS.accent);
  doc.rect(0, y, third, height, "F");
  doc.setFillColor(...PDF_COLORS.brand);
  doc.rect(third, y, third, height, "F");
  doc.setFillColor(160, 200, 208);
  doc.rect(third * 2, y, third, height, "F");
}

export function drawPdfEyebrow(doc: jsPDF, x: number, y: number, text: string): number {
  doc.setFillColor(...PDF_COLORS.brand);
  doc.rect(x, y - 2.5, 8, 0.8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PDF_COLORS.faint);
  doc.text(text.toUpperCase(), x + 10, y);
  return y + 5;
}

export function drawPdfMasthead(doc: jsPDF, opts: PdfMastheadOptions): number {
  const { margin, pageWidth, reportType, holeName, siteName, dateLabel, timeLabel } = opts;
  const mastheadH = 30;
  const contentWidth = pageWidth - margin * 2;
  const logoW = LOGO_WIDTH_MM;
  const logoH = logoW / LOGO_ASPECT;

  drawPdfAccentRail(doc, pageWidth, 0, 1.6);
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 1.6, pageWidth, mastheadH, "F");
  doc.setDrawColor(...PDF_COLORS.lineStrong);
  doc.setLineWidth(0.3);
  doc.line(margin, mastheadH + 1.6, margin + contentWidth, mastheadH + 1.6);

  let hasLogo = false;
  if (isValidImageDataUrl(opts.logoImagePng)) {
    const logoY = (mastheadH - logoH) / 2 + 2.5;
    hasLogo = addPdfImageSafe(doc, opts.logoImagePng, margin, logoY, logoW, logoH);
  }
  if (!hasLogo) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...PDF_COLORS.ink);
    doc.text("TargetLock IQ", margin, mastheadH / 2 + 4);
  }

  const metaX = pageWidth - margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text(reportType, metaX, 11, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(holeName, metaX, 16.5, { align: "right" });
  let metaY = 21;
  if (siteName?.trim()) {
    doc.text(siteName.trim(), metaX, metaY, { align: "right" });
    metaY += 4.5;
  }
  doc.setFontSize(8);
  doc.text(`${dateLabel}  ·  ${timeLabel}`, metaX, metaY, { align: "right" });
  metaY += 4.5;
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.faint);
  doc.text(PDF_APP_VERSION, metaX, metaY, { align: "right" });
  if (opts.extraLine?.trim()) {
    metaY += 4;
    doc.text(opts.extraLine.trim(), metaX, metaY, { align: "right" });
  }

  return mastheadH + 8;
}

export function drawPdfStatusBand(doc: jsPDF, y: number, opts: PdfStatusBandOptions): number {
  const { margin, contentWidth, status, confidence, currentMd, statusClassName, pageWidth } =
    opts;
  const bandH = 15;
  const color = statusRgb(statusClassName);

  drawPanel(doc, margin, y, contentWidth, bandH, { shadow: true, fill: color });
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, 2.5, bandH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text(status, margin + 6, y + 6.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Confidence  ${confidence}`, margin + 6, y + 11.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(currentMd, pageWidth - margin - 5, y + 9, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Latest survey", pageWidth - margin - 5, y + 12.5, { align: "right" });
  return y + bandH + 8;
}

/** Measure hero metric height from value text. */
export function measureHeroMetricHeight(
  doc: jsPDF,
  w: number,
  value: string,
  note?: string
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const lines = doc.splitTextToSize(value, w - PDF_CARD_PAD * 2).slice(0, 2);
  return 8 + lines.length * 5.2 + (note ? 4 : 2) + PDF_CARD_PAD;
}

/** Featured hero metric — auto-height, content always inside card. */
export function drawPdfHeroMetric(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  label: string,
  value: string,
  note?: string
): number {
  const h = measureHeroMetricHeight(doc, w, value, note);
  drawPanel(doc, x, y, w, h);
  drawTopAccentBar(doc, x, y, w);

  const pad = PDF_CARD_PAD;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PDF_COLORS.faint);
  doc.text(label.toUpperCase(), x + pad, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...PDF_COLORS.ink);
  const valueLines = doc.splitTextToSize(value, w - pad * 2).slice(0, 2);
  doc.text(valueLines, x + pad, y + 13);
  if (note) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(note, x + pad, y + h - 2.5);
  }
  return y + h + 6;
}

/** Two auto-height metric tiles in a row. */
export function drawPdfMetricPairRow(
  doc: jsPDF,
  y: number,
  margin: number,
  contentWidth: number,
  left: PdfMetricPair,
  right: PdfMetricPair
): number {
  const gap = 5;
  const colW = (contentWidth - gap) / 2;
  const hLeft = measureHeroMetricHeight(doc, colW, left.value, left.note);
  const hRight = measureHeroMetricHeight(doc, colW, right.value, right.note);
  const h = Math.max(hLeft, hRight);

  drawPanel(doc, margin, y, colW, h);
  drawTopAccentBar(doc, margin, y, colW);
  drawPanel(doc, margin + colW + gap, y, colW, h);
  drawTopAccentBar(doc, margin + colW + gap, y, colW);

  const drawTile = (tx: number, pair: PdfMetricPair) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_COLORS.faint);
    doc.text(pair.label.toUpperCase(), tx + PDF_CARD_PAD, y + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...PDF_COLORS.ink);
    doc.text(doc.splitTextToSize(pair.value, colW - PDF_CARD_PAD * 2).slice(0, 2), tx + PDF_CARD_PAD, y + 13);
  };
  drawTile(margin, left);
  drawTile(margin + colW + gap, right);
  return y + h + 6;
}

/** Measure lead line block height. */
export function measureLeadLineHeight(doc: jsPDF, maxWidth: number, text: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  const lines = doc.splitTextToSize(text, maxWidth);
  return lines.length * PDF_LINE_HEIGHT + 2;
}

export function measureKeyValueRowsHeight(
  doc: jsPDF,
  maxWidth: number,
  rows: PdfKeyValue[]
): number {
  const labelW = maxWidth * 0.38;
  let h = 0;
  for (const row of rows) {
    doc.setFont("helvetica", row.muted ? "normal" : "bold");
    doc.setFontSize(8.5);
    const valueLines = doc.splitTextToSize(row.value, maxWidth - labelW - 2);
    h += Math.max(PDF_LINE_HEIGHT, valueLines.length * PDF_LINE_HEIGHT) + 1.5;
  }
  return h;
}

export function measureInlineMetricPairHeight(): number {
  return 13;
}

/** Measure full modal card body before drawing frame. */
export function measureModalCardBody(
  doc: jsPDF,
  innerW: number,
  parts: {
    leadLine?: string;
    inlineMetrics?: [PdfMetricPair, PdfMetricPair];
    keyValues?: PdfKeyValue[];
  }
): number {
  let h = PDF_CARD_PAD;
  if (parts.leadLine) h += measureLeadLineHeight(doc, innerW, parts.leadLine);
  if (parts.inlineMetrics) {
    h += 3 + measureInlineMetricPairHeight();
  }
  if (parts.keyValues?.length) {
    h += 2 + measureKeyValueRowsHeight(doc, innerW, parts.keyValues);
  }
  return h + PDF_CARD_PAD;
}

/** Draw card frame after body height is known — returns content start Y. */
export function drawPdfModalCardFrame(
  doc: jsPDF,
  topY: number,
  bodyHeight: number,
  opts: PdfCardFrameOpts
): number {
  const { margin, contentWidth, title } = opts;
  const accent = opts.accent ?? PDF_COLORS.brand;
  const cardH = CARD_HEADER_H + bodyHeight;

  drawPanel(doc, margin, topY, contentWidth, cardH);
  drawTopAccentBar(doc, margin, topY, contentWidth);

  doc.setFillColor(...PDF_COLORS.panelSoft);
  doc.rect(margin + 0.5, topY + 1.2, contentWidth - 1, CARD_HEADER_H - 0.5, "F");
  doc.setFillColor(...accent);
  doc.rect(margin, topY + 1.2, 2, CARD_HEADER_H - 0.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text(title, margin + PDF_CARD_PAD + 1, topY + 5.5);

  doc.setDrawColor(...PDF_COLORS.line);
  doc.setLineWidth(0.2);
  doc.line(margin, topY + CARD_HEADER_H + 1.2, margin + contentWidth, topY + CARD_HEADER_H + 1.2);

  return topY + CARD_HEADER_H + PDF_CARD_PAD + 1;
}

/** @deprecated — use drawPdfModalCardFrame + measureModalCardBody */
export type PdfModalCardOptions = PdfCardFrameOpts & { bodyHeight: number };
export function drawPdfModalCard(doc: jsPDF, y: number, opts: PdfModalCardOptions): number {
  return drawPdfModalCardFrame(doc, y, opts.bodyHeight, opts);
}
export function drawPdfSectionCard(doc: jsPDF, y: number, opts: PdfModalCardOptions): number {
  return drawPdfModalCard(doc, y, opts);
}

export function drawPdfLeadLine(
  doc: jsPDF,
  x: number,
  y: number,
  maxWidth: number,
  text: string
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_COLORS.ink);
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * PDF_LINE_HEIGHT + 2;
}

/** Inline dip/azi chips — lives inside a parent card, no nested shadow cards. */
export function drawPdfInlineMetricPair(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  left: PdfMetricPair,
  right: PdfMetricPair
): number {
  const gap = 4;
  const colW = (w - gap) / 2;
  const h = 13;

  doc.setFillColor(...PDF_COLORS.panelSoft);
  doc.setDrawColor(...PDF_COLORS.line);
  doc.roundedRect(x, y, colW, h, PDF_RADIUS, PDF_RADIUS, "FD");
  doc.roundedRect(x + colW + gap, y, colW, h, PDF_RADIUS, PDF_RADIUS, "FD");

  const drawChip = (cx: number, pair: PdfMetricPair) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...PDF_COLORS.faint);
    doc.text(pair.label.toUpperCase(), cx + 3, y + 4.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.ink);
    doc.text(doc.splitTextToSize(pair.value, colW - 6).slice(0, 1), cx + 3, y + 10);
  };
  drawChip(x, left);
  drawChip(x + colW + gap, right);
  return y + h + 3;
}

export function drawPdfKeyValueRows(
  doc: jsPDF,
  x: number,
  y: number,
  maxWidth: number,
  rows: PdfKeyValue[]
): number {
  const labelW = maxWidth * 0.38;
  for (const row of rows) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(row.label, x, y);
    doc.setFont("helvetica", row.muted ? "normal" : "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...(row.muted ? PDF_COLORS.muted : PDF_COLORS.ink));
    const valueLines = doc.splitTextToSize(row.value, maxWidth - labelW - 2);
    doc.text(valueLines, x + labelW, y);
    y += Math.max(PDF_LINE_HEIGHT, valueLines.length * PDF_LINE_HEIGHT) + 1.5;
  }
  return y;
}

export function drawPdfNoticeStrip(
  doc: jsPDF,
  y: number,
  margin: number,
  contentWidth: number,
  text: string,
  title = "Recovery guidance"
): number {
  const innerW = contentWidth - PDF_CARD_PAD * 2 - 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const bodyLines = doc.splitTextToSize(text, innerW);
  const h = bodyLines.length * PDF_LINE_HEIGHT + (title ? 13 : 7) + PDF_CARD_PAD;

  drawPanel(doc, margin, y, contentWidth, h);
  doc.setFillColor(...PDF_COLORS.accent);
  doc.rect(margin, y, 2.5, h, "F");

  let textY = y + PDF_CARD_PAD + 1;
  if (title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.accent);
    doc.text(title.toUpperCase(), margin + PDF_CARD_PAD + 2, textY);
    textY += 5;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text(bodyLines, margin + PDF_CARD_PAD + 2, textY);
  return y + h + 6;
}

export function drawPdfSectionHeader(
  doc: jsPDF,
  y: number,
  margin: number,
  contentWidth: number,
  title: string
): number {
  const stripH = 7;
  drawPanel(doc, margin, y - 3, contentWidth, stripH, { shadow: false });
  doc.setFillColor(...PDF_COLORS.brand);
  doc.rect(margin, y - 3, 2, stripH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text(title, margin + 6, y + 1.5);
  return y + stripH + 2;
}

export type PdfTrajectoryBlockOptions = {
  margin: number;
  contentWidth: number;
  imageDataUrl?: string | null;
  legend: PdfLegendItem[];
  imageHeightMm?: number;
};

export function drawPdfTrajectoryBlock(
  doc: jsPDF,
  y: number,
  opts: PdfTrajectoryBlockOptions
): number {
  const { margin, contentWidth, imageDataUrl, legend } = opts;
  const imageH = opts.imageHeightMm ?? 56;
  const framePad = PDF_CARD_PAD;
  const headerH = 9;
  const legendH = 7;
  const frameH = headerH + imageH + framePad * 2 + legendH;

  drawPanel(doc, margin, y, contentWidth, frameH);
  drawTopAccentBar(doc, margin, y, contentWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PDF_COLORS.faint);
  doc.text("VISUAL CONTEXT", margin + framePad, y + framePad + 1);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text("Trajectory overview", margin + framePad, y + framePad + 5.5);

  const imgX = margin + framePad;
  const imgW = contentWidth - framePad * 2;
  let imgY = y + headerH + framePad;
  doc.setFillColor(...PDF_COLORS.panelSoft);
  doc.setDrawColor(...PDF_COLORS.line);
  doc.roundedRect(imgX, imgY, imgW, imageH, PDF_RADIUS, PDF_RADIUS, "FD");

  if (isValidImageDataUrl(imageDataUrl)) {
    addPdfImageSafe(doc, imageDataUrl, imgX + 0.5, imgY + 0.5, imgW - 1, imageH - 1);
  }
  imgY += imageH + 3;

  let legendX = margin + framePad;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  for (const item of legend) {
    doc.setFillColor(...item.color);
    doc.rect(legendX, imgY - 2.2, 3, 3, "F");
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(item.label, legendX + 5, imgY);
    legendX += doc.getTextWidth(item.label) + 12;
  }
  return y + frameH + 4;
}

export function drawPdfPageFooter(
  doc: jsPDF,
  pageNum: number,
  holeName: string,
  margin: number,
  pageWidth: number,
  pageHeight: number
): void {
  doc.setDrawColor(...PDF_COLORS.lineStrong);
  doc.setLineWidth(0.25);
  doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.faint);
  doc.text(holeName, margin, pageHeight - 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PDF_COLORS.brand);
  doc.text("TARGETLOCK IQ", pageWidth / 2, pageHeight - 9, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.faint);
  doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 9, { align: "right" });
  doc.setFontSize(6);
  doc.text("Operational advisory · Not a substitute for field judgment", pageWidth / 2, pageHeight - 5.5, {
    align: "center",
  });
}

export function qaLevelColor(level: string): [number, number, number] {
  if (level === "ok") return PDF_COLORS.ok;
  if (level === "watch") return PDF_COLORS.watch;
  return PDF_COLORS.risk;
}

export function drawPdfAppendixHeader(
  doc: jsPDF,
  y: number,
  margin: number,
  contentWidth: number,
  holeName: string
): number {
  const h = 15;
  drawPanel(doc, margin, y, contentWidth, h);
  drawTopAccentBar(doc, margin, y, contentWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...PDF_COLORS.faint);
  doc.text("APPENDIX", margin + PDF_CARD_PAD, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text("Technical detail", margin + PDF_CARD_PAD, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(holeName, margin + contentWidth - PDF_CARD_PAD, y + 10, { align: "right" });
  return y + h + 6;
}

export function drawPdfDisclaimerPanel(
  doc: jsPDF,
  y: number,
  margin: number,
  contentWidth: number,
  disclaimer: string
): number {
  const lines = doc.splitTextToSize(disclaimer, contentWidth - PDF_CARD_PAD * 2);
  const h = lines.length * 3.2 + PDF_CARD_PAD * 2;
  drawPanel(doc, margin, y, contentWidth, h, { shadow: false, fill: PDF_COLORS.panelSoft });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(lines, margin + PDF_CARD_PAD, y + PDF_CARD_PAD + 2);
  return y + h + 4;
}

export function drawPdfKeyMetricsRow(
  doc: jsPDF,
  y: number,
  margin: number,
  contentWidth: number,
  pairs: [PdfMetricPair, PdfMetricPair, PdfMetricPair, PdfMetricPair]
): number {
  y = drawPdfMetricPairRow(doc, y, margin, contentWidth, pairs[0], pairs[1]);
  y = drawPdfMetricPairRow(doc, y, margin, contentWidth, pairs[2], pairs[3]);
  return y;
}

const TABLE_BASE = {
  theme: "plain" as const,
  styles: {
    lineColor: PDF_COLORS.lineStrong,
    lineWidth: 0.15,
    overflow: "linebreak" as const,
  },
};

export const PDF_QA_TABLE_OPTS = {
  ...TABLE_BASE,
  headStyles: {
    fillColor: PDF_COLORS.ink,
    textColor: PDF_COLORS.white,
    fontSize: 8,
    fontStyle: "bold" as const,
    cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
  },
  bodyStyles: {
    fontSize: 8,
    textColor: PDF_COLORS.ink,
    cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
  },
  alternateRowStyles: { fillColor: PDF_COLORS.panelSoft },
  columnStyles: {
    0: { cellWidth: 14 },
    1: { cellWidth: 28 },
    2: { cellWidth: "auto" as const },
  },
};

export const PDF_CORRECTION_TABLE_OPTS = {
  ...TABLE_BASE,
  headStyles: {
    fillColor: PDF_COLORS.ink,
    textColor: PDF_COLORS.white,
    fontSize: 8,
    fontStyle: "bold" as const,
    cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
  },
  bodyStyles: {
    fontSize: 8,
    textColor: PDF_COLORS.ink,
    cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
  },
  alternateRowStyles: { fillColor: PDF_COLORS.panelSoft },
  columnStyles: {
    0: { cellWidth: 22 },
    1: { cellWidth: 18 },
    2: { cellWidth: 22 },
    3: { cellWidth: 28 },
    4: { cellWidth: "auto" as const },
  },
};
