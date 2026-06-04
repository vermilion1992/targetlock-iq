import { describe, expect, it } from "vitest";
import { buildBranchReportData } from "../branch-report-data";
import { buildBranchReportPdfBlob } from "../branch-report-pdf";
import { loadPdfLogoBase64 } from "../pdf-brand";
import { BRANCH_PROGRAM_P2_SCENARIOS } from "../branch-program-scenarios";
import { DEFAULT_CAPABILITY_ASSUMPTIONS } from "../capability-assumptions";
import { loadFixtureImageBase64 } from "./pdf-fixtures";

describe("buildBranchReportPdfBlob", () => {
  it("generates a non-empty PDF for a branch P2 scenario", async () => {
    const scenario = BRANCH_PROGRAM_P2_SCENARIOS.find(
      (s) => s.id === "branch-p2-approved-daughter"
    )!;
    const daughter = scenario.daughters[0]!;
    const data = buildBranchReportData({
      program: scenario,
      daughter: { ...daughter, daughterHoleId: "ddh-0247a" },
      recoveryAssumptions: DEFAULT_CAPABILITY_ASSUMPTIONS,
    });
    const blob = await buildBranchReportPdfBlob(data);
    expect(blob.type).toMatch(/pdf/i);
    const buffer = Buffer.from(await blob.arrayBuffer());
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("generates PDF with logo and trajectory fixture without throwing", async () => {
    const scenario = BRANCH_PROGRAM_P2_SCENARIOS.find(
      (s) => s.id === "branch-p2-approved-daughter"
    )!;
    const daughter = scenario.daughters[0]!;
    const logo = await loadPdfLogoBase64();
    const trajectory = loadFixtureImageBase64("trajectory-sample.png");
    const data = buildBranchReportData({
      program: scenario,
      daughter: { ...daughter, daughterHoleId: "ddh-0247a" },
      recoveryAssumptions: DEFAULT_CAPABILITY_ASSUMPTIONS,
      logoImagePng: logo,
      trajectoryImagePng: trajectory,
    });
    const blob = await buildBranchReportPdfBlob(data);
    const buffer = Buffer.from(await blob.arrayBuffer());
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.includes(Buffer.from("/Image"))).toBe(true);
    expect(data.reportType).toBe("Branch Plan");
  });

  it("falls back gracefully when no trajectory image is supplied", async () => {
    const scenario = BRANCH_PROGRAM_P2_SCENARIOS.find(
      (s) => s.id === "branch-p2-approved-daughter"
    )!;
    const daughter = scenario.daughters[0]!;
    const data = buildBranchReportData({
      program: scenario,
      daughter: { ...daughter, daughterHoleId: "ddh-0247a" },
      recoveryAssumptions: DEFAULT_CAPABILITY_ASSUMPTIONS,
      trajectoryImagePng: null,
    });
    const blob = await buildBranchReportPdfBlob(data);
    expect(blob.size).toBeGreaterThan(500);
  });
});
