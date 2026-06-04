import { buildStations, interpolateAtMd } from "./desurvey";
import {
  dipAzFromVector,
  distance,
  doglegDeg,
  normalizeVector,
  subtract,
  vectorFromDipAz,
} from "./geometry";
import type { BranchMethod, BranchTarget } from "./branch-program-types";
import type { SurveyRecord, SurveyStation, Vec3 } from "./types";

export const DEFAULT_SEPARATION_WARN_M = 5;

export type KickoffStation = SurveyStation & {
  motherDip: number;
  motherAzimuth: number;
};

/** Kickoff on actual mother path — never from plan alone. */
export function kickoffStationFromMother(
  actualRecords: SurveyRecord[],
  kickoffMd: number
): KickoffStation | null {
  if (!actualRecords.length) return null;
  const stations = buildStations(actualRecords);
  const at = interpolateAtMd(stations, kickoffMd);
  if (!at) return null;
  return {
    ...at,
    motherDip: at.dip,
    motherAzimuth: at.azimuth,
  };
}

export function requiredDaughterHeading(
  kickoff: Pick<SurveyStation, "e" | "n" | "d">,
  target: Pick<BranchTarget, "e" | "n" | "d">
): { dip: number; azimuth: number } {
  const vec = subtract(
    { e: target.e, n: target.n, d: target.d },
    { e: kickoff.e, n: kickoff.n, d: kickoff.d }
  );
  return dipAzFromVector(normalizeVector(vec, { e: 0, n: 0, d: 1 }));
}

export function doglegMotherToDaughter(
  motherDip: number,
  motherAzimuth: number,
  daughterDip: number,
  daughterAzimuth: number,
  intervalM = 30
): number {
  const motherDir = vectorFromDipAz(motherDip, motherAzimuth);
  const daughterDir = vectorFromDipAz(daughterDip, daughterAzimuth);
  const dogleg = doglegDeg(motherDir, daughterDir);
  return intervalM > 0 ? dogleg / (intervalM / 30) : 0;
}

export type MethodSuitability = "natural" | "parameter" | "motor-navi" | "devidrill-dcd" | "wedge";

export function methodSuitabilityForDls(requiredDls: number): MethodSuitability {
  if (requiredDls <= 1.5) return "natural";
  if (requiredDls <= 2.5) return "parameter";
  if (requiredDls <= 5) return "motor-navi";
  if (requiredDls <= 9) return "devidrill-dcd";
  return "wedge";
}

export function methodLabel(method: BranchMethod): string {
  const labels: Record<BranchMethod, string> = {
    wedge: "Wedge / branch",
    "motor-navi": "Motor / Navi",
    "devidrill-dcd": "DeviDrill / DCD",
    natural: "Natural correction",
    "planned-sidetrack": "Planned sidetrack",
    "contractor-review": "Contractor review",
  };
  return labels[method];
}

export type FeasibilityClass = "ok" | "review" | "not-recommended";

export function feasibilityClass(
  requiredDls: number,
  preferredMethod?: BranchMethod | "contractor-review"
): FeasibilityClass {
  if (preferredMethod === "contractor-review") return "review";
  const suit = methodSuitabilityForDls(requiredDls);
  if (preferredMethod === "natural" && requiredDls > 2.5) return "not-recommended";
  if (preferredMethod === "motor-navi" && suit === "wedge") return "not-recommended";
  if (preferredMethod === "devidrill-dcd" && requiredDls > 9) return "not-recommended";
  if (preferredMethod === "wedge" && requiredDls <= 2.5) return "review";
  if (requiredDls > 9) return "not-recommended";
  if (requiredDls > 5) return "review";
  return "ok";
}

const DEFAULT_LEG_INTERVAL = 30;

