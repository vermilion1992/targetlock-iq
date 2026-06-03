import type { DecisionHistoryEntry } from "./history";
import { parseSurveyCsv } from "./csv";
import { buildStations } from "./desurvey";
import { planTargetFromStations } from "./recommendation";
import {
  createEmptyProject,
  slugifyHoleId,
  type SavedHoleProject,
} from "./storage";
import type { CapabilityAssumptions } from "./capability-assumptions";
import type { PlanCorridorConfig } from "./plan-corridor";
import type { SurveyToolProfile } from "./survey-tool-profile";
import type { AssumptionSignOff } from "./validation";
import type { SurveyRecord, TargetConfig } from "./types";
import { DEFAULT_TARGET } from "./compute";

export const LIBRARY_STORAGE_KEY = "targetlock-iq-library-v1";

export type HoleLibrary = {
  version: 1;
  activeHoleId: string;
  holes: SavedHoleProject[];
};

export function createHoleId(): string {
  return `hole-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function targetFromPlan(plan: SurveyRecord[]): TargetConfig {
  const stations = buildStations(plan);
  const finalPlan = stations[stations.length - 1];
  if (!finalPlan) return DEFAULT_TARGET;
  const fromPlan = planTargetFromStations(stations, finalPlan.md);
  if (!fromPlan) return DEFAULT_TARGET;
  return {
    ...fromPlan,
    maxDls: 3,
    nextInterval: 30,
  };
}

export function buildProjectFromSampleData(
  holeName: string,
  siteName: string,
  planCsv: string,
  actualCsv: string,
  holeId?: string
): SavedHoleProject {
  const planRecords = parseSurveyCsv(planCsv);
  const actualRecords = parseSurveyCsv(actualCsv);
  const id = holeId ?? createHoleId();
  return {
    version: 1,
    holeId: id,
    holeName,
    siteName: siteName.trim() || undefined,
    planRecords,
    actualRecords,
    target: targetFromPlan(planRecords),
    mode: "simple",
    history: [],
    updatedAt: new Date().toISOString(),
  };
}

export function buildBlankProject(
  holeName: string,
  siteName = "",
  holeId?: string
): SavedHoleProject {
  const id = holeId ?? createHoleId();
  return {
    ...createEmptyProject(holeName, siteName),
    holeId: id,
    updatedAt: new Date().toISOString(),
  };
}

export function touchProject(project: SavedHoleProject): SavedHoleProject {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
  };
}

export function findHole(library: HoleLibrary, holeId: string): SavedHoleProject | undefined {
  return library.holes.find((h) => h.holeId === holeId);
}

export function getActiveHole(library: HoleLibrary): SavedHoleProject | undefined {
  return findHole(library, library.activeHoleId);
}

export function upsertHole(library: HoleLibrary, project: SavedHoleProject): HoleLibrary {
  const idx = library.holes.findIndex((h) => h.holeId === project.holeId);
  const holes =
    idx >= 0
      ? library.holes.map((h, i) => (i === idx ? touchProject(project) : h))
      : [...library.holes, touchProject(project)];
  return { ...library, holes };
}

export function setActiveHole(library: HoleLibrary, holeId: string): HoleLibrary | null {
  if (!findHole(library, holeId)) return null;
  return { ...library, activeHoleId: holeId };
}

export function removeHole(library: HoleLibrary, holeId: string): HoleLibrary | null {
  if (library.holes.length <= 1) return null;
  const holes = library.holes.filter((h) => h.holeId !== holeId);
  if (holes.length === library.holes.length) return null;
  const activeHoleId =
    library.activeHoleId === holeId ? holes[0]!.holeId : library.activeHoleId;
  return { version: 1, activeHoleId, holes };
}

export function duplicateHole(
  library: HoleLibrary,
  sourceHoleId: string,
  newName: string
): HoleLibrary | null {
  const source = findHole(library, sourceHoleId);
  if (!source) return null;
  const trimmed = newName.trim() || `${source.holeName} (copy)`;
  let candidateId = slugifyHoleId(trimmed);
  let suffix = 1;
  while (library.holes.some((h) => h.holeId === candidateId)) {
    candidateId = `${slugifyHoleId(trimmed)}-${suffix}`;
    suffix += 1;
  }
  const copy: SavedHoleProject = {
    ...source,
    holeId: candidateId,
    holeName: trimmed,
    history: [],
    updatedAt: new Date().toISOString(),
  };
  return {
    version: 1,
    activeHoleId: copy.holeId,
    holes: [...library.holes, copy],
  };
}

export function migrateLegacyProject(legacy: SavedHoleProject): HoleLibrary {
  const holeId = legacy.holeId || slugifyHoleId(legacy.holeName);
  const hole: SavedHoleProject = { ...legacy, holeId };
  return {
    version: 1,
    activeHoleId: holeId,
    holes: [hole],
  };
}

export function createLibraryWithHole(hole: SavedHoleProject): HoleLibrary {
  return {
    version: 1,
    activeHoleId: hole.holeId,
    holes: [touchProject(hole)],
  };
}

export function snapshotProject(fields: {
  holeId: string;
  holeName: string;
  siteName: string;
  planRecords: SurveyRecord[];
  actualRecords: SurveyRecord[];
  target: TargetConfig;
  mode: "simple" | "advanced";
  history: DecisionHistoryEntry[];
  recoveryAssumptions?: CapabilityAssumptions;
  assumptionSignOff?: AssumptionSignOff | null;
  activeScenario?: { id: string; name: string } | null;
  planCorridor?: PlanCorridorConfig | null;
  surveyToolProfile?: SurveyToolProfile | null;
}): SavedHoleProject {
  return touchProject({
    version: 1,
    holeId: fields.holeId,
    holeName: fields.holeName,
    siteName: fields.siteName.trim() || undefined,
    planRecords: fields.planRecords,
    actualRecords: fields.actualRecords,
    target: fields.target,
    mode: fields.mode,
    history: fields.history,
    recoveryAssumptions: fields.recoveryAssumptions,
    assumptionSignOff: fields.assumptionSignOff ?? null,
    activeScenario: fields.activeScenario ?? null,
    planCorridor: fields.planCorridor ?? null,
    surveyToolProfile: fields.surveyToolProfile ?? null,
    updatedAt: new Date().toISOString(),
  });
}

export function uniqueHoleName(library: HoleLibrary, baseName: string): string {
  const names = new Set(library.holes.map((h) => h.holeName.toLowerCase()));
  if (!names.has(baseName.toLowerCase())) return baseName;
  let n = 2;
  while (names.has(`${baseName}-${n}`.toLowerCase())) n += 1;
  return `${baseName}-${n}`;
}
