import type { HoleLibrary } from "./hole-library";
import type { SavedHoleProject } from "./storage";

export type StorageLoadStatus = "ok" | "missing" | "corrupt";

export type StorageLoadResult = {
  status: StorageLoadStatus;
  library?: HoleLibrary;
  error?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validateHole(hole: unknown, index: number): string | null {
  if (!isRecord(hole)) return `Hole ${index}: invalid object`;
  if (hole.version !== 1) return `Hole ${index}: unsupported version`;
  if (typeof hole.holeId !== "string" || !hole.holeId.trim()) {
    return `Hole ${index}: missing holeId`;
  }
  if (typeof hole.holeName !== "string") return `Hole ${index}: missing holeName`;
  if (!Array.isArray(hole.planRecords) || !Array.isArray(hole.actualRecords)) {
    return `Hole ${index}: missing survey arrays`;
  }
  if (!isRecord(hole.target)) return `Hole ${index}: missing target`;
  if (hole.holeRole === "daughter" && typeof hole.parentHoleId !== "string") {
    return `Hole ${hole.holeName ?? hole.holeId}: daughter missing parentHoleId`;
  }
  return null;
}

export function validateHoleLibrary(library: unknown): string | null {
  if (!isRecord(library)) return "Library is not a valid object";
  if (library.version !== 1) return "Unsupported library version";
  if (typeof library.activeHoleId !== "string" || !library.activeHoleId.trim()) {
    return "Missing activeHoleId";
  }
  if (!Array.isArray(library.holes)) return "Missing holes array";
  if (library.holes.length === 0) return "Library has no holes";

  for (let i = 0; i < library.holes.length; i += 1) {
    const err = validateHole(library.holes[i], i);
    if (err) return err;
  }

  const activeExists = library.holes.some(
    (h) => isRecord(h) && h.holeId === library.activeHoleId
  );
  if (!activeExists) return `activeHoleId "${library.activeHoleId}" not found in holes`;

  return null;
}

export function parseLibraryRaw(raw: string): StorageLoadResult {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const err = validateHoleLibrary(parsed);
    if (err) return { status: "corrupt", error: err };
    return { status: "ok", library: parsed as HoleLibrary };
  } catch {
    return { status: "corrupt", error: "Stored data could not be parsed as JSON." };
  }
}

export function snapshotFingerprint(project: SavedHoleProject): string {
  return JSON.stringify({
    holeId: project.holeId,
    holeName: project.holeName,
    siteName: project.siteName,
    planRecords: project.planRecords,
    actualRecords: project.actualRecords,
    target: project.target,
    mode: project.mode,
    history: project.history,
    recoveryAssumptions: project.recoveryAssumptions,
    assumptionSignOff: project.assumptionSignOff ?? null,
    activeScenario: project.activeScenario ?? null,
    planCorridor: project.planCorridor ?? null,
    surveyToolProfile: project.surveyToolProfile ?? null,
    referenceSystem: project.referenceSystem ?? null,
    steeringSettings: project.steeringSettings ?? null,
    holeRole: project.holeRole ?? "standard",
    programId: project.programId,
    parentHoleId: project.parentHoleId,
    parentHoleName: project.parentHoleName,
    kickoffMd: project.kickoffMd,
    kickoffE: project.kickoffE,
    kickoffN: project.kickoffN,
    kickoffD: project.kickoffD,
    kickoffDip: project.kickoffDip,
    kickoffAzimuth: project.kickoffAzimuth,
    branchTargetId: project.branchTargetId,
    branchMethod: project.branchMethod,
    branchStatus: project.branchStatus,
    branchProgram: project.branchProgram ?? null,
    plannerMeta: project.plannerMeta ?? null,
  });
}
