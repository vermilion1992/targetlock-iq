import { distance } from "./geometry";
import { interpolateAtMd } from "./desurvey";
import { findHole, type HoleLibrary } from "./hole-library";
import {
  DEFAULT_SIGMA_FACTOR,
  DEFAULT_TOOL_ERROR_MODEL,
  propagateUncertainty,
  separationFactor,
  uncertaintyAtMd,
  type HoleUncertainty,
} from "./uncertainty";
import {
  getPlannerMapFramePath,
  type PlannerMapFramePath,
} from "./planner-spatial";
import { holesInProgram, plannerPlanType } from "./planner-program";
import { buildStations } from "./desurvey";
import {
  offsetStationsByCollar,
  normalizePlannerCollar,
} from "./coordinate-system";
import type {
  PlannerClearancePair,
  PlannerClearanceRelationship,
  PlannerQaSettings,
  PlannerQaSeverity,
} from "./planner-types";
import type { SavedHoleProject } from "./storage";
import type { SurveyStation } from "./types";

export type ClosestApproach = {
  minDistanceM: number;
  mdA: number;
  mdB: number;
};

function samplePathStations(
  stations: SurveyStation[],
  stepM: number
): SurveyStation[] {
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

export function closestApproach(
  pathA: SurveyStation[],
  pathB: SurveyStation[],
  opts?: {
    sampleIntervalM?: number;
    excludeA?: (station: SurveyStation) => boolean;
    excludeB?: (station: SurveyStation) => boolean;
  }
): ClosestApproach {
  const step = opts?.sampleIntervalM ?? 10;
  const samplesA = samplePathStations(pathA, step).filter(
    (s) => !opts?.excludeA?.(s)
  );
  const samplesB = samplePathStations(pathB, step).filter(
    (s) => !opts?.excludeB?.(s)
  );

  let minDistanceM = Infinity;
  let mdA = 0;
  let mdB = 0;

  for (const a of samplesA) {
    for (const b of samplesB) {
      const dist = distance(
        { e: a.e, n: a.n, d: a.d },
        { e: b.e, n: b.n, d: b.d }
      );
      if (dist < minDistanceM) {
        minDistanceM = dist;
        mdA = a.md;
        mdB = b.md;
      }
    }
  }

  if (!Number.isFinite(minDistanceM)) {
    minDistanceM = 0;
  }

  return { minDistanceM, mdA, mdB };
}

export function classifyClearanceDistance(
  dist: number,
  threshold: number
): PlannerQaSeverity {
  if (dist >= threshold) return "ok";
  if (dist >= threshold * 0.8) return "watch";
  return "risk";
}

/**
 * Classify the uncertainty-aware separation factor (distance / combined
 * uncertainty radii). Returns "ok" when no factor is available so the
 * distance-based classification stays authoritative.
 */
export function classifySeparationFactor(
  factor: number | null,
  settings: PlannerQaSettings
): PlannerQaSeverity {
  if (factor == null) return "ok";
  const risk = settings.separationFactorRisk ?? 2;
  const warn = settings.separationFactorWarn ?? 5;
  if (factor < risk) return "risk";
  if (factor < warn) return "watch";
  return "ok";
}

function worstSeverity(
  a: PlannerQaSeverity,
  b: PlannerQaSeverity
): PlannerQaSeverity {
  const order = { risk: 0, watch: 1, ok: 2 };
  return order[a] <= order[b] ? a : b;
}

function pathUncertainty(
  path: SurveyStation[],
  settings: PlannerQaSettings
): HoleUncertainty | null {
  if (path.length < 2) return null;
  return propagateUncertainty(
    path,
    DEFAULT_TOOL_ERROR_MODEL,
    settings.uncertaintySigmaFactor ?? DEFAULT_SIGMA_FACTOR
  );
}

function thresholdForRelationship(
  relationship: PlannerClearanceRelationship,
  settings: PlannerQaSettings
): number {
  switch (relationship) {
    case "mother-daughter":
      return settings.minMotherDaughterSeparationM;
    case "daughter-sibling":
      return settings.minSiblingDaughterSeparationM;
    default:
      return settings.minHoleSeparationM;
  }
}

function motherActualTrace(
  mother: SavedHoleProject,
  library: HoleLibrary
): SurveyStation[] | null {
  if (mother.actualRecords.length < 2) return null;
  const collar = normalizePlannerCollar(mother.plannerMeta?.collar);
  return offsetStationsByCollar(buildStations(mother.actualRecords), collar);
}

function buildPair(
  holeA: SavedHoleProject,
  holeB: SavedHoleProject,
  pathA: SurveyStation[],
  pathB: SurveyStation[],
  relationship: PlannerClearanceRelationship,
  settings: PlannerQaSettings,
  opts?: {
    excludeA?: (station: SurveyStation) => boolean;
    messageOverride?: string;
    forceSeverity?: PlannerQaSeverity;
  }
): PlannerClearancePair | null {
  if (pathA.length < 2 && pathB.length < 2) return null;

  const approach = closestApproach(pathA, pathB, {
    sampleIntervalM: settings.sampleIntervalM,
    excludeA: opts?.excludeA,
  });
  const threshold = thresholdForRelationship(relationship, settings);
  const distanceSeverity = classifyClearanceDistance(
    approach.minDistanceM,
    threshold
  );

  // Separation factor only applies to independent holes. Mother-daughter,
  // sibling, and planned-vs-actual pairs share survey lineage, so their
  // position uncertainties are correlated and an independent-envelope SF
  // would systematically over-flag them.
  const applySf = relationship === "standard-standard";
  const uncertaintyA = applySf ? pathUncertainty(pathA, settings) : null;
  const uncertaintyB = applySf ? pathUncertainty(pathB, settings) : null;
  const sf = applySf
    ? separationFactor(
        approach.minDistanceM,
        uncertaintyA ? uncertaintyAtMd(uncertaintyA, approach.mdA) : null,
        uncertaintyB ? uncertaintyAtMd(uncertaintyB, approach.mdB) : null
      )
    : { factor: null, combinedRadiusM: 0 };
  const sfSeverity = classifySeparationFactor(sf.factor, settings);

  const severity =
    opts?.forceSeverity ?? worstSeverity(distanceSeverity, sfSeverity);

  if (severity === "ok" && !opts?.messageOverride) return null;

  const sfNote =
    sf.factor != null && sfSeverity !== "ok"
      ? ` Separation factor ${sf.factor.toFixed(1)} (uncertainty envelopes ±${sf.combinedRadiusM.toFixed(1)} m combined).`
      : "";

  const sfDrivesSeverity =
    !opts?.forceSeverity && sfSeverity !== "ok" && distanceSeverity === "ok";

  const baseMessage = sfDrivesSeverity
    ? `${holeA.holeName} and ${holeB.holeName} clearance ${approach.minDistanceM.toFixed(1)} m, but position uncertainty reduces effective separation.`
    : distanceSeverity === "risk"
      ? `${holeA.holeName} and ${holeB.holeName} closest approach ${approach.minDistanceM.toFixed(1)} m (threshold ${threshold} m).`
      : distanceSeverity === "watch"
        ? `${holeA.holeName} and ${holeB.holeName} clearance ${approach.minDistanceM.toFixed(1)} m — within watch band of ${threshold} m.`
        : `${holeA.holeName} and ${holeB.holeName} clearance OK (${approach.minDistanceM.toFixed(1)} m).`;

  const message = opts?.messageOverride ?? baseMessage + sfNote;

  return {
    holeAId: holeA.holeId,
    holeBId: holeB.holeId,
    holeAName: holeA.holeName,
    holeBName: holeB.holeName,
    relationship,
    minDistanceM: approach.minDistanceM,
    mdA: approach.mdA,
    mdB: approach.mdB,
    severity,
    message,
    separationFactor: sf.factor,
    combinedRadiusM: sf.factor != null ? sf.combinedRadiusM : undefined,
  };
}

type HolePathInfo = {
  hole: SavedHoleProject;
  frame: PlannerMapFramePath;
};

function buildHolePaths(
  library: HoleLibrary,
  holes: SavedHoleProject[]
): HolePathInfo[] {
  return holes.map((hole) => ({
    hole,
    frame: getPlannerMapFramePath(hole, library),
  }));
}

export function buildClearancePairs(
  library: HoleLibrary,
  programId: string,
  settings: PlannerQaSettings
): PlannerClearancePair[] {
  const holes = holesInProgram(library, programId, false);
  const paths = buildHolePaths(library, holes);
  const pairs: PlannerClearancePair[] = [];

  const standards = paths.filter(
    (p) => plannerPlanType(p.hole) !== "daughter"
  );
  const daughters = paths.filter(
    (p) => plannerPlanType(p.hole) === "daughter"
  );

  for (let i = 0; i < standards.length; i += 1) {
    for (let j = i + 1; j < standards.length; j += 1) {
      const a = standards[i]!;
      const b = standards[j]!;
      const pair = buildPair(
        a.hole,
        b.hole,
        a.frame.trace,
        b.frame.trace,
        "standard-standard",
        settings
      );
      if (pair) pairs.push(pair);
    }
  }

  for (const daughter of daughters) {
    const motherId = daughter.hole.parentHoleId;
    if (!motherId) continue;
    const mother = findHole(library, motherId);
    if (!mother) {
      pairs.push({
        holeAId: daughter.hole.holeId,
        holeBId: motherId,
        holeAName: daughter.hole.holeName,
        holeBName: "Missing mother",
        relationship: "mother-daughter",
        minDistanceM: 0,
        mdA: daughter.hole.kickoffMd ?? 0,
        mdB: 0,
        severity: "risk",
        message: `Daughter ${daughter.hole.holeName} missing mother hole in library.`,
      });
      continue;
    }

    const motherActual = motherActualTrace(mother, library);
    const kickoffMd = daughter.hole.kickoffMd ?? 0;
    const exclusionEnd = kickoffMd + settings.motherDaughterKickoffExclusionM;

    if (!motherActual || motherActual.length < 2) {
      pairs.push({
        holeAId: daughter.hole.holeId,
        holeBId: mother.holeId,
        holeAName: daughter.hole.holeName,
        holeBName: mother.holeName,
        relationship: "mother-daughter",
        minDistanceM: 0,
        mdA: kickoffMd,
        mdB: kickoffMd,
        severity: "risk",
        message: `Daughter ${daughter.hole.holeName} kickoff missing mother actual path.`,
      });
      continue;
    }

    const pair = buildPair(
      daughter.hole,
      mother,
      daughter.frame.trace,
      motherActual,
      "mother-daughter",
      settings,
      {
        excludeA: (s) => s.md < exclusionEnd,
      }
    );
    if (pair) pairs.push(pair);
  }

  const siblingsByMother = new Map<string, HolePathInfo[]>();
  for (const daughter of daughters) {
    const pid = daughter.hole.parentHoleId ?? "orphan";
    const list = siblingsByMother.get(pid) ?? [];
    list.push(daughter);
    siblingsByMother.set(pid, list);
  }

  for (const siblings of siblingsByMother.values()) {
    for (let i = 0; i < siblings.length; i += 1) {
      for (let j = i + 1; j < siblings.length; j += 1) {
        const a = siblings[i]!;
        const b = siblings[j]!;
        const pair = buildPair(
          a.hole,
          b.hole,
          a.frame.trace,
          b.frame.trace,
          "daughter-sibling",
          settings
        );
        if (pair) pairs.push(pair);
      }
    }
  }

  for (const info of paths) {
    const { hole, frame } = info;
    if (!frame.actualTrace || frame.actualTrace.length < 2) continue;
    if (hole.actualRecords.length <= 1) continue;

    const pair = buildPair(
      hole,
      hole,
      frame.trace,
      frame.actualTrace,
      "planned-vs-actual",
      settings
    );
    if (pair) {
      pairs.push({
        ...pair,
        holeBId: `${hole.holeId}-actual`,
        holeBName: `${hole.holeName} (actual)`,
        message: `${hole.holeName} planned vs actual closest approach ${pair.minDistanceM.toFixed(1)} m.`,
      });
    }
  }

  return pairs.sort((a, b) => {
    const order = { risk: 0, watch: 1, ok: 2 };
    const diff = order[a.severity] - order[b.severity];
    if (diff !== 0) return diff;
    return a.minDistanceM - b.minDistanceM;
  });
}

export function clearancePairSelection(pair: PlannerClearancePair): {
  holeIds: string[];
  programId?: string;
} {
  const ids = [pair.holeAId];
  if (!pair.holeBId.endsWith("-actual")) {
    ids.push(pair.holeBId);
  }
  return { holeIds: ids };
}
