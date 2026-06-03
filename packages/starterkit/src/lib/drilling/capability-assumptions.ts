import {
  DEFAULT_CAPABILITY_PROFILES,
  cloneDefaultProfiles,
} from "./capability-profiles";
import type { CapabilityProfile, SteeringMethodId } from "./steering-types";

/** Per-hole editable DLS assumptions — not guaranteed tool performance. */
export type CapabilityAssumptions = {
  naturalDlsMin: number;
  naturalDlsMax: number;
  parameterDlsMin: number;
  parameterDlsMax: number;
  motorNaviDlsMin: number;
  motorNaviDlsMax: number;
  devidrillDlsMin: number;
  devidrillDlsMax: number;
  /** Required DLS above this triggers wedge/branch review wording. */
  wedgeReviewThresholdDls: number;
};

export const DEFAULT_CAPABILITY_ASSUMPTIONS: CapabilityAssumptions = {
  naturalDlsMin: 0,
  naturalDlsMax: 1.5,
  parameterDlsMin: 0.5,
  parameterDlsMax: 2.5,
  motorNaviDlsMin: 1.5,
  motorNaviDlsMax: 5,
  devidrillDlsMin: 4,
  devidrillDlsMax: 9,
  wedgeReviewThresholdDls: 2.5,
};

const EDITABLE_METHOD_IDS: SteeringMethodId[] = [
  "natural",
  "parameter",
  "motor_navi",
  "devidrill",
];

function clampRange(min: number, max: number): { dlsMin: number; dlsMax: number } {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return {
    dlsMin: Math.max(0, lo),
    dlsMax: Math.max(lo, hi),
  };
}

export function normalizeCapabilityAssumptions(
  input?: Partial<CapabilityAssumptions> | null
): CapabilityAssumptions {
  const base = DEFAULT_CAPABILITY_ASSUMPTIONS;
  if (!input) return { ...base };

  const natural = clampRange(
    input.naturalDlsMin ?? base.naturalDlsMin,
    input.naturalDlsMax ?? base.naturalDlsMax
  );
  const parameter = clampRange(
    input.parameterDlsMin ?? base.parameterDlsMin,
    input.parameterDlsMax ?? base.parameterDlsMax
  );
  const motor = clampRange(
    input.motorNaviDlsMin ?? base.motorNaviDlsMin,
    input.motorNaviDlsMax ?? base.motorNaviDlsMax
  );
  const devidrill = clampRange(
    input.devidrillDlsMin ?? base.devidrillDlsMin,
    input.devidrillDlsMax ?? base.devidrillDlsMax
  );

  return {
    naturalDlsMin: natural.dlsMin,
    naturalDlsMax: natural.dlsMax,
    parameterDlsMin: parameter.dlsMin,
    parameterDlsMax: parameter.dlsMax,
    motorNaviDlsMin: motor.dlsMin,
    motorNaviDlsMax: motor.dlsMax,
    devidrillDlsMin: devidrill.dlsMin,
    devidrillDlsMax: devidrill.dlsMax,
    wedgeReviewThresholdDls: Math.max(
      0,
      input.wedgeReviewThresholdDls ?? base.wedgeReviewThresholdDls
    ),
  };
}

export function assumptionsFromProfiles(
  profiles: CapabilityProfile[] = DEFAULT_CAPABILITY_PROFILES
): CapabilityAssumptions {
  const find = (id: SteeringMethodId) => profiles.find((p) => p.id === id);
  const natural = find("natural")!;
  const parameter = find("parameter")!;
  const motor = find("motor_navi")!;
  const devidrill = find("devidrill")!;
  return normalizeCapabilityAssumptions({
    naturalDlsMin: natural.dlsMin,
    naturalDlsMax: natural.dlsMax,
    parameterDlsMin: parameter.dlsMin,
    parameterDlsMax: parameter.dlsMax,
    motorNaviDlsMin: motor.dlsMin,
    motorNaviDlsMax: motor.dlsMax,
    devidrillDlsMin: devidrill.dlsMin,
    devidrillDlsMax: devidrill.dlsMax,
    wedgeReviewThresholdDls: DEFAULT_CAPABILITY_ASSUMPTIONS.wedgeReviewThresholdDls,
  });
}

export function profilesFromAssumptions(
  assumptions?: Partial<CapabilityAssumptions> | null
): CapabilityProfile[] {
  const a = normalizeCapabilityAssumptions(assumptions);
  const profiles = cloneDefaultProfiles();
  const patch = (id: SteeringMethodId, dlsMin: number, dlsMax: number) => {
    const row = profiles.find((p) => p.id === id);
    if (row) {
      row.dlsMin = dlsMin;
      row.dlsMax = dlsMax;
    }
  };
  patch("natural", a.naturalDlsMin, a.naturalDlsMax);
  patch("parameter", a.parameterDlsMin, a.parameterDlsMax);
  patch("motor_navi", a.motorNaviDlsMin, a.motorNaviDlsMax);
  patch("devidrill", a.devidrillDlsMin, a.devidrillDlsMax);
  return profiles;
}

export function formatAssumptionsSummary(
  assumptions?: Partial<CapabilityAssumptions> | null
): string[] {
  const a = normalizeCapabilityAssumptions(assumptions);
  return [
    `Natural correction: ${a.naturalDlsMin}–${a.naturalDlsMax}°/30 m`,
    `Parameter correction: ${a.parameterDlsMin}–${a.parameterDlsMax}°/30 m`,
    `Motor / Navi: ${a.motorNaviDlsMin}–${a.motorNaviDlsMax}°/30 m`,
    `DeviDrill: ${a.devidrillDlsMin}–${a.devidrillDlsMax}°/30 m`,
    `Wedge / branch review when required DLS exceeds ${a.wedgeReviewThresholdDls}°/30 m`,
    "Shorten survey interval: risk control only (not a steering method).",
  ];
}

export function assumptionsEqual(
  a: CapabilityAssumptions,
  b: CapabilityAssumptions
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export { EDITABLE_METHOD_IDS };