/** Build daughter plan surveys from kickoff on actual mother toward target. */
export function buildDaughterPlanFromKickoff(opts: {
  kickoffMd: number;
  motherActual: SurveyRecord[];
  target: Pick<BranchTarget, "e" | "n" | "d">;
  legLengthM?: number;
  surveyInterval?: number;
  dipBiasPerInterval?: number;
  aziBiasPerInterval?: number;
}): SurveyRecord[] {
  const {
    kickoffMd,
    motherActual,
    target,
    legLengthM = 180,
    surveyInterval = DEFAULT_LEG_INTERVAL,
    dipBiasPerInterval = 0,
    aziBiasPerInterval = 0,
  } = opts;
  const kickoff = kickoffStationFromMother(motherActual, kickoffMd);
  if (!kickoff) return [];
  const heading = requiredDaughterHeading(kickoff, target);
  const rows: SurveyRecord[] = [];
  const steps = Math.ceil(legLengthM / surveyInterval);
  for (let i = 0; i <= steps; i += 1) {
    const md = kickoffMd + i * surveyInterval;
    const t = steps > 0 ? i / steps : 1;
    rows.push({
      md,
      dip:
        kickoff.dip +
        (heading.dip - kickoff.dip) * t +
        dipBiasPerInterval * i,
      azimuth:
        kickoff.azimuth +
        (((heading.azimuth - kickoff.azimuth + 540) % 360) - 180) * t +
        aziBiasPerInterval * i,
    });
  }
  return rows;
}

export type KickoffRankOption = {
  kickoffMd: number;
  requiredDls: number;
  directionalM: number;
  methodSuitability: MethodSuitability;
  daughterDip: number;
  daughterAzimuth: number;
  kickoff: KickoffStation;
  motherSeparationM?: number;
  siblingSeparationM?: number;
  feasibility?: FeasibilityClass;
};

export function rankKickoffOptions(
  actualRecords: SurveyRecord[],
  target: Pick<BranchTarget, "e" | "n" | "d">,
  mdMin: number,
  mdMax: number,
  stepM: number
): KickoffRankOption[] {
  const options: KickoffRankOption[] = [];
  for (let md = mdMin; md <= mdMax + 1e-6; md += stepM) {
    const kickoff = kickoffStationFromMother(actualRecords, md);
    if (!kickoff) continue;
    const heading = requiredDaughterHeading(kickoff, target);
    const requiredDls = doglegMotherToDaughter(
      kickoff.motherDip,
      kickoff.motherAzimuth,
      heading.dip,
      heading.azimuth
    );
    const directionalM = distance(
      { e: kickoff.e, n: kickoff.n, d: kickoff.d },
      { e: target.e, n: target.n, d: target.d }
    );
    options.push({
      kickoffMd: md,
      requiredDls,
      directionalM,
      methodSuitability: methodSuitabilityForDls(requiredDls),
      daughterDip: heading.dip,
      daughterAzimuth: heading.azimuth,
      kickoff,
    });
  }
  return options.sort((a, b) => a.requiredDls - b.requiredDls);
}

export type SeparationResult = {
  minDistanceM: number;
  closestApproachMd: number;
  status: "ok" | "caution" | "warning";
};

function sampleStations(stations: SurveyStation[], stepM = 10): SurveyStation[] {
  if (stations.length < 2) return stations;
  const out: SurveyStation[] = [];
  const mdMin = stations[0].md;
  const mdMax = stations[stations.length - 1].md;
  for (let md = mdMin; md <= mdMax; md += stepM) {
    const s = interpolateAtMd(stations, md);
    if (s) out.push(s);
  }
  const last = stations[stations.length - 1];
  if (out.length === 0 || out[out.length - 1].md < last.md - 1e-6) {
    out.push(last);
  }
  return out;
}

export function separationMotherDaughter(
  motherStations: SurveyStation[],
  daughterStations: SurveyStation[],
  warnThresholdM = DEFAULT_SEPARATION_WARN_M
): SeparationResult {
  const motherSamples = sampleStations(motherStations);
  const daughterSamples = sampleStations(daughterStations);
  let minDistanceM = Infinity;
  let closestApproachMd = 0;

  daughterSamples.forEach((d) => {
    motherSamples.forEach((m) => {
      const dist = distance(
        { e: d.e, n: d.n, d: d.d },
        { e: m.e, n: m.n, d: m.d }
      );
      if (dist < minDistanceM) {
        minDistanceM = dist;
        closestApproachMd = (d.md + m.md) / 2;
      }
    });
  });

  if (!Number.isFinite(minDistanceM)) {
    minDistanceM = 0;
  }

  let status: SeparationResult["status"] = "ok";
  if (minDistanceM < warnThresholdM * 0.6) status = "warning";
  else if (minDistanceM < warnThresholdM) status = "caution";

  return { minDistanceM, closestApproachMd, status };
}

