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
});
