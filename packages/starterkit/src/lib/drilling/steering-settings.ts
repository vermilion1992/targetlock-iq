import { shortestAngle } from "./geometry";
import { interpolateAtMd } from "./desurvey";
import type { PlanCorridorStatus } from "./plan-corridor";
import type {
  RecoveryAction,
  SteeringFeasibility,
  SteeringMethodId,
} from "./steering-types";
import type { Recommendation, SurveyStation } from "./types";
import { buildActionHeroGuidance } from "./steering-feasibility";

export type GearAvailability = {
  natural: boolean;
  parameter: boolean;
  motorNavi: boolean;
  devidrill: boolean;
  wedgeBranch: boolean;
  /** Optional note for reports — not used in math. */
  crewNote?: string;
};

export type SteeringRuleCondition =
  | { type: "plan_offset_gte"; valueM: number }
  | { type: "projected_miss_gte"; valueM: number }
  | { type: "projected_miss_gt_tolerance" }
  | { type: "required_dls_gte"; valueDls: number }
  | { type: "required_dls_gt_max" }
  | { type: "miss_gte_tolerance_multiple"; multiplier: number }
  | { type: "dip_deviation_gte"; valueDeg: number }
  | { type: "azi_deviation_gte"; valueDeg: number }
  | { type: "combined_angle_gte"; valueDeg: number }
  | { type: "outside_corridor" }
  | { type: "no_steering_gear_available" }
  | {
      type: "classification_at_least";
      level: "watch" | "correction" | "steering" | "risk";
    };

export type SteeringRuleGate =
  | { type: "any" }
  | { type: "remaining_gt"; valueM: number }
  | { type: "remaining_lte"; valueM: number }
  | { type: "above_md"; valueM: number }
  | { type: "below_md"; valueM: number }
  | { type: "first_m"; valueM: number };

export type SteeringRuleAction =
  | "hold"
  | "watch"
  | "correct_now"
  | "steering_review"
  | "wedge_branch_review"
  | "supervisor_review";

export type SteeringRule = {
  id: string;
  enabled: boolean;
  label: string;
  condition: SteeringRuleCondition;
  gate: SteeringRuleGate;
  action: SteeringRuleAction;
  nextIntervalM?: number;
  allowedMethods?: SteeringMethodId[];
  message?: string;
};

export type SteeringSettings = {
  gear: GearAvailability;
  rules: SteeringRule[];
};

export type SteeringPolicyMatch = {
  ruleId: string;
  ruleLabel: string;
  action: SteeringRuleAction;
  message: string;
  nextIntervalM?: number;
  allowedMethods?: SteeringMethodId[];
};

const CLASS_RANK: Record<string, number> = {
  "on-track": 0,
  watch: 1,
  correction: 2,
  steer: 3,
  risk: 4,
};

const RULE_LEVEL_RANK: Record<
  "watch" | "correction" | "steering" | "risk",
  number
> = {
  watch: 1,
  correction: 2,
  steering: 3,
  risk: 4,
};

export const DEFAULT_GEAR: GearAvailability = {
  natural: true,
  parameter: true,
  motorNavi: false,
  devidrill: false,
  wedgeBranch: true,
  crewNote: "",
};

