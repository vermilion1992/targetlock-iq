import { describe, expect, it } from "vitest";
import {
  assumptionsValidationStatus,
  buildPlanSanityCheck,
  compareReferenceStations,
  parseReferenceCsv,
  type AssumptionSignOff,
} from "../validation";
import { buildStations } from "../desurvey";
import { DEFAULT_CAPABILITY_ASSUMPTIONS } from "../capability-assumptions";
import { samplePlanStations, sampleTarget } from "./fixtures";

describe("validation — plan sanity check", () => {
  it("reports no plan when empty", () => {
    const result = buildPlanSanityCheck([], sampleTarget());
    expect(result.hasPlan).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("summarises a loaded plan", () => {
    const result = buildPlanSanityCheck(samplePlanStations, sampleTarget());
    expect(result.hasPlan).toBe(true);
    const labels = result.rows.map((r) => r.label);
    expect(labels).toContain("Plan stations");
    expect(labels).toContain("MD range");
    expect(labels).toContain("Station spacing");
    expect(labels).toContain("Target MD");
  });
});

describe("validation — reference comparison", () => {
  const computed = buildStations([
    { md: 0, dip: -60, azimuth: 90 },
    { md: 30, dip: -60, azimuth: 90 },
    { md: 60, dip: -62, azimuth: 92 },
  ]);

  it("parses a reference CSV with E/N/D aliases", () => {
    const csv = [
      "MD,East,North,Down",
      "0,0,0,0",
      "30,26,0,15",
    ].join("\n");
    const parsed = parseReferenceCsv(csv);
    expect(parsed.length).toBe(2);
    expect(parsed[1].md).toBe(30);
  });

  it("reports zero error when reference equals computed", () => {
    const reference = computed.map((s) => ({ md: s.md, e: s.e, n: s.n, d: s.d }));
    const result = compareReferenceStations(reference, computed);
    expect(result.matched).toBe(computed.length);
    expect(result.maxDistance).toBeLessThan(1e-9);
  });

  it("flags unmatched reference depths", () => {
    const result = compareReferenceStations([{ md: 999, e: 0, n: 0, d: 0 }], computed);
    expect(result.matched).toBe(0);
    expect(result.rows[0].matched).toBe(false);
  });
});

describe("validation — assumption sign-off status", () => {
  it("is unvalidated without sign-off", () => {
    const status = assumptionsValidationStatus(null, DEFAULT_CAPABILITY_ASSUMPTIONS);
    expect(status.state).toBe("unvalidated");
  });

  it("is validated when assumptions match the sign-off", () => {
    const signOff: AssumptionSignOff = {
      validatedBy: "A. Geologist",
      validatedAt: new Date().toISOString(),
      assumptions: { ...DEFAULT_CAPABILITY_ASSUMPTIONS },
    };
    const status = assumptionsValidationStatus(signOff, DEFAULT_CAPABILITY_ASSUMPTIONS);
    expect(status.state).toBe("validated");
  });

  it("is stale when assumptions changed after sign-off", () => {
    const signOff: AssumptionSignOff = {
      validatedBy: "A. Geologist",
      validatedAt: new Date().toISOString(),
      assumptions: { ...DEFAULT_CAPABILITY_ASSUMPTIONS },
    };
    const status = assumptionsValidationStatus(signOff, {
      ...DEFAULT_CAPABILITY_ASSUMPTIONS,
      motorNaviDlsMax: 6,
    });
    expect(status.state).toBe("stale");
  });
});
