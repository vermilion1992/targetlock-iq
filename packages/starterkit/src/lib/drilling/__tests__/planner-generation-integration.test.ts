import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { generatePlannerPlan } from "../planner";
import { resolveTargetEnu } from "../coordinate-system";
import { buildStations } from "../desurvey";
import { createEmptyPlannerDraft } from "../planner-types";
import type { PlannerDraft } from "../planner-types";
import { dbl } from "./arbitraries";

const draftArb: fc.Arbitrary<PlannerDraft> = fc
  .record({
    initialDip: dbl(-80, -10),
    initialAzimuth: dbl(0, 360),
    e: dbl(-500, 500),
    n: dbl(-500, 500),
    d: dbl(50, 900),
    tolerance: dbl(2, 15),
    surveyInterval: fc.constantFrom(10, 15, 30),
    maxDls: dbl(1, 8),
    pathDesign: fc.constantFrom("straight", "curve-to-target", "build-and-hold"),
    kickoffLengthM: dbl(0, 150),
    buildRateDegPer30m: dbl(1, 8),
  })
  .map((p) => {
    const draft = createEmptyPlannerDraft();
    draft.planType = "standard";
    draft.projectName = "Fuzz site";
    draft.holeName = "DDH-FUZZ";
    draft.initialDip = p.initialDip;
    draft.initialAzimuth = p.initialAzimuth;
    draft.target = { e: p.e, n: p.n, d: p.d, tolerance: p.tolerance, inputMode: "collar-relative" };
    draft.constraints = {
      surveyInterval: p.surveyInterval,
      maxDls: p.maxDls,
      pathDesign: p.pathDesign as PlannerDraft["constraints"]["pathDesign"],
      kickoffLengthM: p.kickoffLengthM,
      buildRateDegPer30m: p.buildRateDegPer30m,
    };
    return draft;
  });

function maxAbsDip(records: { dip: number }[]): number {
  return records.length ? Math.max(...records.map((r) => Math.abs(r.dip))) : 0;
}

describe("generatePlannerPlan — standard plan integration fuzz", () => {
  it("never throws, always returns finite records with non-decreasing MD and warnings", () => {
    fc.assert(
      fc.property(draftArb, (draft) => {
        let generated: PlannerDraft | undefined;
        expect(() => {
          generated = generatePlannerPlan(draft);
        }).not.toThrow();
        const g = generated!;
        expect(Array.isArray(g.warnings)).toBe(true);
        for (let i = 0; i < g.planRecords.length; i += 1) {
          const r = g.planRecords[i]!;
          expect(Number.isFinite(r.md) && Number.isFinite(r.dip) && Number.isFinite(r.azimuth)).toBe(true);
          if (i > 0) expect(r.md).toBeGreaterThanOrEqual(g.planRecords[i - 1]!.md);
        }
      }),
      { numRuns: 3000 }
    );
  });

  it("is deterministic (identical draft -> identical plan)", () => {
    fc.assert(
      fc.property(draftArb, (draft) => {
        const a = generatePlannerPlan(draft);
        const b = generatePlannerPlan(draft);
        expect(JSON.stringify(a.planRecords)).toBe(JSON.stringify(b.planRecords));
      }),
      { numRuns: 1000 }
    );
  });

  it("feasible solved designs (curve / build-and-hold) close on the resolved target", () => {
    fc.assert(
      fc.property(draftArb, (draft) => {
        const design = draft.constraints.pathDesign;
        if (design === "straight") return; // start heading is not aimed at target
        const g = generatePlannerPlan(draft);
        if (!g.planRecords.length) return; // infeasible: reported via warnings
        fc.pre(maxAbsDip(g.planRecords) <= 88);
        const { e, n, d } = resolveTargetEnu(draft);
        const stations = buildStations(g.planRecords);
        const end = stations[stations.length - 1]!;
        const miss = Math.hypot(end.e - e, end.n - n, end.d - d);
        expect(miss).toBeLessThan(0.5);
      }),
      { numRuns: 3000 }
    );
  });

  it("infeasible curved plans are reported, never silently emitted", () => {
    fc.assert(
      fc.property(draftArb, (draft) => {
        const g = generatePlannerPlan(draft);
        if (draft.constraints.pathDesign === "curve-to-target" && g.planRecords.length === 0) {
          expect(g.warnings.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 2000 }
    );
  });
});