function ruleId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const DEFAULT_STEERING_RULES: SteeringRule[] = [
  {
    id: "default-early-angle",
    enabled: true,
    label: "Early large angular deviation",
    condition: { type: "combined_angle_gte", valueDeg: 6 },
    gate: { type: "first_m", valueM: 150 },
    action: "supervisor_review",
    message:
      "Early large deviation from plan — smooth recovery unlikely without navi. Supervisor review before drilling ahead.",
  },
  {
    id: "default-early-dip",
    enabled: true,
    label: "Early dip off plan",
    condition: { type: "dip_deviation_gte", valueDeg: 5 },
    gate: { type: "first_m", valueM: 200 },
    action: "supervisor_review",
    message:
      "Large early dip deviation — confirm surveys and review steering plan before continuing.",
  },
  {
    id: "default-no-navi-recovery",
    enabled: true,
    label: "Correction needs navi but not on site",
    condition: { type: "no_steering_gear_available" },
    gate: { type: "any" },
    action: "supervisor_review",
    allowedMethods: ["natural", "parameter"],
    message:
      "Required correction exceeds parameter-only capability and motor/navi is not on site — supervisor review.",
  },
  {
    id: "default-dls-over-max",
    enabled: true,
    label: "Required DLS exceeds configured max",
    condition: { type: "required_dls_gt_max" },
    gate: { type: "any" },
    action: "steering_review",
    nextIntervalM: 15,
    message:
      "Required DLS exceeds the configured correction window — review steering options before the next full interval.",
  },
  {
    id: "default-wedge-dls",
    enabled: true,
    label: "Required DLS exceeds wedge threshold",
    condition: { type: "required_dls_gte", valueDls: 2.5 },
    gate: { type: "any" },
    action: "wedge_branch_review",
    message: "Required correction exceeds smooth in-hole recovery — wedge or branch review.",
  },
  {
    id: "default-steering-class",
    enabled: true,
    label: "Steering classification reached",
    condition: { type: "classification_at_least", level: "steering" },
    gate: { type: "any" },
    action: "steering_review",
    nextIntervalM: 15,
    allowedMethods: ["natural", "parameter"],
    message: "Hole classification requires steering review — do not drill a full interval without approval.",
  },
  {
    id: "default-plan-offset",
    enabled: true,
    label: "Large plan offset with depth remaining",
    condition: { type: "plan_offset_gte", valueM: 4 },
    gate: { type: "remaining_gt", valueM: 100 },
    action: "steering_review",
    allowedMethods: ["natural", "parameter"],
    message:
      "Hole is materially off the planned path — review steering options before the next interval.",
  },
  {
    id: "default-miss-multiple",
    enabled: true,
    label: "Projected miss well outside tolerance",
    condition: { type: "miss_gte_tolerance_multiple", multiplier: 2 },
    gate: { type: "any" },
    action: "supervisor_review",
    message:
      "Projected miss is more than double the target tolerance — supervisor review before drilling ahead.",
  },
  {
    id: "default-late-miss",
    enabled: true,
    label: "Miss with limited depth to target",
    condition: { type: "projected_miss_gt_tolerance" },
    gate: { type: "remaining_lte", valueM: 60 },
    action: "supervisor_review",
    message: "Limited depth remaining with projected miss outside tolerance — supervisor review.",
  },
  {
    id: "default-corridor-watch",
    enabled: true,
    label: "Outside planned corridor",
    condition: { type: "outside_corridor" },
    gate: { type: "any" },
    action: "watch",
    nextIntervalM: 15,
    message: "Outside planned path corridor — shorten survey interval and monitor trend.",
  },
];

export const DEFAULT_STEERING_SETTINGS: SteeringSettings = {
  gear: { ...DEFAULT_GEAR },
  rules: DEFAULT_STEERING_RULES.map((r) => ({ ...r })),
};

export function normalizeGearAvailability(
  partial?: Partial<GearAvailability> | null
): GearAvailability {
  const base = DEFAULT_GEAR;
  if (!partial) return { ...base };
  return {
    natural: partial.natural ?? base.natural,
    parameter: partial.parameter ?? base.parameter,
    motorNavi: partial.motorNavi ?? base.motorNavi,
    devidrill: partial.devidrill ?? base.devidrill,
    wedgeBranch: partial.wedgeBranch ?? base.wedgeBranch,
    crewNote: partial.crewNote?.trim() ?? "",
  };
}

export function normalizeSteeringRule(rule: SteeringRule): SteeringRule {
  return {
    ...rule,
    id: rule.id || ruleId(),
    label: rule.label?.trim() || "Steering rule",
    enabled: rule.enabled !== false,
    message: rule.message?.trim() ?? "",
    allowedMethods: rule.allowedMethods?.length ? [...rule.allowedMethods] : undefined,
    nextIntervalM:
      rule.nextIntervalM != null && Number.isFinite(rule.nextIntervalM)
        ? Math.max(1, rule.nextIntervalM)
        : undefined,
  };
}

export function mergeSteeringRules(saved?: SteeringRule[] | null): SteeringRule[] {
  const byId = new Map(
    (saved ?? []).map((r) => [r.id, normalizeSteeringRule(r)])
  );
  return DEFAULT_STEERING_RULES.map((def) => {
    const stored = byId.get(def.id);
    if (!stored) return { ...def };
    return normalizeSteeringRule({
      ...def,
      ...stored,
      id: def.id,
    });
  });
}

export function normalizeSteeringSettings(
  partial?: Partial<SteeringSettings> | null
): SteeringSettings {
  if (!partial) return structuredClone(DEFAULT_STEERING_SETTINGS);
  return {
    gear: normalizeGearAvailability(partial.gear),
    rules: mergeSteeringRules(partial.rules),
  };
}

export function isGearMethodAvailable(
  methodId: SteeringMethodId,
  gear: GearAvailability
): boolean {
  switch (methodId) {
    case "natural":
      return gear.natural;
    case "parameter":
      return gear.parameter;
    case "motor_navi":
      return gear.motorNavi;
    case "devidrill":
      return gear.devidrill;
    case "wedge_branch":
      return gear.wedgeBranch;
    case "shorten_interval":
      return true;
    default:
      return true;
  }
}

