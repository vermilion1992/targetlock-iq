import { describe, expect, it } from "vitest";
import { buildHandoverReportData } from "../report-data";
import { buildHandoverPdfBlob } from "../report-pdf";
import { loadPdfLogoBase64 } from "../pdf-brand";
import { computeHole } from "../compute";
import { loadFixtureImageBase64 } from "./pdf-fixtures";
import { sampleActualStations, samplePlanStations, sampleTarget } from "./fixtures";

function pdfCtxFromSample() {
  const { recommendation: reco, steering } = computeHole(
    samplePlanStations.map((s) => ({ md: s.md, dip: s.dip, azimuth: s.azimuth })),
    sampleActualStations.map((s) => ({ md: s.md, dip: s.dip, azimuth: s.azimuth })),
    sampleTarget()
  );
  if (!reco) throw new Error("expected recommendation");
  return {
    reco,
    steering,
    ctx: { reco, steering },
  };
}

describe("buildHandoverPdfBlob", () => {
  it("generates PDF without logo or trajectory options", async () => {
    const { reco, steering, ctx } = pdfCtxFromSample();
    const data = buildHandoverReportData(reco, sampleActualStations, { steering });
    const blob = await buildHandoverPdfBlob(data, ctx);
    const buffer = Buffer.from(await blob.arrayBuffer());
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(500);
  });

  it("generates PDF with logo and trajectory fixture without throwing", async () => {
    const { reco, steering, ctx } = pdfCtxFromSample();
    const data = buildHandoverReportData(reco, sampleActualStations, {
      steering,
      logoImagePng: await loadPdfLogoBase64(),
      trajectoryImagePng: loadFixtureImageBase64("trajectory-sample.png"),
    });
    const blob = await buildHandoverPdfBlob(data, ctx);
    const buffer = Buffer.from(await blob.arrayBuffer());
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.includes(Buffer.from("/Image"))).toBe(true);
  });

  it("PDF buffer does not contain internal keys or corrupt glyphs", async () => {
    const { reco, steering, ctx } = pdfCtxFromSample();
    const data = buildHandoverReportData(reco, sampleActualStations, { steering });
    const blob = await buildHandoverPdfBlob(data, ctx);
    const text = Buffer.from(await blob.arrayBuffer()).toString("latin1");
    expect(text).not.toContain("Correct now");
    expect(text).not.toContain("\u2022");
    expect(text).not.toMatch(/\bD i p\b/);
  });
});
