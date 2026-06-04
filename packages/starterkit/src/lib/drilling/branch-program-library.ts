import {
  buildDaughterPlanFromKickoff,
  kickoffStationFromMother,
  requiredDaughterHeading,
  doglegMotherToDaughter,
} from "./branch-program";
import type {
  BranchMethod,
  BranchProgram,
  BranchTarget,
  BranchTargetPurpose,
  DaughterHole,
  DaughterPlanRef,
  DaughterStatus,
  HoleRole,
  KickoffPlannerDefaults,
  PersistedBranchProgram,
} from "./branch-program-types";
import { normalizeDaughterStatus } from "./branch-program-types";
import type { BranchApprovalSnapshot } from "./branch-program-approval";
import {
  findHole,
  upsertHole,
  type HoleLibrary,
} from "./hole-library";
import { buildStations } from "./desurvey";
import type { SavedHoleProject } from "./storage";
import { slugifyHoleId } from "./storage";
import type { SurveyRecord, TargetConfig } from "./types";

export function daughterContextLine(hole: SavedHoleProject): string | null {
  if (hole.holeRole !== "daughter" || !hole.parentHoleName) return null;
  const md = hole.kickoffMd ?? 0;
  return `Daughter of ${hole.parentHoleName}, kicked off at MD ${Math.round(md)} m`;
}

