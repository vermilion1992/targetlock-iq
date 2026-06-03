import { describe, expect, it } from "vitest";
import {
  entryForSupervisorDecision,
  suggestedNextInterval,
  SUPERVISOR_DECISIONS,
} from "../approval";
import { computeHole, DEFAULT_TARGET } from "../compute";
import { parseSurveyCsv } from "../csv";
import { SAMPLE_ACTUAL_CSV, SAMPLE_PLAN_CSV } from "@/lib/sample-data";
import { slugifyHoleId } from "../storage";

describe("approval", () => {
  it("defines five supervisor options", () => {
    expect(SUPERVISOR_DECISIONS).toHaveLength(5);
    expect(SUPERVISOR_DECISIONS.map((d) => d.kind)).toContain("stop_hole");
  });

  it("builds history entry with recommendation context", () => {
    const plan = parseSurveyCsv(SAMPLE_PLAN_CSV);
    const actual = parseSurveyCsv(SAMPLE_ACTUAL_CSV);
    const { recommendation } = computeHole(plan, actual, DEFAULT_TARGET);
    expect(recommendation).toBeTruthy();
    const entry = entryForSupervisorDecision("steer", recommendation, "Motor run tonight");
    expect(entry.type).toBe("supervisor_decision");
    expect(entry.summary).toContain("Steer");
    expect(entry.detail).toContain("Motor run tonight");
    expect(entry.actionTaken).toBe("Steer");
  });

  it("halves survey interval for shorten_interval", () => {
    expect(suggestedNextInterval(30, "shorten_interval")).toBe(15);
    expect(suggestedNextInterval(12, "shorten_interval")).toBe(10);
    expect(suggestedNextInterval(30, "continue")).toBeNull();
  });
});

describe("storage slugifyHoleId", () => {
  it("slugifies hole names for storage", () => {
    expect(slugifyHoleId("DDH-0247")).toBe("ddh-0247");
    expect(slugifyHoleId("  RC 12  ")).toBe("rc-12");
  });
});
