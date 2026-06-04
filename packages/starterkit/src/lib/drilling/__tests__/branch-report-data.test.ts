import { describe, expect, it } from "vitest";
import { buildBranchReportData } from "../branch-report-data";
import { BRANCH_PROGRAM_P2_SCENARIOS } from "../branch-program-scenarios";
import { DEFAULT_CAPABILITY_ASSUMPTIONS } from "../capability-assumptions";

describe("buildBranchReportData", () => {
  it("includes parent line and core sections", () => {
    const scenario = BRANCH_PROGRAM_P2_SCENARIOS.find(
      (s) => s.id === "branch-p2-approved-daughter"
    )!;
    const daughter = scenario.daughters[0]!;
    const data = buildBranchReportData({
      program: scenario,
      daughter: { ...daughter, daughterHoleId: "ddh-0247a" },
      recoveryAssumptions: DEFAULT_CAPABILITY_ASSUMPTIONS,
    });
    expect(data.daughterContext).toContain("Daughter of");
    expect(data.sections.some((s) => s.id === "overview")).toBe(true);
    expect(data.sections.some((s) => s.id === "toolface")).toBe(true);
    expect(data.sections.some((s) => s.id === "approval")).toBe(true);
    expect(data.disclaimer).toContain("Planning estimate");
  });

  it("notes stale approval when kickoff changes", () => {
    const scenario = BRANCH_PROGRAM_P2_SCENARIOS[0]!;
    const daughter = scenario.daughters[0]!;
    const approved = {
      ...daughter,
      approval: {
        approvedBy: "Test User",
        role: "Geo",
        approvedAt: new Date().toISOString(),
        approvedMethod: daughter.method,
        approvedKickoffMd: 400,
        approvedTargetId: daughter.targetId,
        assumptionSnapshot: DEFAULT_CAPABILITY_ASSUMPTIONS,
        kickoffE: 0,
        kickoffN: 0,
        kickoffD: 0,
        kickoffDip: -60,
        kickoffAzimuth: 90,
        requiredDls: 3,
        daughterPlanHash: "[]",
      },
    };
    const data = buildBranchReportData({
      program: scenario,
      daughter: approved,
      recoveryAssumptions: DEFAULT_CAPABILITY_ASSUMPTIONS,
    });
    const approvedSection = data.sections.find((s) => s.id === "approved");
    expect(approvedSection?.lines.some((l) => l.includes("WARNING") || l.includes("differ"))).toBe(
      true
    );
  });
});
