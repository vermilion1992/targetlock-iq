import type { Vec3 } from "./types";

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;
export const EPS = 1e-9;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

export function shortestAngle(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.e - b.e, a.n - b.n, a.d - b.d);
}

export function vectorLength(v: Vec3): number {
  return Math.hypot(v.e, v.n, v.d);
}

export function normalizeVector(v: Vec3, fallback?: Vec3): Vec3 {
  const length = vectorLength(v);
  if (length < EPS) return fallback || { e: 0, n: 0, d: 1 };
  return { e: v.e / length, n: v.n / length, d: v.d / length };
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { e: a.e + b.e, n: a.n + b.n, d: a.d + b.d };
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return { e: a.e - b.e, n: a.n - b.n, d: a.d - b.d };
}

export function scale(v: Vec3, amount: number): Vec3 {
  return { e: v.e * amount, n: v.n * amount, d: v.d * amount };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.e * b.e + a.n * b.n + a.d * b.d;
}

export function vectorFromDipAz(dip: number, azimuth: number): Vec3 {
  const dipRad = dip * DEG;
  const aziRad = azimuth * DEG;
  const horizontal = Math.cos(dipRad);
  return {
    e: horizontal * Math.sin(aziRad),
    n: horizontal * Math.cos(aziRad),
    d: -Math.sin(dipRad),
  };
}

export function dipAzFromVector(vector: Vec3): { dip: number; azimuth: number } {
  const v = normalizeVector(vector);
  const horizontal = Math.hypot(v.e, v.n);
  return {
    dip: -Math.atan2(v.d, horizontal) * RAD,
    azimuth: normalizeAngle(Math.atan2(v.e, v.n) * RAD),
  };
}

export function doglegDeg(a: Vec3, b: Vec3): number {
  const av = normalizeVector(a);
  const bv = normalizeVector(b);
  return Math.acos(clamp(dot(av, bv), -1, 1)) * RAD;
}

export function slerpDirection(a: Vec3, b: Vec3, t: number): Vec3 {
  const av = normalizeVector(a);
  const bv = normalizeVector(b);
  const angle = Math.acos(clamp(dot(av, bv), -1, 1));
  if (angle < EPS) return av;
  const sinAngle = Math.sin(angle);
  const left = scale(av, Math.sin((1 - t) * angle) / sinAngle);
  const right = scale(bv, Math.sin(t * angle) / sinAngle);
  return normalizeVector(add(left, right), av);
}

export function minCurveDisplacement(
  fromRecord: { dip: number; azimuth: number },
  toRecord: { dip: number; azimuth: number },
  length: number
): Vec3 {
  const v1 = vectorFromDipAz(fromRecord.dip, fromRecord.azimuth);
  const v2 = vectorFromDipAz(toRecord.dip, toRecord.azimuth);
  const angle = Math.acos(clamp(dot(v1, v2), -1, 1));
  const ratioFactor = angle < EPS ? 1 : (2 / angle) * Math.tan(angle / 2);
  return scale(add(v1, v2), (length / 2) * ratioFactor);
}

export type DirectionMetric = { amount: string; direction: string } | "--";

export function directionLabel(
  value: number,
  negativeLabel: string,
  positiveLabel: string
): DirectionMetric {
  if (!Number.isFinite(value)) return "--";
  if (Math.abs(value) < 0.05) return { amount: "0.0 m", direction: "center" };
  return {
    amount: `${Math.abs(value).toFixed(1)} m`,
    direction: value < 0 ? negativeLabel : positiveLabel,
  };
}
