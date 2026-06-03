import { describe, expect, it } from "vitest";
import { parseSurveyCsv } from "../csv";
import { SAMPLE_ACTUAL_CSV, SAMPLE_PLAN_CSV } from "@/lib/sample-data";

describe("csv", () => {
  it("parses planned hole with tolerance columns", () => {
    const records = parseSurveyCsv(SAMPLE_PLAN_CSV);
    expect(records.length).toBe(21);
    expect(records[0].md).toBe(0);
    expect(records[0].dip).toBe(-60);
    expect(records[0].tolerance).toBe(2);
  });

  it("parses actual surveys", () => {
    const records = parseSurveyCsv(SAMPLE_ACTUAL_CSV);
    expect(records.length).toBe(14);
    expect(records[records.length - 1].md).toBe(390);
  });

  it("parses HUB-IQ style headers", () => {
    const text = `hole_id,measured_depth_m,inclination_deg,azimuth_deg,tolerance_m
DDH-0247,0,-60,125,2
DDH-0247,30,-59.5,126,2.2`;
    const records = parseSurveyCsv(text);
    expect(records).toHaveLength(2);
    expect(records[1].md).toBe(30);
    expect(records[1].tolerance).toBe(2.2);
  });

  it("accepts header aliases", () => {
    const text = `depth,inclination,az
0,-60,125
30,-59,126`;
    const records = parseSurveyCsv(text);
    expect(records).toHaveLength(2);
    expect(records[1].md).toBe(30);
    expect(records[1].dip).toBe(-59);
  });

  it("sorts records by MD", () => {
    const text = `md,dip,azimuth
60,-60,125
0,-60,125
30,-60,125`;
    const records = parseSurveyCsv(text);
    expect(records.map((r) => r.md)).toEqual([0, 30, 60]);
  });

  it("parses quoted CSV cells", () => {
    const text = `md,dip,azimuth,note
0,-60,125,"collar, start"
30,-59,126,"mid hole"`;
    const records = parseSurveyCsv(text);
    expect(records).toHaveLength(2);
    expect(records[0].md).toBe(0);
  });

  it("skips rows with missing numeric fields", () => {
    const text = `md,dip,azimuth
0,-60,125
,bad,125
30,-59,126`;
    const records = parseSurveyCsv(text);
    expect(records.map((r) => r.md)).toEqual([0, 30]);
  });

  it("omits optional tolerances when columns are absent", () => {
    const records = parseSurveyCsv(SAMPLE_ACTUAL_CSV);
    expect(records[0].tolerance).toBeUndefined();
  });
});
