import { describe, expect, it } from "vitest";
import {
  collarRelativeTargetFromGrid,
  gridTargetFromCollarRelative,
  normalizePlannerCollar,
  resolveTargetEnu,
  targetEnuFromMdOffset,
  validateCoordinateInputs,
} from "../coordinate-system";
import { createEmptyPlannerDraft } from "../planner-types";

describe("coordinate-system", () => {
  const collar = { easting: 500000, northing: 7000000, elevation: 400 };

  it("converts grid target (true RL) to collar-relative offset", () => {
    // Collar at RL 400; target at RL 280 is 120 m below the collar.
    const rel = collarRelativeTargetFromGrid(
      { e: 500150, n: 7000080, d: 280 },
      collar
    );
    expect(rel.e).toBeCloseTo(150, 5);
    expect(rel.n).toBeCloseTo(80, 5);
    expect(rel.d).toBeCloseTo(120, 5);
  });

  it("converts collar-relative depth back to true RL for display", () => {
    // 200 m below a collar at RL 400 → RL 200.
    const grid = gridTargetFromCollarRelative({ e: 100, n: -50, d: 200 }, collar);
    expect(grid.e).toBeCloseTo(500100, 5);
    expect(grid.n).toBeCloseTo(6999950, 5);
    expect(grid.d).toBeCloseTo(200, 5);
  });

  it("round-trips grid and collar-relative", () => {
    const rel = { e: 100, n: -50, d: 200 };
    const grid = gridTargetFromCollarRelative(rel, collar);
    const back = collarRelativeTargetFromGrid(grid, collar);
    expect(back.e).toBeCloseTo(rel.e, 5);
    expect(back.n).toBeCloseTo(rel.n, 5);
    expect(back.d).toBeCloseTo(rel.d, 5);
  });

  it("normalizes planner collar with optional GPS", () => {
    const c = normalizePlannerCollar({
      easting: 1,
      northing: 2,
      elevation: 3,
      latitude: -25.5,
      longitude: 133.2,
    });
    expect(c?.latitude).toBe(-25.5);
    expect(c?.longitude).toBe(133.2);
  });

  it("GPS mode stores lat/long without transform side effects", () => {
    const draft = createEmptyPlannerDraft();
    draft.coordinateMode = "gps";
    draft.collar = { easting: 0, northing: 0, elevation: 0, latitude: -25, longitude: 133 };
    draft.target = { e: 50, n: 30, d: 100, tolerance: 6, inputMode: "collar-relative" };
    const resolved = resolveTargetEnu(draft);
    expect(resolved.e).toBe(50);
    expect(resolved.n).toBe(30);
    expect(resolved.d).toBe(100);
  });

  it("warns when grid mode missing collar", () => {
    const draft = createEmptyPlannerDraft();
    draft.coordinateMode = "grid";
    draft.planType = "standard";
    const warnings = validateCoordinateInputs(draft);
    expect(warnings.some((w) => w.includes("collar"))).toBe(true);
  });

  it("targetEnuFromMdOffset resolves position along planned direction", () => {
    const enu = targetEnuFromMdOffset(100, -60, 90);
    expect(enu).not.toBeNull();
    expect(enu!.e).toBeGreaterThan(0);
    expect(enu!.d).toBeGreaterThan(0);
  });

  it("resolveTargetEnu handles md-offset input mode", () => {
    const draft = createEmptyPlannerDraft();
    draft.initialDip = -60;
    draft.initialAzimuth = 90;
    draft.target = {
      md: 150,
      e: 0,
      n: 0,
      d: 0,
      tolerance: 6,
      inputMode: "md-offset",
    };
    const resolved = resolveTargetEnu(draft);
    expect(resolved.e).toBeGreaterThan(0);
    expect(resolved.warnings).toHaveLength(0);
  });

  it("resolveTargetEnu converts grid collar + grid target (RL) to collar-relative", () => {
    const draft = createEmptyPlannerDraft();
    draft.coordinateMode = "grid";
    draft.collar = { easting: 500000, northing: 7000000, elevation: 400 };
    draft.target = {
      e: 500150,
      n: 7000080,
      d: 280, // true RL — 120 m below the RL 400 collar
      tolerance: 6,
      inputMode: "grid",
    };
    const resolved = resolveTargetEnu(draft);
    expect(resolved.e).toBeCloseTo(150, 5);
    expect(resolved.n).toBeCloseTo(80, 5);
    expect(resolved.d).toBeCloseTo(120, 5);
    expect(resolved.warnings).toHaveLength(0);
  });
});
