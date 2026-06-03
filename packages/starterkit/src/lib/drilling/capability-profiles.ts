import type { CapabilityProfile, SteeringMethodId } from "./steering-types";

/** Configurable assumptions — site-specific limits may differ. */
const DEFAULT_CAPABILITY_PROFILES: CapabilityProfile[] = [
  {
    id: "natural",
    label: "Natural correction",
    dlsMin: 0,
    dlsMax: 1.5,
    confidence: "Low",
    isSteeringMethod: true,
    note: "Typical rig steering without parameter or downhole tool changes (assumption 0.5–1.5°/30 m).",
    feasiblePhrase: "Natural correction may still recover the hole.",
    reviewPhrase: "Natural correction is unlikely at current drift.",
  },
  {
    id: "parameter",
    label: "Parameter correction",
    dlsMin: 0.5,
    dlsMax: 2.5,
    confidence: "Medium",
    isSteeringMethod: true,
    note: "WOB, RPM, pump, and rod handling adjusted within rig capability (assumption 1–2.5°/30 m).",
    feasiblePhrase: "Parameter correction may be sufficient if ground and rig allow.",
    reviewPhrase: "Parameter correction alone may be marginal.",
  },
  {
    id: "shorten_interval",
    label: "Shorten survey interval",
    dlsMin: 0,
    dlsMax: 99,
    confidence: "Medium",
    isSteeringMethod: false,
    note: "Risk control — earlier survey catches drift sooner; not a steering method by itself.",
    feasiblePhrase: "Shorten the next survey interval to confirm trend.",
    reviewPhrase: "Consider a shorter survey interval while reviewing steering options.",
  },
  {
    id: "motor_navi",
    label: "Motor / Navi review",
    dlsMin: 1.5,
    dlsMax: 5,
    confidence: "Medium",
    isSteeringMethod: true,
    note: "Downhole motor or navigation tool — capability depends on hole size, ground, and contractor.",
    feasiblePhrase: "Motor/Navi may be required to recover within remaining depth.",
    reviewPhrase: "Motor/Navi review recommended if the next survey remains outside tolerance.",
  },
  {
    id: "devidrill",
    label: "DeviDrill review",
    dlsMin: 4,
    dlsMax: 9,
    confidence: "Low",
    isSteeringMethod: true,
    note: "Directional core barrel / DeviDrill — default assumption 5–9°/30 m, editable per site.",
    feasiblePhrase: "DeviDrill may be considered where ground and hole size allow.",
    reviewPhrase: "DeviDrill review recommended for aggressive correction needs.",
  },
  {
    id: "wedge_branch",
    label: "Wedge / branch review",
    dlsMin: 0,
    dlsMax: 99,
    confidence: "Low",
    isSteeringMethod: true,
    note: "Sidetrack or branch — not smooth in-hole recovery.",
    feasiblePhrase: "Wedge/branch review recommended; smooth recovery is unlikely.",
    reviewPhrase: "Wedge/branch review recommended; smooth recovery is unlikely.",
  },
];

export function cloneDefaultProfiles(): CapabilityProfile[] {
  return DEFAULT_CAPABILITY_PROFILES.map((p) => ({ ...p }));
}

export { DEFAULT_CAPABILITY_PROFILES };

export function getCapabilityProfile(id: SteeringMethodId): CapabilityProfile {
  return (
    DEFAULT_CAPABILITY_PROFILES.find((p) => p.id === id) ??
    DEFAULT_CAPABILITY_PROFILES[0]
  );
}
