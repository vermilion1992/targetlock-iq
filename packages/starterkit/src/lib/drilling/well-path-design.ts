import {
  DEG,
  RAD,
  add,
  dipAzFromVector,
  normalizeVector,
  scale,
  subtract,
  vectorFromDipAz,
  vectorLength,
} from "./geometry";
import type { SurveyRecord, Vec3 } from "./types";

/**
 * Curved well path design: circular arc (constant dogleg) in the plane
 * containing the start direction and the target, optionally followed by a
 * straight tangent leg. Designed paths are emitted as ordinary survey
 * records, so the existing minimum-curvature desurvey reproduces the arc
 * exactly and the plan flows through publish/QA/approval unchanged.
 */

export type PathDesignType = "straight" | "build-and-hold" | "curve-to-target";

export const PATH_DESIGN_LABELS: Record<PathDesignType, string> = {
  straight: "Straight to target",
  "build-and-hold": "Build and hold",
  "curve-to-target": "Curve to target (min dogleg)",
};

export type WellPathDesignInput = {
  startMd: number;
  startDip: number;
  startAzimuth: number;
  startPosition: Vec3;
  targetEnu: Vec3;
  surveyInterval: number;
  maxDls: number;
  /** Straight section length before the curve starts (build-and-hold). */
  kickoffLengthM?: number;
  /** Build rate for build-and-hold (deg/30 m). Defaults to maxDls. */
  buildRateDegPer30m?: number;
};

export type WellPathDesignResult = {
  records: SurveyRecord[];
  feasible: boolean;
  /** Dogleg rate actually used for the curve segment (deg/30 m). */
  usedDlsPer30m: number | null;
  /** Minimum dogleg rate that can reach the target from the curve start. */
  requiredDlsPer30m: number | null;
  /** Total measured depth at the target. */
  finalMd: number | null;
  warnings: string[];
  errors: string[];
};

type PlaneFrame = {
  /** Start direction (unit). */
  t0: Vec3;
  /** In-plane perpendicular pointing toward the target side (unit). */
  up: Vec3;
  /** Along-axis distance to target. */
  x: number;
  /** Perpendicular distance to target (>= 0). */
  y: number;
};

const COLLINEAR_EPS = 1e-6;

function planeFrame(start: Vec3, dip: number, azimuth: number, target: Vec3): PlaneFrame | null {
  const t0 = vectorFromDipAz(dip, azimuth);
  const delta = subtract(target, start);
  if (vectorLength(delta) < COLLINEAR_EPS) return null;

  const x = delta.e * t0.e + delta.n * t0.n + delta.d * t0.d;
  const perp = subtract(delta, scale(t0, x));
  const y = vectorLength(perp);
  if (y < COLLINEAR_EPS) {
    return { t0, up: { e: 0, n: 0, d: 0 }, x, y: 0 };
  }
  return { t0, up: normalizeVector(perp), x, y };
}

/**
 * Solve arc angle and tangent length for a circle of radius R starting at
 * the origin heading +x, curving toward +y, that reaches (x, y) via a
 * tangent line. Returns null when the target is inside the circle.
 */
function solveArcTangent(
  x: number,
  y: number,
  radius: number
): { arcAngleRad: number; tangentLengthM: number } | null {
  const ux = x;
  const uy = y - radius;
  const dist = Math.hypot(ux, uy);
  // discriminant == dist^2 - radius^2, but computed as x^2 + y^2 - 2*y*radius to
  // avoid catastrophic cancellation when radius is enormous (near-on-axis
  // targets need a near-infinite turn radius). Forming radius^2 and subtracting
  // two huge near-equal numbers previously lost all precision and could miss the
  // target by metres.
  const discriminant = x * x + y * y - 2 * y * radius;
  if (discriminant < -1e-6) return null; // target strictly inside the turn circle
  const tangentLengthM = Math.sqrt(Math.max(0, discriminant));
  const phi = Math.atan2(uy, ux);
  let arcAngleRad = phi + Math.asin(Math.min(1, radius / dist));
  // Normalize to forward travel (0..2pi); reject backward solutions later.
  if (arcAngleRad < 0) arcAngleRad += Math.PI * 2;
  return { arcAngleRad, tangentLengthM };
}

/** Gentlest dogleg rate (deg/30 m) able to reach the in-plane target. */
export function requiredDoglegRate(x: number, y: number): number | null {
  if (y < COLLINEAR_EPS) return 0;
  const maxRadius = (x * x + y * y) / (2 * y);
  if (maxRadius <= 0) return null;
  return (30 / maxRadius) * RAD;
}

function radiusFromRate(ratePer30m: number): number {
  return 30 / (ratePer30m * DEG);
}

