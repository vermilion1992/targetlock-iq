import { describe, expect, it } from "vitest";
import {
  HANDOVER_DISCLAIMER,
  buildHandoverReportData,
  handoverFilename,
} from "../report-data";
import { buildReportText } from "../report";
import { computeHole } from "../compute";
import { calculateRecommendation } from "../recommendation";
import {
  sampleActualStations,
  samplePlanStations,
  sampleTarget,
} from "./fixtures";

describe("report", () => {
  const reco = calculateRecommendation(
    samplePlanStations,
    sampleActualStations,
    sampleTarget()
  )!;

  it("builds structured handover data with required fields", () => {
    const data = buildHandoverReportData(reco, sampleActualStations, {
      holeName: "DDH-0247",
    });
    expect(data.holeName).toBe("DDH-0247");
    expect(data.siteName).toBe("");
    expect(data.status).toBe(reco.classification.label);
    expect(data.currentMd).toContain("390");
    expect(data.dipCorrection).toMatch(/Drop|Lift|Hold dip/);
    expect(data.aziCorrection).toMatch(/Swing left|Swing right|Hold azimuth/);
    expect(data.correctionOptions.length).toBeGreaterThan(0);
    expect(data.qaFlags.length).toBeGreaterThan(0);
    expect(data.disclaimer).toBe(HANDOVER_DISCLAIMER);
  });

  it("includes site name in text report when provided", () => {
    const text = buildReportText(reco, sampleActualStations, {
      holeName: "DDH-0247",
      siteName: "North Camp",
    });
    expect(text).toContain("Site / project:");
    expect(text).toContain("North Camp");
  });

  it("includes recovery guidance in text report when steering provided", () => {
    const { steering } = computeHole(
      samplePlanStations.map((r) => ({ ...r })),
      sampleActualStations.map((r) => ({ ...r })),
      sampleTarget()
    );
    const text = buildReportText(reco, sampleActualStations, {
      holeName: "DDH-0247",
      steering,
    });
    expect(text).toContain("RECOVERY GUIDANCE");
    expect(text).toContain("Current action:");
    expect(text).toContain("Best method:");
    expect(text).toContain("Recovery loop:");
    expect(text).toContain("repeated survey-control process");
  });

  it("uses next interval aim section in text report", () => {
    const text = buildReportText(reco, sampleActualStations, {
      holeName: "DDH-0247",
    });
    expect(text).toContain("NEXT INTERVAL AIM");
    expect(text).toContain("Re-survey and recalculate at the next station");
    expect(text).not.toContain("Driller guidance:");
  });

  it("includes recovery capability assumptions in text report", () => {
    const { steering } = computeHole(
      samplePlanStations.map((r) => ({ md: r.md, dip: r.dip, azimuth: r.azimuth })),
      sampleActualStations.map((r) => ({ md: r.md, dip: r.dip, azimuth: r.azimuth })),
      sampleTarget(),
      { motorNaviDlsMax: 4.5 }
    );
    const text = buildReportText(reco, sampleActualStations, {
      holeName: "DDH-0247",
      steering,
      recoveryAssumptions: { motorNaviDlsMax: 4.5 },
    });
    expect(text).toContain("RECOVERY CAPABILITY ASSUMPTIONS");
    expect(text).toContain("Motor / Navi: 1.5–4.5°/30 m");
  });

  it("includes recent history in text report", () => {
    const text = buildReportText(reco, sampleActualStations, {
      holeName: "DDH-0247",
      history: [
        {
          id: "1",
          timestamp: new Date().toISOString(),
          type: "survey_added",
          summary: "Survey added at MD 390.0 m",
          actionTaken: "Add survey",
        },
      ],
    });
    expect(text).toContain("TARGETLOCK IQ");
    expect(text).toContain("Survey added at MD 390.0 m");
    expect(text).toContain("DECISION SUPPORT ONLY");
    expect(text).toContain("Projected miss");
    expect(text).toContain("CORRECTION OPTIONS");
  });

  it("formats handover filename safely", () => {
    expect(handoverFilename("DDH 0247/A", 390, "pdf")).toBe(
      "targetlock-handover-DDH_0247_A-md-390.pdf"
    );
    expect(handoverFilename("DDH-0247", 390, "txt")).toBe(
      "targetlock-handover-DDH-0247-md-390.txt"
    );
  });

  it("renders non-finite DLS requirement as em dash", () => {
    const pastTarget = {
      ...reco,
      remaining: 0,
      dlsRequired: Infinity,
      classification: {
        label: "Target depth passed",
        className: "risk",
        confidence: "Review",
      },
    };
    const data = buildHandoverReportData(pastTarget, sampleActualStations);
    expect(data.dlsRequired).toBe("—");
  });

  it("accepts optional trajectory and logo images", () => {
    const data = buildHandoverReportData(reco, sampleActualStations, {
      holeName: "DDH-0247",
      trajectoryImagePng: "data:image/png;base64,placeholder-trajectory-image-for-data-layer-test-only",
      logoImagePng: null,
    });
    expect(data.reportType).toBe("Shift Handover");
    expect(data.trajectoryImagePng).toContain("data:image/png");
    expect(data.logoImagePng).toBeNull();
  });

  it("includes RC2 reference and hole mode section in text report", () => {
    const { steering, referenceWarnings, holeModeAssessment } = computeHole(
      samplePlanStations.map((r) => ({ md: r.md, dip: r.dip, azimuth: r.azimuth })),
      sampleActualStations.map((r) => ({ md: r.md, dip: r.dip, azimuth: r.azimuth })),
      sampleTarget()
    );
    const text = buildReportText(reco, sampleActualStations, {
      holeName: "DDH-0247",
      steering,
      referenceWarnings,
      holeModeAssessment,
    });
    expect(text).toContain("SURVEY REFERENCE & HOLE MODE (RC2)");
    expect(text).toContain("Plan north reference:");
    expect(text).toContain("Internal calculation reference: True North");
    expect(text).toContain("Base confidence:");
    expect(text).toContain("Reported confidence:");
  });

  it("includes planner execution context when provided", () => {
    const text = buildReportText(reco, sampleActualStations, {
      holeName: "DDH-0247",
      plannerExecution: {
        planRevision: 2,
        approvalState: "current",
        approvalLabel: "Approved",
        approvedBy: "Geologist",
        approvedAt: "2026-06-01T00:00:00.000Z",
        lockedPlanHash: "abc123",
        qaWarningCount: 1,
        qaHardErrorCount: 0,
        lockStatus: "locked-current",
        actualVsPlanStatus: "on-plan",
        actualVsPlanOffset: 1.2,
        executionState: "drilling",
      },
    });
    expect(text.toUpperCase()).toContain("PLAN PROVENANCE (PLANNER)");
    expect(text).toContain("R2");
    expect(text).toContain("Geologist");
    expect(text).toContain("on-plan");
  });

  it("includes actual-vs-locked-plan progress and warnings when provided", () => {
    const text = buildReportText(reco, sampleActualStations, {
      holeName: "DDH-0247",
      plannerExecution: {
        planRevision: 1,
        approvalState: "current",
        approvalLabel: "Approved",
        approvedBy: "Geologist",
        approvedAt: "2026-06-01T00:00:00.000Z",
        lockedPlanHash: "abc123",
        qaWarningCount: 0,
        qaHardErrorCount: 0,
        lockStatus: "locked-current",
        actualVsPlanStatus: "watch",
        actualVsPlanOffset: 6.5,
        actualVsPlanProgressPct: 50,
        planChangedWarning:
          "Current plan differs from the locked execution snapshot — create a revision in Planner.",
        drilledPastPlanWarning:
          "Latest actual MD (202 m) is beyond planned TD (200 m).",
        actualVsPlanWarnings: [
          "Offset from locked plan: 6.50 m (warning ≥ 6 m).",
        ],
        executionState: "drilling",
      },
    });
    expect(text).toContain("Drilling progress:");
    expect(text).toContain("50%");
    expect(text).toContain("locked execution snapshot");
    expect(text).toContain("beyond planned TD");
    expect(text).toContain("Offset from locked plan");
  });
});