export type DaughterBranchAnalysis = {
  daughterId: string;
  kickoff: KickoffStation | null;
  requiredDls: number;
  methodSuitability: MethodSuitability;
  separation: SeparationResult | null;
  target: BranchTarget | undefined;
};

export function analyzeDaughterBranch(
  motherActual: SurveyRecord[],
  daughter: {
    daughterId: string;
    kickoffMd: number;
    planRecords: SurveyRecord[];
    targetId: string;
  },
  targets: BranchTarget[],
  motherStations: SurveyStation[]
): DaughterBranchAnalysis {
  const target = targets.find((t) => t.id === daughter.targetId);
  const kickoff = kickoffStationFromMother(motherActual, daughter.kickoffMd);
  let requiredDls = 0;
  let methodSuitability: MethodSuitability = "natural";
  if (kickoff && target) {
    const heading = requiredDaughterHeading(kickoff, target);
    requiredDls = doglegMotherToDaughter(
      kickoff.motherDip,
      kickoff.motherAzimuth,
      heading.dip,
      heading.azimuth
    );
    methodSuitability = methodSuitabilityForDls(requiredDls);
  }
  const daughterStations = buildStations(daughter.planRecords);
  const separation =
    daughterStations.length && motherStations.length
      ? separationMotherDaughter(motherStations, daughterStations)
      : null;

  return {
    daughterId: daughter.daughterId,
    kickoff,
    requiredDls,
    methodSuitability,
    separation,
    target,
  };
}

export type KickoffComparisonLabels = {
  bestControl: KickoffRankOption;
  shortestPath: KickoffRankOption;
  lowestDogleg: KickoffRankOption;
};

export function topKickoffComparisons(
  ranked: KickoffRankOption[]
): KickoffComparisonLabels | null {
  if (ranked.length === 0) return null;
  const bestControl = ranked[0]!;
  const shortestPath = [...ranked].sort((a, b) => a.directionalM - b.directionalM)[0]!;
  const lowestDogleg = bestControl;
  return { bestControl, shortestPath, lowestDogleg };
}

export function rankKickoffOptionsWithSeparation(
  actualRecords: SurveyRecord[],
  target: Pick<BranchTarget, "e" | "n" | "d">,
  mdMin: number,
  mdMax: number,
  stepM: number,
  opts?: {
    motherStations?: SurveyStation[];
    siblingPlanRecords?: SurveyRecord[][];
    preferredMethod?: BranchMethod | "contractor-review";
    legLengthM?: number;
  }
): KickoffRankOption[] {
  const motherStations =
    opts?.motherStations ?? buildStations(actualRecords);
  const base = rankKickoffOptions(actualRecords, target, mdMin, mdMax, stepM);

  return base.map((opt) => {
    const plan = buildDaughterPlanFromKickoff({
      kickoffMd: opt.kickoffMd,
      motherActual: actualRecords,
      target,
      legLengthM: opts?.legLengthM ?? 120,
    });
    const daughterStations = buildStations(plan);
    const motherSep = separationMotherDaughter(motherStations, daughterStations);

    let siblingSeparationM = Infinity;
    opts?.siblingPlanRecords?.forEach((siblingPlan) => {
      const sibStations = buildStations(siblingPlan);
      const sep = separationMotherDaughter(daughterStations, sibStations);
      siblingSeparationM = Math.min(siblingSeparationM, sep.minDistanceM);
    });
    if (!Number.isFinite(siblingSeparationM)) siblingSeparationM = 999;

    return {
      ...opt,
      motherSeparationM: motherSep.minDistanceM,
      siblingSeparationM,
      feasibility: feasibilityClass(opt.requiredDls, opts?.preferredMethod),
    };
  });
}

/** Offset target XYZ from a kickoff station along dip/azimuth for distance metres. */
export function offsetTargetFromKickoff(
  kickoff: Pick<SurveyStation, "e" | "n" | "d" | "dip" | "azimuth">,
  distanceM: number,
  dipOffsetDeg = 0,
  aziOffsetDeg = 0
): Vec3 {
  const dir = vectorFromDipAz(kickoff.dip + dipOffsetDeg, kickoff.azimuth + aziOffsetDeg);
  return {
    e: kickoff.e + dir.e * distanceM,
    n: kickoff.n + dir.n * distanceM,
    d: kickoff.d + dir.d * distanceM,
  };
}
