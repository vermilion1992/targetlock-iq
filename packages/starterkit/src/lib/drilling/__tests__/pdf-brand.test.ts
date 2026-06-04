import { describe, expect, it } from "vitest";
import {
  addPdfImageSafe,
  drawPdfMasthead,
  isValidImageDataUrl,
  loadPdfLogoBase64,
} from "../pdf-brand";
import { loadFixtureImageBase64 } from "./pdf-fixtures";

describe("pdf-brand", () => {
  it("validates image data URLs", () => {
    expect(isValidImageDataUrl(null)).toBe(false);
    expect(isValidImageDataUrl("")).toBe(false);
    expect(isValidImageDataUrl("data:text/plain,abc")).toBe(false);
    expect(isValidImageDataUrl("data:image/png;base64,abc")).toBe(false);
    expect(isValidImageDataUrl(loadFixtureImageBase64("trajectory-sample.png"))).toBe(true);
  });

  it("loads logo from public brand path in Node", async () => {
    const logo = await loadPdfLogoBase64();
    expect(logo).toBeTruthy();
    expect(isValidImageDataUrl(logo)).toBe(true);
  });

  it("draws masthead with text fallback when logo missing", async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const y = drawPdfMasthead(doc, {
      margin: 14,
      pageWidth,
      reportType: "Shift Handover",
      holeName: "DDH-0247",
      siteName: "North Camp",
      dateLabel: "Mon, 1 Jan 2026",
      timeLabel: "12:00",
      logoImagePng: null,
    });
    expect(y).toBeGreaterThan(20);
    const text = doc.output("arraybuffer");
    expect(new TextDecoder().decode(new Uint8Array(text))).toContain("Shift Handover");
  });

  it("addPdfImageSafe does not throw on invalid input", async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    expect(addPdfImageSafe(doc, "not-an-image", 0, 0, 10, 10)).toBe(false);
    expect(addPdfImageSafe(doc, "data:image/png;base64,xx", 0, 0, 10, 10)).toBe(false);
  });
});
