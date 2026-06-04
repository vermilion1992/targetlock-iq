import { describe, expect, it } from "vitest";
import {
  parseSurveyCsvDetailed,
  validateSurveyCsvImport,
  validateCsvText,
} from "../csv-import-assistant";
import { SAMPLE_ACTUAL_CSV, SAMPLE_PLAN_CSV } from "@/lib/sample-data";

const baseContext = {
  activeHoleId: "hole-1",
  activeHoleName: "DDH-0247",
  existingPlanRecords: [] as { md: number; dip: number; azimuth: number }[],
  existingActualRecords: [] as { md: number; dip: number; azimuth: number }[],
};

describe("csv-import-assistant", () => {
  it("validates plan import as ready", () => {
    const v = validateCsvText(SAMPLE_PLAN_CSV, {
      ...baseContext,
      importKind: "plan",
    });
    expect(v.confidence).toBe("ready");
    expect(v.stationsReady).toBe(21);
    expect(v.errors).toHaveLength(0);
  });

  it("validates survey import as ready", () => {
    const v = validateCsvText(SAMPLE_ACTUAL_CSV, {
      ...baseContext,
      importKind: "actual",
      existingPlanRecords: parseSurveyCsvDetailed(SAMPLE_PLAN_CSV).records,
    });
    expect(v.confidence).toBe("ready");
    expect(v.stationsReady).toBe(14);
  });

  it("rejects missing columns with plain English", () => {
    const v = validateCsvText("depth;inclination;bearing\n0;-60;125", {
      ...baseContext,
      importKind: "plan",
    });
    expect(v.confidence).toBe("cannot_import");
    expect(v.errors.some((e) => e.message.includes("measured depth"))).toBe(true);
  });

  it("flags duplicate md", () => {
    const text = `md_m,dip_deg,azimuth_deg
0,-60,125
30,-59,126
30,-58,127`;
    const v = validateCsvText(text, { ...baseContext, importKind: "actual" });
    expect(v.confidence).toBe("cannot_import");
    expect(v.errors.some((e) => e.message.includes("repeats measured depth"))).toBe(true);
  });

  it("flags md not increasing", () => {
    const text = `md_m,dip_deg,azimuth_deg
0,-60,125
60,-59,126
30,-58,127`;
    const v = validateCsvText(text, { ...baseContext, importKind: "actual" });
    expect(v.confidence).toBe("cannot_import");
    expect(v.errors.some((e) => e.message.includes("must increase"))).toBe(true);
  });

  it("flags bad dip and azimuth", () => {
    const dipText = `md_m,dip_deg,azimuth_deg
0,-95,125`;
    const dipV = validateCsvText(dipText, { ...baseContext, importKind: "actual" });
    expect(dipV.errors.some((e) => e.message.includes("dip must be"))).toBe(true);

    const aziText = `md_m,dip_deg,azimuth_deg
0,-60,400`;
    const aziV = validateCsvText(aziText, { ...baseContext, importKind: "actual" });
    expect(aziV.errors.some((e) => e.message.includes("azimuth must be"))).toBe(true);
  });

  it("warns on hole_id mismatch", () => {
    const text = `hole_id,md_m,dip_deg,azimuth_deg
OTHER-001,0,-60,125
OTHER-001,30,-59,126`;
    const v = validateCsvText(text, { ...baseContext, importKind: "actual" });
    expect(v.confidence).toBe("needs_review");
    expect(v.warnings.some((w) => w.message.includes("does not match"))).toBe(true);
  });

  it("maps md_m and hole_id aliases", () => {
    const parse = parseSurveyCsvDetailed(
      `hole_id,md_m,dip_deg,azimuth_deg\nDDH-0247,0,-80,270`
    );
    expect(parse.mapping.md).toBe("md_m");
    expect(parse.mapping.holeId).toBe("hole_id");
    expect(parse.detectedHoleIds).toContain("DDH-0247");
  });

  it("caps preview at five rows", () => {
    const lines = ["md_m,dip_deg,azimuth_deg"];
    for (let i = 0; i < 10; i += 1) {
      lines.push(`${i * 30},-60,125`);
    }
    const v = validateCsvText(lines.join("\n"), { ...baseContext, importKind: "plan" });
    expect(v.previewRows.length).toBeLessThanOrEqual(5);
  });

  it("warns when plan-like file uploaded as survey", () => {
    const v = validateCsvText(SAMPLE_PLAN_CSV, {
      ...baseContext,
      importKind: "actual",
    });
    expect(v.warnings.some((w) => w.message.includes("tolerance"))).toBe(true);
  });

  it("warns on positive dips (inclination convention)", () => {
    const text = `md_m,dip_deg,azimuth_deg
0,60,125
30,61,126
60,62,127`;
    const parse = parseSurveyCsvDetailed(text);
    const v = validateSurveyCsvImport(parse, { ...baseContext, importKind: "plan" });
    expect(v.warnings.some((w) => w.message.includes("positive"))).toBe(true);
  });

  it("warns on possible radians", () => {
    const text = `md_m,dip_deg,azimuth_deg
0,-0.5,1.2
30,-0.48,1.25`;
    const v = validateCsvText(text, { ...baseContext, importKind: "actual" });
    expect(v.warnings.some((w) => w.message.includes("radians"))).toBe(true);
  });
});
