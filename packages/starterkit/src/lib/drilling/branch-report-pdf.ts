import type { BranchReportData } from "./branch-report-data";

const COLORS = {
  ink: [23, 32, 42] as [number, number, number],
  muted: [93, 106, 117] as [number, number, number],
  line: [216, 222, 229] as [number, number, number],
  header: [17, 24, 32] as [number, number, number],
  accent: [124, 58, 237] as [number, number, number],
  panel: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  warn: [180, 35, 24] as [number, number, number],
};

export async function buildBranchReportPdfBlob(data: BranchReportData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
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

  doc.setFillColor(...COLORS.header);
  doc.rect(0, 0, pageWidth, 36, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.white);
  doc.text("TargetLock IQ — Branch planning report", margin, 14);
  doc.setFontSize(9);
  doc.text(data.title, margin, 22);
  if (data.daughterContext) {
    doc.setFont("helvetica", "normal");
    doc.text(data.daughterContext, margin, 30);
  }

  y = 44;
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  doc.text(
    `Generated ${data.generatedAt.toLocaleString()}`,
    margin,
    y
  );
  y += 10;

  for (const section of data.sections) {
    ensureSpace(14);
    doc.setFillColor(...COLORS.panel);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.ink);
    doc.text(section.title.toUpperCase(), margin + 3, y + 5);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.ink);
    for (const line of section.lines) {
      ensureSpace(6);
      const isWarn = line.startsWith("WARNING");
      if (isWarn) doc.setTextColor(...COLORS.warn);
      const wrapped = doc.splitTextToSize(line, contentWidth);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 4.2 + 1;
      if (isWarn) doc.setTextColor(...COLORS.ink);
    }
    y += 4;
  }

  ensureSpace(20);
  doc.setDrawColor(...COLORS.line);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  const disclaimer = doc.splitTextToSize(data.disclaimer, contentWidth);
  doc.text(disclaimer, margin, y);

  return doc.output("blob");
}

export async function downloadBranchReportPdf(data: BranchReportData): Promise<void> {
  const blob = await buildBranchReportPdfBlob(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = data.filename;
  a.click();
  URL.revokeObjectURL(url);
}
