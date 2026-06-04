import { describe, expect, it } from "vitest";
import { buildBranchReportData } from "../branch-report-data";
import { buildBranchReportPdfBlob } from "../branch-report-pdf";
import { BRANCH_PROGRAM_P2_SCENARIOS } from "../branch-program-scenarios";
import { DEFAULT_CAPABILITY_ASSUMPTIONS } from "../capability-assumptions";

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
});
