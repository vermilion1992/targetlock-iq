import { describe, expect, it } from "vitest";
import { DEFAULT_CAPABILITY_ASSUMPTIONS } from "../capability-assumptions";
import {
  pdfNextIntervalAimLine,
  formatRecoveryActionDisplay,
} from "../action-plan-copy";
import { computeHole } from "../compute";
import { buildCorridorStatus, DEFAULT_PLAN_CORRIDOR } from "../plan-corridor";
import { buildHandoverReportData } from "../report-data";
import {
  buildHandoverPdfViewModel,
  collectHandoverPdfStrings,
  pdfTextLooksCorrupt,
  sanitizePdfText,
} from "../report-pdf-layout";
import { findScenario } from "../test-scenarios";
import { parseSurveyCsv } from "../csv";
import { buildStations } from "../desurvey";
import {
  sampleActualStations,
  samplePlanStations,
  sampleTarget,
} from "./fixtures";

function recoForScenario(id: string) {
  const scenario = findScenario(id)!;
  const planStations = buildStations(parseSurveyCsv(scenario.planCsv));
  const actualStations = buildStations(parseSurveyCsv(scenario.actualCsv));
  const finalPlan = planStations[planStations.length - 1]!;
  const target = {
    ...sampleTarget(),
    md: finalPlan.md,
    maxDls: 3,
    nextInterval: 30,
    ...scenario.target,
  };
  const { recommendation: reco, steering } = computeHole(
    planStations.map((r) => ({ md: r.md, dip: r.dip, azimuth: r.azimuth })),
    actualStations.map((r) => ({ md: r.md, dip: r.dip, azimuth: r.azimuth })),
    target
  );
  if (!reco) throw new Error(`No recommendation for ${id}`);
  return { reco, steering, planStations, actualStations };
}

describe("sanitizePdfText", () => {
  it("replaces unicode bullets and degree symbols", () => {
    const out = sanitizePdfText("• Dip sign: −90° — note · detail");
    expect(out).not.toContain("•");
    expect(out).not.toContain("°");
    expect(out).toContain("deg");
    expect(out).not.toContain("—");
  });

  it("does not produce spaced-letter artifacts", () => {
    const out = sanitizePdfText("Latest interval outside planned behaviour tolerance");
    expect(pdfTextLooksCorrupt(out)).toBe(false);
  });
});

describe("pdfNextIntervalAimLine", () => {
  it("uses a single concise line with interval", () => {
    const line = pdfNextIntervalAimLine(30);
    expect(line).toContain("next 30 m");
    expect(line).toMatch(/Re-survey and recalculate/i);
    expect(line.split(/Re-survey and recalculate/i).length - 1).toBe(1);
  });
});

describe("formatRecoveryActionDisplay", () => {
  it("maps internal keys to display labels", () => {
    expect(formatRecoveryActionDisplay("Correct now")).toBe("Correction advisable");
    expect(formatRecoveryActionDisplay("Steering review")).toBe("Steering review recommended");
    expect(formatRecoveryActionDisplay("Wedge or branch review")).toBe(
      "Wedge / branch review recommended"
    );
  });
});

describe("buildHandoverPdfViewModel", () => {
  it("filters OK QA flags from page 1 critical list", () => {
    const { reco, steering } = recoForScenario("recoverable");
    const data = buildHandoverReportData(reco, sampleActualStations, { steering });
    const vm = buildHandoverPdfViewModel(data, { reco, steering });
    expect(vm.page1.criticalQaFlags.every((f) => f.level !== "ok")).toBe(true);
    expect(data.qaFlags.some((f) => f.level === "ok")).toBe(true);
  });

  it("uses display labels not internal keys in PDF strings", () => {
    const { reco, steering } = recoForScenario("recoverable");
    const data = buildHandoverReportData(reco, sampleActualStations, { steering });
    const vm = buildHandoverPdfViewModel(data, { reco, steering });
    const blob = collectHandoverPdfStrings(vm).join(" ");
    expect(blob).not.toContain("Correct now");
    expect(pdfTextLooksCorrupt(blob)).toBe(false);
  });

  it("collapses assumptions to one line on on-plan scenario", () => {
    const { reco, steering, planStations, actualStations } = recoForScenario("on-plan");
    const corridorStatus = buildCorridorStatus(
      planStations,
      actualStations,
      DEFAULT_PLAN_CORRIDOR,
      reco
    );
    const assumptionSignOff = {
      validatedBy: "Test Geo",
      validatedAt: new Date().toISOString(),
      assumptions: DEFAULT_CAPABILITY_ASSUMPTIONS,
    };
    const data = buildHandoverReportData(reco, actualStations, {
      steering,
      corridorStatus,
      assumptionSignOff,
      recoveryAssumptions: DEFAULT_CAPABILITY_ASSUMPTIONS,
    });
    const vm = buildHandoverPdfViewModel(data, {
      reco,
      steering,
      corridorStatus,
      assumptionSignOff,
      recoveryAssumptions: DEFAULT_CAPABILITY_ASSUMPTIONS,
    });
    expect(vm.appendix.recoveryAssumptionsOneLiner).toBeTruthy();
    expect(vm.appendix.recoveryAssumptionsLines).toHaveLength(0);
  });

  it("omits conventions when technical detail not required", () => {
    const { reco, steering, planStations, actualStations } = recoForScenario("on-plan");
    const data = buildHandoverReportData(reco, actualStations, { steering });
    const vm = buildHandoverPdfViewModel(data, { reco, steering });
    if (!vm.appendix.includeTechnicalDetail) {
      expect(vm.appendix.conventions).toHaveLength(0);
    }
  });

  it("includes corridor detail only when outside corridor", () => {
    const { reco, steering, planStations, actualStations } = recoForScenario("recoverable");
    const corridorStatus = buildCorridorStatus(
      planStations,
      actualStations,
      {
        ...DEFAULT_PLAN_CORRIDOR,
        allowedDipDevDeg: 0.05,
        allowedAziDevDeg: 0.05,
        positionOffsetM: 0.5,
      },
      reco
    );
    const data = buildHandoverReportData(reco, actualStations, {
      steering,
      corridorStatus,
    });
    const vm = buildHandoverPdfViewModel(data, { reco, steering, corridorStatus });
    if (corridorStatus?.outsidePlannedCorridor) {
      expect(vm.appendix.planCorridorSummary).toBeTruthy();
    }
  });

  it("next interval aim line appears once in page 1", () => {
    const { reco, steering } = recoForScenario("recoverable");
    const data = buildHandoverReportData(reco, sampleActualStations, { steering });
    const vm = buildHandoverPdfViewModel(data, { reco, steering });
    const count = (
      vm.page1.nextIntervalAimLine.match(/Re-survey and recalculate/gi) ?? []
    ).length;
    expect(count).toBe(1);
  });
});