function planDeviationsAtMd(
  current: SurveyStation,
  planStations: SurveyStation[]
): { dipDeg: number; aziDeg: number; combinedDeg: number } {
  const planAt = interpolateAtMd(planStations, current.md);
  if (!planAt) return { dipDeg: 0, aziDeg: 0, combinedDeg: 0 };
  const dipDeg = Math.abs(current.dip - planAt.dip);
  const aziDeg = Math.abs(shortestAngle(current.azimuth, planAt.azimuth));
  return { dipDeg, aziDeg, combinedDeg: dipDeg + aziDeg };
}

function gateMatches(gate: SteeringRuleGate, reco: Recommendation): boolean {
  const md = reco.current.md;
  const remaining = reco.remaining;
  switch (gate.type) {
    case "any":
      return true;
    case "remaining_gt":
      return remaining > gate.valueM;
    case "remaining_lte":
      return remaining <= gate.valueM && remaining > 0;
    case "above_md":
      return md > gate.valueM;
    case "below_md":
      return md < gate.valueM;
    case "first_m":
      return md <= gate.valueM;
    default:
      return true;
  }
}

function needsSteeringGear(reco: Recommendation, gear: GearAvailability): boolean {
  return (
    reco.dlsRequired > reco.maxDls * 0.75 &&
    reco.classification.className !== "on-track"
  );
}

function noSteeringGearAvailable(
  reco: Recommendation,
  gear: GearAvailability
): boolean {
  if (gear.motorNavi || gear.devidrill) return false;
  return needsSteeringGear(reco, gear);
}

function conditionMatches(
  condition: SteeringRuleCondition,
  reco: Recommendation,
  planStations: SurveyStation[],
  corridorStatus: PlanCorridorStatus | null | undefined,
  gear: GearAvailability
): boolean {
  const dev =
    planStations.length ?
      planDeviationsAtMd(reco.current, planStations)
    : { dipDeg: 0, aziDeg: 0, combinedDeg: 0 };

  switch (condition.type) {
    case "plan_offset_gte":
      return reco.planOffset >= condition.valueM;
    case "projected_miss_gte":
      return reco.miss >= condition.valueM;
    case "projected_miss_gt_tolerance":
      return reco.miss > reco.tolerance;
    case "required_dls_gte":
      return (
        Number.isFinite(reco.dlsRequired) && reco.dlsRequired >= condition.valueDls
      );
    case "required_dls_gt_max":
      return Number.isFinite(reco.dlsRequired) && reco.dlsRequired > reco.maxDls + 0.05;
    case "miss_gte_tolerance_multiple":
      return reco.miss >= reco.tolerance * condition.multiplier;
    case "no_steering_gear_available":
      return noSteeringGearAvailable(reco, gear);
    case "dip_deviation_gte":
      return dev.dipDeg >= condition.valueDeg;
    case "azi_deviation_gte":
      return dev.aziDeg >= condition.valueDeg;
    case "combined_angle_gte":
      return dev.combinedDeg >= condition.valueDeg;
    case "outside_corridor":
      return corridorStatus?.outsidePlannedCorridor === true;
    case "classification_at_least": {
      const current = CLASS_RANK[reco.classification.className] ?? 0;
      const need = RULE_LEVEL_RANK[condition.level] ?? 0;
      return current >= need;
    }
    default:
      return false;
  }
}

export function evaluateSteeringPolicy(
  reco: Recommendation | null,
  planStations: SurveyStation[],
  corridorStatus: PlanCorridorStatus | null | undefined,
  settings?: Partial<SteeringSettings> | null
): SteeringPolicyMatch | null {
  if (!reco) return null;
  const normalized = normalizeSteeringSettings(settings);
  for (const rule of normalized.rules) {
    if (!rule.enabled) continue;
    if (!gateMatches(rule.gate, reco)) continue;
    if (!conditionMatches(rule.condition, reco, planStations, corridorStatus, normalized.gear)) continue;
    return {
      ruleId: rule.id,
      ruleLabel: rule.label,
      action: rule.action,
      message:
        rule.message ||
        `${rule.label} — review steering policy before the next interval.`,
      nextIntervalM: rule.nextIntervalM,
      allowedMethods: rule.allowedMethods,
    };
  }
  return null;
}

function actionFromRule(action: SteeringRuleAction): RecoveryAction {
  switch (action) {
    case "hold":
      return "On track";
    case "watch":
      return "Watch";
    case "correct_now":
      return "Correct now";
    case "steering_review":
      return "Steering review";
    case "wedge_branch_review":
      return "Wedge or branch review";
    case "supervisor_review":
      return "Supervisor review";
    default:
      return "Steering review";
  }
}

