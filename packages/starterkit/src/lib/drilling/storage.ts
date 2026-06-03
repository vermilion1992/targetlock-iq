import type { HoleLibrary } from "./hole-library";
import { LIBRARY_STORAGE_KEY } from "./hole-library";
import type { DecisionHistoryEntry } from "./history";
import type { CapabilityAssumptions } from "./capability-assumptions";
import type { AssumptionSignOff } from "./validation";
import type { PlanCorridorConfig } from "./plan-corridor";
import type { SurveyToolProfile } from "./survey-tool-profile";
import type { SurveyRecord, TargetConfig } from "./types";

/** Legacy single-hole key (migrated into library on first load) */
export const STORAGE_KEY = "targetlock-iq-project-v1";

export { LIBRARY_STORAGE_KEY };

export type SavedHoleProject = {
  version: 1;
  holeId: string;
  holeName: string;
  /** Camp or project name for reports */
  siteName?: string;
  planRecords: SurveyRecord[];
  actualRecords: SurveyRecord[];
  target: TargetConfig;
  mode: "simple" | "advanced";
  history: DecisionHistoryEntry[];
  /** Per-hole steering / recovery capability assumptions (optional). */
  recoveryAssumptions?: CapabilityAssumptions;
  /** Sign-off recorded when the assumptions were validated (optional). */
  assumptionSignOff?: AssumptionSignOff | null;
  /** Built-in test scenario tag when loaded from the scenario library (optional). */
  activeScenario?: { id: string; name: string } | null;
  /** Planned path corridor tolerances (optional). */
  planCorridor?: PlanCorridorConfig | null;
  /** Downhole survey tool accuracy profile (optional). */
  surveyToolProfile?: SurveyToolProfile | null;
  updatedAt: string;
};

export function slugifyHoleId(holeName: string): string {
  return holeName
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, "-")
    .replace(/^-|-$/g, "") || "hole";
}

export function createEmptyProject(holeName = "DDH-0247", siteName = ""): SavedHoleProject {
  return {
    version: 1,
    holeId: slugifyHoleId(holeName),
    holeName,
    siteName,
    planRecords: [],
    actualRecords: [],
    target: {
      md: 600,
      e: 0,
      n: 0,
      d: 0,
      tolerance: 6,
      maxDls: 3,
      nextInterval: 30,
    },
    mode: "simple",
    history: [],
    updatedAt: new Date().toISOString(),
  };
}

export function loadProject(): SavedHoleProject | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedHoleProject;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveProject(project: SavedHoleProject): void {
  if (typeof window === "undefined") return;
  const payload: SavedHoleProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearProject(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function loadLibrary(): HoleLibrary | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HoleLibrary;
    if (parsed.version !== 1 || !parsed.activeHoleId || !Array.isArray(parsed.holes)) {
      return null;
    }
    if (parsed.holes.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLibrary(library: HoleLibrary): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
}

export function clearLibrary(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LIBRARY_STORAGE_KEY);
  window.localStorage.removeItem(STORAGE_KEY);
}