function emitRecords(
  input: WellPathDesignInput,
  frame: PlaneFrame,
  kickoffLengthM: number,
  radius: number,
  arcAngleRad: number,
  tangentLengthM: number
): SurveyRecord[] {
  const { t0, up } = frame;
  const arcLengthM = radius * arcAngleRad;
  const totalLengthM = kickoffLengthM + arcLengthM + tangentLengthM;
  const startMd = input.startMd;
  const interval = Math.max(1, input.surveyInterval);

  const directionAt = (s: number): Vec3 => {
    if (s <= kickoffLengthM) return t0;
    const along = Math.min(arcLengthM, s - kickoffLengthM);
    const theta = along / radius;
    return normalizeVector(
      add(scale(t0, Math.cos(theta)), scale(up, Math.sin(theta)))
    );
  };

  const records: SurveyRecord[] = [];
  const pushAt = (s: number) => {
    const aim = dipAzFromVector(directionAt(s));
    records.push({ md: startMd + s, dip: aim.dip, azimuth: aim.azimuth });
  };

  // Snap the nearest existing station to an exact key MD (arc end / target), or
  // insert one if none is close. Snapping rather than inserting avoids creating a
  // sub-interval segment that would otherwise carry a spurious DLS spike, while
  // still guaranteeing the plan lands exactly on the arc end and the target.
  const ensureStation = (atS: number) => {
    const md = startMd + atS;
    // Already represented by a coincident station: nothing to pin. (Avoids
    // inserting a micron-spaced station that would explode the desurveyed DLS.)
    if (records.some((r) => Math.abs(r.md - md) < 1e-3)) return;
    const aim = dipAzFromVector(directionAt(atS));
    // Never consume the mandatory start station — snapping it away would delete
    // the path origin and shift the whole trajectory (a tiny-kickoff hazard).
    const idx = records.findIndex(
      (r) => Math.abs(r.md - md) < 0.5 && Math.abs(r.md - startMd) > 1e-6
    );
    if (idx >= 0) records[idx] = { md, dip: aim.dip, azimuth: aim.azimuth };
    else records.push({ md, dip: aim.dip, azimuth: aim.azimuth });
  };

  pushAt(0);
  let s = interval;
  while (s < totalLengthM - 1e-6) {
    pushAt(s);
    s += interval;
  }
  // Pin every direction discontinuity so min-curvature never smears a segment
  // across one: the kickoff->build transition, the build->hold (arc end), and
  // the exact target. Without the kickoff pin, build-and-hold closure drifted
  // up to ~0.2 m.
  if (kickoffLengthM > 1e-6 && kickoffLengthM < totalLengthM - 1e-6) ensureStation(kickoffLengthM);
  const arcEnd = kickoffLengthM + arcLengthM;
  if (arcEnd > 1e-6 && arcEnd < totalLengthM - 1e-6) ensureStation(arcEnd);
  ensureStation(totalLengthM);

  return records.sort((a, b) => a.md - b.md);
}

/**
 * Emit a straight leg that holds the start direction through any kickoff, then
 * points directly at the target. Used for collinear / near-collinear targets
 * where the tangent-circle arc solve is ill-conditioned (near-infinite radius).
 * Closes on the target exactly because the leg is aimed straight at it.
 */
function emitStraightToTarget(
  input: WellPathDesignInput,
  frame: PlaneFrame,
  kickoffLengthM: number
): SurveyRecord[] {
  const { t0, up, x, y } = frame;
  const dir = normalizeVector(add(scale(t0, x), scale(up, y)), t0);
  const legLengthM = Math.hypot(x, y);
  const totalLengthM = kickoffLengthM + legLengthM;
  const startMd = input.startMd;
  const interval = Math.max(1, input.surveyInterval);
  const directionAt = (s: number): Vec3 => (s <= kickoffLengthM ? t0 : dir);

  const records: SurveyRecord[] = [];
  const pushAt = (s: number) => {
    const aim = dipAzFromVector(directionAt(s));
    records.push({ md: startMd + s, dip: aim.dip, azimuth: aim.azimuth });
  };

  const ensureStation = (atS: number) => {
    const md = startMd + atS;
    if (records.some((r) => Math.abs(r.md - md) < 1e-3)) return;
    const aim = dipAzFromVector(directionAt(atS));
    const idx = records.findIndex(
      (r) => Math.abs(r.md - md) < 0.5 && Math.abs(r.md - startMd) > 1e-6
    );
    if (idx >= 0) records[idx] = { md, dip: aim.dip, azimuth: aim.azimuth };
    else records.push({ md, dip: aim.dip, azimuth: aim.azimuth });
  };

  pushAt(0);
  let s = interval;
  while (s < totalLengthM - 1e-6) {
    pushAt(s);
    s += interval;
  }
  if (kickoffLengthM > 1e-6 && kickoffLengthM < totalLengthM - 1e-6) ensureStation(kickoffLengthM);
  ensureStation(totalLengthM);
  return records.sort((a, b) => a.md - b.md);
}