export function createProgramId(): string {
  return `bp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createTargetId(): string {
  return `tgt-${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultKickoffDefaults(motherActual: SurveyRecord[]): KickoffPlannerDefaults {
  const maxMd = motherActual[motherActual.length - 1]?.md ?? 600;
  return {
    mdMin: Math.max(0, maxMd * 0.6),
    mdMax: maxMd * 0.9,
    stepM: 30,
    preferredMethod: "motor-navi",
  };
}

export function createBranchProgramOnMother(
  library: HoleLibrary,
  motherHoleId: string,
  siteName?: string
): HoleLibrary | null {
  const mother = findHole(library, motherHoleId);
  if (!mother) return null;
  const program: PersistedBranchProgram = {
    programId: createProgramId(),
    name: `${mother.holeName} branch program`,
    site: siteName ?? mother.siteName ?? "",
    targets: [],
    daughters: [],
    activeDaughterHoleId: null,
    kickoffPlannerDefaults: defaultKickoffDefaults(mother.actualRecords),
  };
  const updated: SavedHoleProject = {
    ...mother,
    holeRole: "mother",
    programId: program.programId,
    branchProgram: program,
  };
  return upsertHole(library, updated);
}

export function updateMotherBranchProgram(
  library: HoleLibrary,
  motherHoleId: string,
  program: PersistedBranchProgram
): HoleLibrary | null {
  const mother = findHole(library, motherHoleId);
  if (!mother || mother.holeRole !== "mother") return null;
  return upsertHole(library, {
    ...mother,
    branchProgram: { ...program, programId: program.programId || mother.programId || createProgramId() },
  });
}

export function addTarget(
  library: HoleLibrary,
  motherHoleId: string,
  target: Omit<BranchTarget, "id"> & { id?: string }
): HoleLibrary | null {
  const mother = findHole(library, motherHoleId);
  if (!mother?.branchProgram) return null;
  const id = target.id ?? createTargetId();
  const program: PersistedBranchProgram = {
    ...mother.branchProgram,
    targets: [
      ...mother.branchProgram.targets,
      {
        id,
        label: target.label,
        e: target.e,
        n: target.n,
        d: target.d,
        type: target.type ?? "point",
        priority: target.priority ?? 1,
        toleranceM: target.toleranceM ?? 8,
        targetMdEstimate: target.targetMdEstimate,
        purpose: target.purpose,
      },
    ],
  };
  return updateMotherBranchProgram(library, motherHoleId, program);
}

export function updateTarget(
  library: HoleLibrary,
  motherHoleId: string,
  targetId: string,
  patch: Partial<BranchTarget>
): HoleLibrary | null {
  const mother = findHole(library, motherHoleId);
  if (!mother?.branchProgram) return null;
  const program: PersistedBranchProgram = {
    ...mother.branchProgram,
    targets: mother.branchProgram.targets.map((t) =>
      t.id === targetId ? { ...t, ...patch, id: targetId } : t
    ),
  };
  return updateMotherBranchProgram(library, motherHoleId, program);
}

export function removeTarget(
  library: HoleLibrary,
  motherHoleId: string,
  targetId: string
): HoleLibrary | null {
  const mother = findHole(library, motherHoleId);
  if (!mother?.branchProgram) return null;
  const program: PersistedBranchProgram = {
    ...mother.branchProgram,
    targets: mother.branchProgram.targets.filter((t) => t.id !== targetId),
    daughters: mother.branchProgram.daughters.map((d) =>
      d.targetId === targetId ? { ...d, targetId: "" } : d
    ),
  };
  return updateMotherBranchProgram(library, motherHoleId, program);
}

export type CreateDaughterInput = {
  daughterId: string;
  targetId: string;
  kickoffMd: number;
  method: BranchMethod;
  legLengthM?: number;
  status?: DaughterStatus;
};

export function createDaughterFromKickoff(
  library: HoleLibrary,
  motherHoleId: string,
  input: CreateDaughterInput
): { library: HoleLibrary; daughterHoleId: string } | null {
  const mother = findHole(library, motherHoleId);
  if (!mother?.branchProgram) return null;
  const target = mother.branchProgram.targets.find((t) => t.id === input.targetId);
  if (!target) return null;

  const kickoff = kickoffStationFromMother(mother.actualRecords, input.kickoffMd);
  if (!kickoff) return null;

  const planRecords = buildDaughterPlanFromKickoff({
    kickoffMd: input.kickoffMd,
    motherActual: mother.actualRecords,
    target,
    legLengthM: input.legLengthM ?? 180,
  });
  if (!planRecords.length) return null;

  const daughterName = input.daughterId.trim();
  let daughterHoleId = slugifyHoleId(daughterName);
  let suffix = 1;
  while (library.holes.some((h) => h.holeId === daughterHoleId)) {
    daughterHoleId = `${slugifyHoleId(daughterName)}-${suffix}`;
    suffix += 1;
  }

  const stations = buildStations(planRecords);
  const final = stations[stations.length - 1];
  const targetConfig: TargetConfig = final
    ? {
        md: final.md,
        e: target.e,
        n: target.n,
        d: target.d,
        tolerance: target.toleranceM ?? 8,
        maxDls: 3,
        nextInterval: 30,
      }
    : {
        md: input.kickoffMd + 180,
        e: target.e,
        n: target.n,
        d: target.d,
        tolerance: target.toleranceM ?? 8,
        maxDls: 3,
        nextInterval: 30,
      };

  const heading = requiredDaughterHeading(kickoff, target);
  const requiredDls = doglegMotherToDaughter(
    kickoff.motherDip,
    kickoff.motherAzimuth,
    heading.dip,
    heading.azimuth
  );

  const daughterProject: SavedHoleProject = {
    version: 1,
    holeId: daughterHoleId,
    holeName: daughterName,
    siteName: mother.siteName,
    planRecords,
    actualRecords: [planRecords[0]!],
    target: targetConfig,
    mode: mother.mode,
    history: [],
    holeRole: "daughter",
    programId: mother.branchProgram.programId,
    parentHoleId: mother.holeId,
    parentHoleName: mother.holeName,
    kickoffMd: input.kickoffMd,
    kickoffE: kickoff.e,
    kickoffN: kickoff.n,
    kickoffD: kickoff.d,
    kickoffDip: kickoff.motherDip,
    kickoffAzimuth: kickoff.motherAzimuth,
    branchTargetId: input.targetId,
    branchMethod: input.method,
    branchStatus: normalizeDaughterStatus(input.status ?? "draft"),
    updatedAt: new Date().toISOString(),
  };

  const ref: DaughterPlanRef = {
    daughterHoleId,
    daughterId: daughterName,
    targetId: input.targetId,
    kickoffMd: input.kickoffMd,
    method: input.method,
    status: normalizeDaughterStatus(input.status ?? "draft"),
  };

  let nextLib = upsertHole(library, {
    ...mother,
    branchProgram: {
      ...mother.branchProgram,
      daughters: [...mother.branchProgram.daughters, ref],
      activeDaughterHoleId: daughterHoleId,
    },
  });

  nextLib = upsertHole(nextLib, daughterProject);
  return { library: nextLib, daughterHoleId };
}

export function setDaughterApproval(
  library: HoleLibrary,
  motherHoleId: string,
  daughterHoleId: string,
  approval: BranchApprovalSnapshot
): HoleLibrary | null {
  const mother = findHole(library, motherHoleId);
  if (!mother?.branchProgram) return null;
  let next = upsertHole(library, {
    ...mother,
    branchProgram: {
      ...mother.branchProgram,
      daughters: mother.branchProgram.daughters.map((d) =>
        d.daughterHoleId === daughterHoleId ? { ...d, approval } : d
      ),
    },
  });
  const daughter = findHole(next, daughterHoleId);
  if (daughter) {
    next = upsertHole(next, { ...daughter, branchStatus: "approved" });
  }
  return next;
}

export function setDaughterStatus(
  library: HoleLibrary,
  motherHoleId: string,
  daughterHoleId: string,
  status: DaughterStatus
): HoleLibrary | null {
  const mother = findHole(library, motherHoleId);
  if (!mother?.branchProgram) return null;
  const norm = normalizeDaughterStatus(status);
  let next = upsertHole(library, {
    ...mother,
    branchProgram: {
      ...mother.branchProgram,
      daughters: mother.branchProgram.daughters.map((d) =>
        d.daughterHoleId === daughterHoleId ? { ...d, status: norm } : d
      ),
    },
  });
  const daughter = findHole(next, daughterHoleId);
  if (daughter) {
    next = upsertHole(next, { ...daughter, branchStatus: norm });
  }
  return next;
}

export function archiveDaughter(
  library: HoleLibrary,
  motherHoleId: string,
  daughterHoleId: string
): HoleLibrary | null {
  return setDaughterStatus(library, motherHoleId, daughterHoleId, "abandoned");
}

export function duplicateDaughterPlan(
  library: HoleLibrary,
  motherHoleId: string,
  sourceDaughterHoleId: string,
  newDaughterId: string
): HoleLibrary | null {
  const mother = findHole(library, motherHoleId);
  const source = findHole(library, sourceDaughterHoleId);
  const ref = mother?.branchProgram?.daughters.find(
    (d) => d.daughterHoleId === sourceDaughterHoleId
  );
  if (!mother?.branchProgram || !source || !ref) return null;
  return createDaughterFromKickoff(library, motherHoleId, {
    daughterId: newDaughterId,
    targetId: ref.targetId,
    kickoffMd: ref.kickoffMd,
    method: ref.method,
    status: "draft",
  })?.library ?? null;
}

export function setActiveDaughter(
  library: HoleLibrary,
  motherHoleId: string,
  daughterHoleId: string | null
): HoleLibrary | null {
  const mother = findHole(library, motherHoleId);
  if (!mother?.branchProgram) return null;
  let next = upsertHole(library, {
    ...mother,
    branchProgram: {
      ...mother.branchProgram,
      activeDaughterHoleId: daughterHoleId,
    },
  });
  if (daughterHoleId) {
    return { ...next, activeHoleId: daughterHoleId };
  }
  return { ...next, activeHoleId: motherHoleId };
}

export function daughterHoleToRuntime(
  library: HoleLibrary,
  ref: DaughterPlanRef
): DaughterHole | null {
  const hole = findHole(library, ref.daughterHoleId);
  if (!hole) return null;
  return {
    daughterId: ref.daughterId,
    daughterHoleId: ref.daughterHoleId,
    parentHoleId: hole.parentHoleId ?? "",
    kickoffMd: ref.kickoffMd,
    method: ref.method,
    planRecords: hole.planRecords,
    actualRecords: hole.actualRecords,
    status: normalizeDaughterStatus(ref.status),
    targetId: ref.targetId,
    approval: ref.approval ?? null,
  };
}

export function branchProgramViewModel(
  library: HoleLibrary,
  motherHoleId: string
): BranchProgram | null {
  const mother = findHole(library, motherHoleId);
  if (!mother?.branchProgram) return null;
  const prog = mother.branchProgram;
  const daughters: DaughterHole[] = prog.daughters
    .map((ref) => daughterHoleToRuntime(library, ref))
    .filter((d): d is DaughterHole => d != null);

  return {
    id: prog.programId,
    name: prog.name,
    site: prog.site,
    mother: {
      holeId: mother.holeId,
      planRecords: mother.planRecords,
      actualRecords: mother.actualRecords,
    },
    daughters,
    targets: prog.targets,
    kickoffWindow: prog.kickoffPlannerDefaults
      ? {
          mdMin: prog.kickoffPlannerDefaults.mdMin,
          mdMax: prog.kickoffPlannerDefaults.mdMax,
          stepM: prog.kickoffPlannerDefaults.stepM,
        }
      : undefined,
    persisted: prog,
  };
}

export function getMotherHoleForProgram(
  library: HoleLibrary,
  programId: string
): SavedHoleProject | undefined {
  return library.holes.find(
    (h) => h.holeRole === "mother" && h.branchProgram?.programId === programId
  );
}

export function importScenarioAsProgram(
  library: HoleLibrary,
  motherHoleId: string,
  scenario: BranchProgram
): HoleLibrary | null {
  let next = createBranchProgramOnMother(library, motherHoleId, scenario.site);
  if (!next) return null;
  const mother = findHole(next, motherHoleId);
  if (!mother) return null;

  let program: PersistedBranchProgram = {
    programId: mother.branchProgram!.programId,
    name: scenario.name.replace(/^TEST · /, ""),
    site: scenario.site,
    targets: scenario.targets,
    daughters: [],
    kickoffPlannerDefaults: scenario.kickoffWindow ?? defaultKickoffDefaults(mother.actualRecords),
  };
  next = updateMotherBranchProgram(next, motherHoleId, program)!;

  for (const d of scenario.daughters) {
    const result = createDaughterFromKickoff(next, motherHoleId, {
      daughterId: d.daughterId,
      targetId: d.targetId,
      kickoffMd: d.kickoffMd,
      method: d.method,
      status: normalizeDaughterStatus(d.status),
    });
    if (result) next = result.library;
  }
  return next;
}

export function listImportTargets(library: HoleLibrary, activeHoleId: string): {
  holeId: string;
  label: string;
  role: HoleRole;
}[] {
  const active = findHole(library, activeHoleId);
  if (!active) return [];
  if (active.holeRole === "daughter" && active.programId) {
    const mother = library.holes.find(
      (h) => h.branchProgram?.programId === active.programId && h.holeRole === "mother"
    );
    const daughters = library.holes.filter(
      (h) => h.programId === active.programId && h.holeRole === "daughter"
    );
    const out: { holeId: string; label: string; role: HoleRole }[] = [];
    if (mother) out.push({ holeId: mother.holeId, label: `${mother.holeName} (mother)`, role: "mother" });
    daughters.forEach((d) =>
      out.push({ holeId: d.holeId, label: `${d.holeName} (daughter)`, role: "daughter" })
    );
    return out;
  }
  if (active.holeRole === "mother" && active.branchProgram) {
    const out: { holeId: string; label: string; role: HoleRole }[] = [
      { holeId: active.holeId, label: `${active.holeName} (mother)`, role: "mother" },
    ];
    active.branchProgram.daughters.forEach((ref) => {
      const d = findHole(library, ref.daughterHoleId);
      if (d) out.push({ holeId: d.holeId, label: `${d.holeName} (daughter)`, role: "daughter" });
    });
    return out;
  }
  return [{ holeId: activeHoleId, label: active.holeName, role: active.holeRole ?? "standard" }];
}

export function migrateHoleProject(hole: SavedHoleProject): SavedHoleProject {
  const migrated: SavedHoleProject = {
    ...hole,
    holeRole: hole.holeRole ?? "standard",
    branchStatus: hole.branchStatus
      ? normalizeDaughterStatus(hole.branchStatus)
      : undefined,
  };
  if (migrated.branchProgram?.daughters) {
    migrated.branchProgram = {
      ...migrated.branchProgram,
      daughters: migrated.branchProgram.daughters.map((d) => ({
        ...d,
        status: normalizeDaughterStatus(d.status),
      })),
    };
  }
  return migrated;
}

export function migrateLibrary(library: HoleLibrary): HoleLibrary {
  return {
    ...library,
    holes: library.holes.map(migrateHoleProject),
  };
}