function actionRank(action: RecoveryAction): number {
  switch (action) {
    case "On track":
      return 0;
    case "Watch":
      return 1;
    case "Correct now":
      return 2;
    case "Steering review":
      return 3;
    case "Supervisor review":
      return 4;
    case "Wedge or branch review":
      return 5;
    default:
      return 2;
  }
}

function pickStrongerAction(a: RecoveryAction, b: RecoveryAction): RecoveryAction {
  return actionRank(a) >= actionRank(b) ? a : b;
}

export function applySteeringPolicy(
  steering: SteeringFeasibility,
  reco: Recommendation,
  policy: SteeringPolicyMatch | null,
  gear: GearAvailability
): SteeringFeasibility {
  let currentAction = steering.currentAction;
  let bestMethodId = steering.bestMethodId;
  let bestMethodLabel = steering.bestMethodLabel;
  let methods = steering.methods.map((m) => ({ ...m }));

  methods = methods.map((row) => {
    if (!isGearMethodAvailable(row.id, gear)) {
      return {
        ...row,
        feasible: false,
        phrase: `${row.label} not available on site — disabled in steering settings.`,
      };
    }
    if (policy?.allowedMethods?.length && !policy.allowedMethods.includes(row.id)) {
      return {
        ...row,
        feasible: false,
        phrase: `${row.label} not permitted by active steering rule.`,
      };
    }
    return row;
  });

  const feasibleSmooth = methods.filter(
    (m) =>
      m.feasible &&
      m.id !== "shorten_interval" &&
      m.id !== "wedge_branch"
  );
  const bestFeasible = feasibleSmooth[0];

  if (policy) {
    currentAction = pickStrongerAction(
      steering.currentAction,
      actionFromRule(policy.action)
    );
    if (bestFeasible) {
      bestMethodId = bestFeasible.id;
      bestMethodLabel = bestFeasible.label;
    } else if (policy.action === "supervisor_review") {
      bestMethodId = "wedge_branch";
      bestMethodLabel = "Supervisor review";
    }
  } else if (!feasibleSmooth.length && currentAction !== "On track") {
    const needsSteering = reco.dlsRequired > reco.maxDls * 0.5;
    if (
      currentAction === "Wedge or branch review" ||
      reco.classification.className === "risk"
    ) {
      bestMethodId = "wedge_branch";
      bestMethodLabel = "Wedge / branch review";
    } else if (needsSteering) {
      currentAction = pickStrongerAction(currentAction, "Steering review");
      bestMethodId = "wedge_branch";
      bestMethodLabel = "Gear limited";
    }
  } else if (bestFeasible && currentAction !== "On track") {
    bestMethodId = bestFeasible.id;
    bestMethodLabel = bestFeasible.label;
  }

  const bestRow = methods.find((m) => m.id === bestMethodId);
  const heroMethod = buildActionHeroGuidance(currentAction, reco, bestRow);

  return {
    ...steering,
    currentAction,
    bestMethodId,
    bestMethodLabel,
    methods,
    escalationPhrase: steering.escalationPhrase,
    simple: {
      ...steering.simple,
      currentAction,
      bestMethod: heroMethod,
      escalation: steering.escalationPhrase,
    },
  };
}

export function createSteeringRule(
  partial?: Partial<Omit<SteeringRule, "id">> & { id?: string }
): SteeringRule {
  return normalizeSteeringRule({
    id: partial?.id ?? ruleId(),
    enabled: partial?.enabled ?? true,
    label: partial?.label ?? "New rule",
    condition: partial?.condition ?? { type: "plan_offset_gte", valueM: 4 },
    gate: partial?.gate ?? { type: "any" },
    action: partial?.action ?? "steering_review",
    nextIntervalM: partial?.nextIntervalM,
    allowedMethods: partial?.allowedMethods,
    message: partial?.message ?? "",
  });
}

export function formatSteeringSettingsSummary(settings: SteeringSettings): string[] {
  const g = settings.gear;
  const gearParts: string[] = [];
  if (g.natural) gearParts.push("natural");
  if (g.parameter) gearParts.push("parameter");
  if (g.motorNavi) gearParts.push("motor/navi");
  if (g.devidrill) gearParts.push("DeviDrill");
  if (g.wedgeBranch) gearParts.push("wedge/branch");
  const lines = [`Gear on site: ${gearParts.join(", ") || "none"}`];
  if (g.crewNote) lines.push(`Crew note: ${g.crewNote}`);
  const enabledRules = settings.rules.filter((r) => r.enabled);
  lines.push(`${enabledRules.length} active steering rule(s)`);
  return lines;
}