export function designWellPath(
  designType: PathDesignType,
  input: WellPathDesignInput
): WellPathDesignResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const fail = (message: string): WellPathDesignResult => ({
    records: [],
    feasible: false,
    usedDlsPer30m: null,
    requiredDlsPer30m: null,
    finalMd: null,
    warnings,
    errors: [...errors, message],
  });

  if (designType === "straight") {
    return fail("Use buildStraightPlan for straight designs.");
  }

  const kickoffLengthM =
    designType === "build-and-hold" ? Math.max(0, input.kickoffLengthM ?? 0) : 0;

  const curveStart = add(
    input.startPosition,
    scale(vectorFromDipAz(input.startDip, input.startAzimuth), kickoffLengthM)
  );

  const frame = planeFrame(
    curveStart,
    input.startDip,
    input.startAzimuth,
    input.targetEnu
  );
  if (!frame) {
    return fail("Target coincides with the curve start point — nothing to design.");
  }

  // Treat the target as collinear when its perpendicular offset is negligible
  // relative to the along-axis distance. Below this the arc/tangent solve has a
  // near-infinite turn radius and is numerically ill-conditioned, so a straight
  // leg aimed at the target is both correct and exact.
  if (frame.y < COLLINEAR_EPS || frame.y < 5e-3 * Math.abs(frame.x)) {
    if (frame.x <= 0) {
      return fail("Target lies behind the start direction — cannot design a forward path.");
    }
    // Target effectively on the start direction: a straight plan is correct.
    warnings.push("Target is collinear with the start direction — generated a straight path.");
    const records = emitStraightToTarget(input, frame, kickoffLengthM);
    return {
      records,
      feasible: true,
      usedDlsPer30m: 0,
      requiredDlsPer30m: 0,
      finalMd: records[records.length - 1]?.md ?? null,
      warnings,
      errors,
    };
  }

  const requiredRate = requiredDoglegRate(frame.x, frame.y);
  if (requiredRate == null || !Number.isFinite(requiredRate) || requiredRate <= 0) {
    return fail("Could not solve a curve to this target from the start direction.");
  }

  let usedRate: number;
  if (designType === "curve-to-target") {
    if (requiredRate > input.maxDls + 1e-9) {
      return fail(
        `Cannot reach target within max DLS ${input.maxDls.toFixed(1)}°/30 m — needs ${requiredRate.toFixed(1)}°/30 m. Increase the DLS limit, move the kickoff, or adjust the target.`
      );
    }
    usedRate = requiredRate;
  } else {
    usedRate = input.buildRateDegPer30m ?? input.maxDls;
    if (usedRate <= 0) {
      return fail("Build rate must be greater than zero.");
    }
    if (usedRate > input.maxDls + 1e-9) {
      warnings.push(
        `Build rate ${usedRate.toFixed(1)}°/30 m exceeds the configured max DLS ${input.maxDls.toFixed(1)}°/30 m.`
      );
    }
    if (usedRate < requiredRate - 1e-9) {
      return fail(
        `Build rate ${usedRate.toFixed(1)}°/30 m cannot reach the target from this kickoff — needs at least ${requiredRate.toFixed(1)}°/30 m. Increase the build rate or move the kickoff shallower.`
      );
    }
  }

  const radius = radiusFromRate(usedRate);
  const solution = solveArcTangent(frame.x, frame.y, radius);
  if (!solution) {
    return fail(
      `Target is inside the ${usedRate.toFixed(1)}°/30 m turn circle — reduce the build rate or move the kickoff.`
    );
  }

  const turnDeg = solution.arcAngleRad * RAD;
  if (turnDeg > 180) {
    return fail(
      `Designed curve would turn ${turnDeg.toFixed(0)}° — target is effectively behind the start direction. Adjust collar orientation or target.`
    );
  }
  if (turnDeg > 120) {
    warnings.push(
      `Designed curve turns ${turnDeg.toFixed(0)}° — review whether this trajectory is practical for the planned method.`
    );
  }

  const records = emitRecords(
    input,
    frame,
    kickoffLengthM,
    radius,
    solution.arcAngleRad,
    solution.tangentLengthM
  );

  return {
    records,
    feasible: true,
    usedDlsPer30m: usedRate,
    requiredDlsPer30m: requiredRate,
    finalMd: records[records.length - 1]?.md ?? null,
    warnings,
    errors,
  };
}
