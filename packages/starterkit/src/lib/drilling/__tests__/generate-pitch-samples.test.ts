import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { entryForSupervisorDecision } from "../approval";
import { computeHole } from "../compute";
import { buildReportText } from "../report";
import { buildHandoverReportData } from "../report-data";
import { buildHandoverPdfBlob } from "../report-pdf";
import { loadPdfLogoBase64 } from "../pdf-brand";
import { sampleActualStations, samplePlanStations, sampleTarget } from "./fixtures";
import { loadFixtureImageBase64 } from "./pdf-fixtures";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..", "..");
const samplesDir = join(repoRoot, "docs", "targetlock-pitch", "samples");
const publicPdf = join(repoRoot, "packages", "starterkit", "public", "pitch-handover-sample.pdf");

describe("generate pitch samples", () => {
  it("writes TXT and PDF handover examples to docs/targetlock-pitch/samples", async () => {
    const planRecords = samplePlanStations.map((s) => ({
      md: s.md,
      dip: s.dip,
      azimuth: s.azimuth,
    }));
    const actualRecords = sampleActualStations.map((s) => ({
      md: s.md,
      dip: s.dip,
      azimuth: s.azimuth,
    }));
    const target = sampleTarget();
    const { recommendation: reco, steering } = computeHole(
      planRecords,
      actualRecords,
      target
    );
    if (!reco) throw new Error("Sample data should produce a recommendation");
    const supervisor = {
      ...entryForSupervisorDecision("correct_naturally", reco, "Pilot sample export"),
      id: "sample-supervisor",
      timestamp: new Date().toISOString(),
    };
    const options = {
      holeName: "DDH-0247",
      siteName: "North Camp — Pilot",
      history: [
        {
          id: "sample-load",
          timestamp: new Date().toISOString(),
          type: "data_loaded" as const,
          summary: "Sample plan and actual surveys loaded",
          actionTaken: "Load sample",
        },
        supervisor,
      ],
    };

    await mkdir(samplesDir, { recursive: true });
    const reportOptions = { ...options, steering };
    const txt = buildReportText(reco, sampleActualStations, reportOptions);
    await writeFile(join(samplesDir, "DDH-0247-handover-md390.txt"), txt, "utf8");
    expect(txt).toContain("RECOVERY GUIDANCE");
    expect(txt).toContain("RECOVERY CAPABILITY ASSUMPTIONS");

    const data = buildHandoverReportData(reco, sampleActualStations, {
      ...reportOptions,
      logoImagePng: await loadPdfLogoBase64(),
      trajectoryImagePng: loadFixtureImageBase64("trajectory-sample.png"),
    });
    expect(data.recoveryGuidance).not.toBeNull();
    const blob = await buildHandoverPdfBlob(data, {
      reco,
      steering,
    });
    const buffer = Buffer.from(await blob.arrayBuffer());
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.includes(Buffer.from("/Image"))).toBe(true);
    await writeFile(join(samplesDir, "DDH-0247-handover-md390.pdf"), buffer);
    await writeFile(publicPdf, buffer);
  });
});
