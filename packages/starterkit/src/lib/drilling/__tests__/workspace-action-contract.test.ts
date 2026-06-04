import { describe, expect, it } from "vitest";
import { DEFAULT_CAPABILITY_ASSUMPTIONS } from "../capability-assumptions";
import { TEST_SCENARIOS } from "../test-scenarios";
import { DEFAULT_SYNTHETIC_PARAMS } from "../synthetic-hole-builder";
import {
  branchExportReadiness,
  canLoadBuiltInScenario,
  describeClearHistoryConfirm,
  describeDestructiveScenarioLoad,
  describeGuideDemoExitConfirm,
  describeImportTargetCancelConfirm,
  sanitizeBranchCoordField,
  sanitizeBranchToleranceM,
  validateSyntheticHoleParams,
} from "../workspace-action-contract";

describe("workspace-action-contract", () => {
  it("describes destructive scenario load", () => {
    expect(describeDestructiveScenarioLoad("On plan")).toContain("On plan");
    expect(describeDestructiveScenarioLoad("On plan")).toContain("replaces");
  });

  it("describes clear history confirm", () => {
    expect(describeClearHistoryConfirm()).toContain("decision history");
    expect(describeClearHistoryConfirm()).not.toContain("survey");
  });

  it("describes guide demo exit", () => {
    expect(describeGuideDemoExitConfirm()).toContain("restore");
  });

  it("describes import target cancel", () => {
    expect(describeImportTargetCancelConfirm()).toContain("Cancel import");
  });

  it("blocks invalid-import built-in load", () => {
    const invalid = TEST_SCENARIOS.find((s) => s.id === "invalid-import")!;
    expect(canLoadBuiltInScenario(invalid)).toBe(false);
    const onPlan = TEST_SCENARIOS.find((s) => s.id === "on-plan")!;
    expect(canLoadBuiltInScenario(onPlan)).toBe(true);
  });

  it("validates synthetic hole params", () => {
    expect(validateSyntheticHoleParams(DEFAULT_SYNTHETIC_PARAMS).ok).toBe(true);
    expect(
      validateSyntheticHoleParams({ ...DEFAULT_SYNTHETIC_PARAMS, holeName: "  " }).ok
    ).toBe(false);
    expect(
      validateSyntheticHoleParams({ ...DEFAULT_SYNTHETIC_PARAMS, targetMd: 10 }).ok
    ).toBe(false);
  });

  it("sanitizes branch coordinates", () => {
    expect(sanitizeBranchCoordField("abc", 5)).toBe(5);
    expect(sanitizeBranchCoordField("12.5", 0)).toBe(12.5);
  });

  it("sanitizes branch tolerance", () => {
    expect(sanitizeBranchToleranceM("x", 8)).toBe(8);
    expect(sanitizeBranchToleranceM("-1", 8)).toBe(0.1);
  });

  it("branch export requires daughter plan", () => {
    const r = branchExportReadiness({
      daughter: {
        daughterId: "A",
        daughterHoleId: "a",
        parentHoleId: "mother-1",
        kickoffMd: 300,
        method: "motor-navi",
        status: "draft",
        planRecords: [],
        targetId: "t1",
      },
      motherActualRecords: [
        { md: 0, dip: -60, azimuth: 90 },
        { md: 300, dip: -62, azimuth: 92 },
      ],
      recoveryAssumptions: DEFAULT_CAPABILITY_ASSUMPTIONS,
    });
    expect(r.ready).toBe(false);
    expect(r.reason).toContain("daughter plan");
  });
});
