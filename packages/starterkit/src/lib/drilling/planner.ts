import {
  addTarget,
  createBranchProgramOnMother,
  createDaughterFromKickoff,
} from "./branch-program-library";
import {
  buildDaughterPlanFromKickoff,
  kickoffStationFromMother,
  requiredDaughterHeading,
} from "./branch-program";
import type { BranchTarget } from "./branch-program-types";
import { parseSurveyCsv, surveysToCsv } from "./csv";
import { resolveTargetEnu, validateCoordinateInputs } from "./coordinate-system";
import { buildStations } from "./desurvey";
import {
  createHoleId,
  duplicateHole,
  findHole,
  setActiveHole,
  snapshotProject,
  upsertHole,
  type HoleLibrary,
} from "./hole-library";
import { activatePlannerPlanForExecution } from "./execution-bridge";
import { downloadPlannerPlanCsv } from "./planner-export";
import {
  assertPlannerPlanEditable,
  createPlannerRevision as createPlannerRevisionImpl,
  type CreatePlannerRevisionOpts,
  type CreatePlannerRevisionResult,
} from "./plan-revision";
import { DEFAULT_REFERENCE_SYSTEM } from "./reference-system";
import type { NorthReference } from "./survey-tool-profile";
import { slugifyHoleId } from "./storage";
import type { SavedHoleProject } from "./storage";
import type {
  PlannerDraft,
  PlannerProjectCoordinateSystem,
  PlannerProjectMetadata,
} from "./planner-types";
import { createEmptyPlannerDraft, defaultProgramId } from "./planner-types";
import { designWellPath } from "./well-path-design";
import type { SurveyRecord, TargetConfig } from "./types";

const DEFAULT_SURVEY_INTERVAL = 30;

export function buildStraightPlan(opts: {
  startMd: number;
  startDip: number;
  startAzimuth: number;
  startPosition: { e: number; n: number; d: number };
  targetEnu: { e: number; n: number; d: number };
  targetMd?: number;
  surveyInterval?: number;
}): SurveyRecord[] {
  const {
    startMd,
    startDip,
    startAzimuth,
    startPosition,
    targetEnu,
    targetMd: explicitMd,
    surveyInterval = DEFAULT_SURVEY_INTERVAL,
  } = opts;

  const heading = requiredDaughterHeading(startPosition, targetEnu);
  const legLengthM =
    explicitMd !== undefined && explicitMd > startMd
      ? explicitMd - startMd
      : Math.max(
          surveyInterval,
          Math.sqrt(
            (targetEnu.e - startPosition.e) ** 2 +
              (targetEnu.n - startPosition.n) ** 2 +
              (targetEnu.d - startPosition.d) ** 2
          )
        );

  const terminalMd = explicitMd ?? startMd + legLengthM;
  const rows: SurveyRecord[] = [
    {
      md: startMd,
      dip: startDip,
      azimuth: startAzimuth,
    },
  ];

  let md = startMd + surveyInterval;
  while (md < terminalMd - 1e-6) {
    rows.push({
      md,
      dip: heading.dip,
      azimuth: heading.azimuth,
    });
    md += surveyInterval;
  }

  const last = rows[rows.length - 1]!;
  if (Math.abs(last.md - terminalMd) > 0.5) {
    rows.push({
      md: terminalMd,
      dip: heading.dip,
      azimuth: heading.azimuth,
    });
  }

  return rows.sort((a, b) => a.md - b.md);
}

export function checkPlanDlsWarnings(
  planRecords: SurveyRecord[],
  maxDls: number
): string[] {
  const warnings: string[] = [];
  const stations = buildStations(planRecords);
  let peakDls = 0;
  for (const station of stations) {
    if (station.dls > peakDls) peakDls = station.dls;
    if (station.dls > maxDls + 1e-6) {
      warnings.push(
        `Interval ending MD ${station.md.toFixed(0)} m exceeds max DLS (${station.dls.toFixed(2)}°/30 m > ${maxDls}°/30 m).`
      );
    }
  }
  if (peakDls > maxDls && warnings.length === 0) {
    warnings.push(`Peak planned DLS ${peakDls.toFixed(2)}°/30 m exceeds configured limit ${maxDls}°/30 m.`);
  }
  return warnings;
}

export function validatePlannerDraft(
  draft: PlannerDraft,
  library?: HoleLibrary | null
): string[] {
  const warnings = [...validateCoordinateInputs(draft)];

  if (!draft.projectName.trim()) {
    warnings.push("Enter a project name.");
  }

  if (draft.planType === "standard") {
    if (!draft.holeName?.trim()) warnings.push("Enter a hole ID / name.");
    if (draft.initialDip === undefined || !Number.isFinite(draft.initialDip)) {
      warnings.push("Enter initial dip for the planned hole.");
    }
    if (draft.initialAzimuth === undefined || !Number.isFinite(draft.initialAzimuth)) {
      warnings.push("Enter initial azimuth for the planned hole.");
    }
  }

  if (draft.planType === "daughter") {
    if (!draft.daughterKickoff?.motherHoleId) {
      warnings.push("Select a mother hole for the daughter plan.");
    } else if (library) {
      const mother = findHole(library, draft.daughterKickoff.motherHoleId);
      if (!mother) warnings.push("Selected mother hole was not found in the library.");
      else if (!mother.actualRecords.length) {
        warnings.push("Mother hole has no actual surveys — daughter kickoff requires surveyed mother path.");
      }
    }
    if (!draft.holeName?.trim()) warnings.push("Enter a daughter hole ID / name.");
    if (
      draft.daughterKickoff &&
      (!Number.isFinite(draft.daughterKickoff.kickoffMd) || draft.daughterKickoff.kickoffMd <= 0)
    ) {
      warnings.push("Enter a valid kickoff depth (MD) on the mother hole.");
    }
  }

  if (draft.planType === "import") {
    if (!draft.importCsvText?.trim()) {
      warnings.push("Import a planned survey CSV or paste CSV text.");
    }
  }

  const targetResolved = resolveTargetEnu(draft);
  warnings.push(...targetResolved.warnings);

  if (
    !Number.isFinite(draft.target.tolerance) ||
    draft.target.tolerance <= 0
  ) {
    warnings.push("Enter a positive target tolerance.");
  }

  return warnings;
}

export function generatePlannerPlan(
  draft: PlannerDraft,
  library?: HoleLibrary | null
): PlannerDraft {
  const warnings = validatePlannerDraft(draft, library);
  const { e, n, d, warnings: targetWarnings } = resolveTargetEnu(draft);
  warnings.push(...targetWarnings);

  let planRecords: SurveyRecord[] = [];

  if (draft.planType === "import") {
    if (draft.importCsvText?.trim()) {
      planRecords = parseSurveyCsv(draft.importCsvText);
      if (!planRecords.length) {
        warnings.push("Imported CSV did not contain valid md, dip, azimuth rows.");
      }
    }
  } else if (draft.planType === "standard") {
    const startDip = draft.initialDip ?? -60;
    const startAzimuth = draft.initialAzimuth ?? 0;
    const pathDesign = draft.constraints.pathDesign ?? "straight";
    if (pathDesign === "straight") {
      planRecords = buildStraightPlan({
        startMd: 0,
        startDip,
        startAzimuth,
        startPosition: { e: 0, n: 0, d: 0 },
        targetEnu: { e, n, d },
        targetMd: draft.target.md,
        surveyInterval: draft.constraints.surveyInterval,
      });
    } else {
      const design = designWellPath(pathDesign, {
        startMd: 0,
        startDip,
        startAzimuth,
        startPosition: { e: 0, n: 0, d: 0 },
        targetEnu: { e, n, d },
        surveyInterval: draft.constraints.surveyInterval,
        maxDls: draft.constraints.maxDls,
        kickoffLengthM: draft.constraints.kickoffLengthM,
        buildRateDegPer30m: draft.constraints.buildRateDegPer30m,
      });
      planRecords = design.records;
      warnings.push(...design.errors, ...design.warnings);
      if (design.feasible && design.usedDlsPer30m != null && design.usedDlsPer30m > 0) {
        warnings.push(
          `Curved design uses ${design.usedDlsPer30m.toFixed(2)}°/30 m build (minimum required ${design.requiredDlsPer30m?.toFixed(2) ?? "—"}°/30 m); planned TD ${design.finalMd?.toFixed(0) ?? "—"} m.`
        );
      }
      if (
        design.feasible &&
        design.finalMd != null &&
        draft.target.md !== undefined &&
        Math.abs(design.finalMd - draft.target.md) > 5
      ) {
        warnings.push(
          `Designed path reaches the target at MD ${design.finalMd.toFixed(0)} m, which differs from the entered target MD ${draft.target.md.toFixed(0)} m — the designed TD will be used.`
        );
      }
    }
  } else if (draft.planType === "daughter" && draft.daughterKickoff && library) {
    const mother = findHole(library, draft.daughterKickoff.motherHoleId);
    if (mother?.actualRecords.length) {
      const kickoff = kickoffStationFromMother(
        mother.actualRecords,
        draft.daughterKickoff.kickoffMd
      );
      if (!kickoff) {
        warnings.push("Kickoff MD is outside the mother hole survey range.");
      } else {
        const pathDesign = draft.constraints.pathDesign ?? "straight";
        if (pathDesign === "straight") {
          const legLengthM =
            draft.target.md !== undefined && draft.target.md > kickoff.md
              ? draft.target.md - kickoff.md
              : Math.max(
                  draft.constraints.surveyInterval,
                  Math.sqrt(e ** 2 + n ** 2 + d ** 2)
                );
          planRecords = buildDaughterPlanFromKickoff({
            kickoffMd: kickoff.md,
            motherActual: mother.actualRecords,
            target: { e, n, d },
            legLengthM,
            surveyInterval: draft.constraints.surveyInterval,
          });
        } else {
          const design = designWellPath(pathDesign, {
            startMd: kickoff.md,
            startDip: kickoff.dip,
            startAzimuth: kickoff.azimuth,
            startPosition: { e: kickoff.e, n: kickoff.n, d: kickoff.d },
            targetEnu: { e, n, d },
            surveyInterval: draft.constraints.surveyInterval,
            maxDls: draft.constraints.maxDls,
            kickoffLengthM: draft.constraints.kickoffLengthM,
            buildRateDegPer30m: draft.constraints.buildRateDegPer30m,
          });
          planRecords = design.records;
          warnings.push(...design.errors, ...design.warnings);
          if (design.feasible && design.usedDlsPer30m != null && design.usedDlsPer30m > 0) {
            warnings.push(
              `Curved daughter design uses ${design.usedDlsPer30m.toFixed(2)}°/30 m build from kickoff MD ${kickoff.md.toFixed(0)} m; planned TD ${design.finalMd?.toFixed(0) ?? "—"} m.`
            );
          }
        }
        if (!planRecords.length) {
          warnings.push("Could not generate daughter plan from kickoff.");
        }
      }
    }
  }

  if (planRecords.length) {
    warnings.push(...checkPlanDlsWarnings(planRecords, draft.constraints.maxDls));
  } else if (draft.planType !== "import") {
    warnings.push("No plan stations were generated — check collar, target, and kickoff inputs.");
  }

  return {
    ...draft,
    planRecords,
    warnings: [...new Set(warnings)],
  };
}

/**
 * Build the hole's reference system from the planner's north reference,
 * bridging the project coordinate system's site values so the dashboard's
 * azimuth conversion uses them on handoff: magnetic declination from PCS
 * `magneticDeclinationDeg`, grid rotation from PCS `gridConvergenceDeg`.
 */
export function plannerReferenceSystem(
  northReference: PlannerDraft["northReference"],
  pcs?: PlannerProjectCoordinateSystem | null
) {
  return {
    ...DEFAULT_REFERENCE_SYSTEM,
    planReference: northReference as NorthReference,
    surveyReference: northReference as NorthReference,
    outputReference: northReference as NorthReference,
    magneticDeclinationDeg: Number.isFinite(pcs?.magneticDeclinationDeg)
      ? pcs!.magneticDeclinationDeg!
      : DEFAULT_REFERENCE_SYSTEM.magneticDeclinationDeg,
    gridRotationDeg: Number.isFinite(pcs?.gridConvergenceDeg)
      ? pcs!.gridConvergenceDeg!
      : DEFAULT_REFERENCE_SYSTEM.gridRotationDeg,
  };
}

export function buildPlannerMetadata(
  draft: PlannerDraft,
  existing?: PlannerProjectMetadata | null
): PlannerProjectMetadata {
  const programId =
    draft.programId ?? existing?.programId ?? defaultProgramId(draft.projectName);
  const programName =
    draft.programName ??
    existing?.programName ??
    (draft.projectName.trim() || undefined);

  const collarSource =
    existing?.collarSource ??
    (draft.planType === "import"
      ? "imported"
      : draft.planType === "daughter" && !draft.collar
        ? "daughter_kickoff"
        : draft.collar
          ? "manual"
          : undefined);

  return {
    coordinateMode: draft.coordinateMode,
    northReference: draft.northReference,
    collar: draft.collar,
    collarSource,
    targetInputMode: draft.target.inputMode,
    plannedAt: existing?.plannedAt ?? new Date().toISOString(),
    createdFromPlanner: true,
    planType: draft.planType,
    status: existing?.status ?? "planned",
    programId,
    programName,
    planRevision: existing?.planRevision ?? 1,
    parentPlanId: existing?.parentPlanId,
    previousRevisionHoleId: existing?.previousRevisionHoleId,
    approvedBy: existing?.approvedBy,
    approvedAt: existing?.approvedAt,
    activatedAt: existing?.activatedAt,
    completedAt: existing?.completedAt,
    plannerNotes:
      draft.coordinateSourceNotes?.trim() ||
      existing?.plannerNotes,
    objective: existing?.objective,
    priority: existing?.priority,
    projectCoordinateSystem:
      draft.projectCoordinateSystem ?? existing?.projectCoordinateSystem,
  };
}

export function buildTargetConfigFromDraft(
  draft: PlannerDraft,
  planRecords: SurveyRecord[]
): TargetConfig {
  const { e, n, d } = resolveTargetEnu(draft);
  const stations = buildStations(planRecords);
  const final = stations[stations.length - 1];
  const md = draft.target.md ?? final?.md ?? planRecords[planRecords.length - 1]?.md ?? 0;
  return {
    md,
    e,
    n,
    d,
    tolerance: draft.target.tolerance,
    maxDls: draft.constraints.maxDls,
    nextInterval: draft.constraints.surveyInterval,
  };
}

export function plannerDraftToSavedHoleProject(
  draft: PlannerDraft,
  holeId?: string,
  existing?: SavedHoleProject | null
): SavedHoleProject | null {
  if (!draft.planRecords.length) return null;

  const id = holeId ?? draft.editingHoleId ?? slugifyHoleId(draft.holeName ?? "planned-hole");
  const target = buildTargetConfigFromDraft(draft, draft.planRecords);
  const firstStation = draft.planRecords[0]!;
  const meta = buildPlannerMetadata(draft, existing?.plannerMeta);

  return snapshotProject({
    holeId: id,
    holeName: draft.holeName?.trim() || id,
    siteName: draft.projectName.trim(),
    planRecords: draft.planRecords,
    actualRecords: existing?.actualRecords?.length
      ? existing.actualRecords
      : [firstStation],
    target,
    mode: existing?.mode ?? "simple",
    history: existing?.history ?? [],
    referenceSystem: plannerReferenceSystem(
      draft.northReference,
      meta.projectCoordinateSystem
    ),
    holeRole: existing?.holeRole ?? "standard",
    programId: meta.programId,
    plannerMeta: meta,
  });
}

export type PublishPlannerOpts = {
  activate?: boolean;
};

export function publishStandardPlannerDraft(
  draft: PlannerDraft,
  library: HoleLibrary,
  opts: PublishPlannerOpts = {}
): { library: HoleLibrary; holeId: string } | null {
  const existing = draft.editingHoleId
    ? findHole(library, draft.editingHoleId)
    : null;
  if (existing) {
    try {
      assertPlannerPlanEditable(existing);
    } catch {
      return null;
    }
  }

  const project = plannerDraftToSavedHoleProject(
    draft,
    draft.editingHoleId,
    existing
  );
  if (!project) return null;

  let holeId = project.holeId;
  if (!draft.editingHoleId) {
    let suffix = 1;
    while (library.holes.some((h) => h.holeId === holeId)) {
      holeId = `${project.holeId}-${suffix}`;
      suffix += 1;
    }
  }

  const finalProject: SavedHoleProject = {
    ...project,
    holeId,
    updatedAt: new Date().toISOString(),
  };
  let nextLib = upsertHole(library, finalProject);
  if (opts.activate) {
    const activated = activatePlannerPlanForExecution(nextLib, holeId, {
      allowUnapproved: true,
    });
    if (!activated) return null;
    nextLib = activated;
  }
  return { library: nextLib, holeId };
}

export function publishDaughterPlannerDraft(
  draft: PlannerDraft,
  library: HoleLibrary,
  opts: PublishPlannerOpts = {}
): { library: HoleLibrary; holeId: string } | null {
  const kickoff = draft.daughterKickoff;
  if (!kickoff || !draft.planRecords.length) return null;

  let nextLib = library;
  const mother = findHole(nextLib, kickoff.motherHoleId);
  if (!mother) return null;

  if (!mother.branchProgram) {
    const withProgram = createBranchProgramOnMother(
      nextLib,
      kickoff.motherHoleId,
      draft.projectName
    );
    if (!withProgram) return null;
    nextLib = withProgram;
  }

  const { e, n, d } = resolveTargetEnu(draft);
  const targetLabel = draft.holeName?.trim() || "Planner target";
  const withTarget = addTarget(nextLib, kickoff.motherHoleId, {
    label: targetLabel,
    e,
    n,
    d,
    type: "point",
    priority: 1,
    toleranceM: draft.target.tolerance,
  });
  if (!withTarget) return null;
  nextLib = withTarget;

  const updatedMother = findHole(nextLib, kickoff.motherHoleId);
  const targets = updatedMother?.branchProgram?.targets ?? [];
  const branchTarget = targets[targets.length - 1];
  if (!branchTarget) return null;

  const daughterName = draft.holeName?.trim() || `Daughter of ${kickoff.motherHoleName}`;
  const result = createDaughterFromKickoff(nextLib, kickoff.motherHoleId, {
    daughterId: daughterName,
    targetId: branchTarget.id,
    kickoffMd: kickoff.kickoffMd,
    method: "planned-sidetrack",
    status: "draft",
    legLengthM:
      draft.target.md !== undefined && draft.target.md > kickoff.kickoffMd
        ? draft.target.md - kickoff.kickoffMd
        : undefined,
  });
  if (!result) return null;

  const daughter = findHole(result.library, result.daughterHoleId);
  if (!daughter) return null;

  const enriched: SavedHoleProject = {
    ...daughter,
    planRecords: draft.planRecords,
    target: buildTargetConfigFromDraft(draft, draft.planRecords),
    referenceSystem: plannerReferenceSystem(
      draft.northReference,
      draft.projectCoordinateSystem ?? daughter.plannerMeta?.projectCoordinateSystem
    ),
    plannerMeta: {
      ...buildPlannerMetadata(draft, daughter.plannerMeta),
      programId:
        draft.programId ??
        daughter.programId ??
        daughter.plannerMeta?.programId,
      programName:
        draft.programName ??
        (draft.projectName.trim() || daughter.plannerMeta?.programName),
    },
    programId:
      draft.programId ??
      daughter.programId ??
      buildPlannerMetadata(draft).programId,
    siteName: draft.projectName.trim() || daughter.siteName,
    updatedAt: new Date().toISOString(),
  };

  nextLib = upsertHole(result.library, enriched);
  if (opts.activate) {
    const activated = activatePlannerPlanForExecution(nextLib, result.daughterHoleId, {
      allowUnapproved: true,
    });
    if (!activated) return null;
    return { library: activated, holeId: result.daughterHoleId };
  }
  return { library: nextLib, holeId: result.daughterHoleId };
}

export function publishPlannerDraft(
  draft: PlannerDraft,
  library: HoleLibrary,
  opts: PublishPlannerOpts = {}
): { library: HoleLibrary; holeId: string } | null {
  if (!draft.planRecords.length) return null;

  if (draft.planType === "daughter") {
    return publishDaughterPlannerDraft(draft, library, opts);
  }
  return publishStandardPlannerDraft(draft, library, opts);
}

export function exportPlannerCsv(planRecords: SurveyRecord[]): string {
  return surveysToCsv(planRecords);
}

export function downloadPlannerCsv(planRecords: SurveyRecord[], filename: string): void {
  downloadPlannerPlanCsv(planRecords, filename);
}

export function savedHoleToPlannerDraft(hole: SavedHoleProject): PlannerDraft {
  const meta = hole.plannerMeta;
  const planType =
    meta?.planType ?? (hole.holeRole === "daughter" ? "daughter" : "standard");

  const draft = createEmptyPlannerDraft();
  draft.editingHoleId = hole.holeId;
  draft.projectName = hole.siteName ?? meta?.programName ?? "";
  draft.planType = planType;
  draft.coordinateMode = meta?.coordinateMode ?? "collar-relative";
  draft.northReference = meta?.northReference ?? "grid";
  draft.collar = meta?.collar;
  draft.holeName = hole.holeName;
  draft.programId = meta?.programId ?? hole.programId;
  draft.programName = meta?.programName;
  draft.projectCoordinateSystem = meta?.projectCoordinateSystem;
  draft.planRecords = [...hole.planRecords];
  draft.target = {
    md: hole.target.md,
    e: hole.target.e,
    n: hole.target.n,
    d: hole.target.d,
    tolerance: hole.target.tolerance,
    inputMode: meta?.targetInputMode ?? "collar-relative",
  };
  draft.constraints = {
    surveyInterval: hole.target.nextInterval ?? 30,
    maxDls: hole.target.maxDls ?? 3,
  };
  draft.coordinateSourceNotes = meta?.plannerNotes;

  if (hole.planRecords[0]) {
    draft.initialDip = hole.planRecords[0]!.dip;
    draft.initialAzimuth = hole.planRecords[0]!.azimuth;
  }

  if (planType === "daughter" && hole.parentHoleId) {
    draft.daughterKickoff = {
      motherHoleId: hole.parentHoleId,
      motherHoleName: hole.parentHoleName ?? hole.parentHoleId,
      kickoffMd: hole.kickoffMd ?? hole.planRecords[0]?.md ?? 0,
      e: hole.kickoffE ?? 0,
      n: hole.kickoffN ?? 0,
      d: hole.kickoffD ?? 0,
      dip: hole.kickoffDip ?? hole.planRecords[0]?.dip ?? 0,
      azimuth: hole.kickoffAzimuth ?? hole.planRecords[0]?.azimuth ?? 0,
    };
  }

  return draft;
}

export function duplicatePlannerPlan(
  library: HoleLibrary,
  sourceHoleId: string,
  newName?: string
): HoleLibrary | null {
  const source = findHole(library, sourceHoleId);
  if (!source?.plannerMeta) return null;

  const name = newName?.trim() || `${source.holeName} (copy)`;
  const duped = duplicateHole(library, sourceHoleId, name);
  if (!duped) return null;

  const copy = duped.holes.find((h) => h.holeName === name);
  if (!copy) return duped;

  const updated = upsertHole(duped, {
    ...copy,
    history: [],
    plannerMeta: {
      ...copy.plannerMeta!,
      status: "draft",
      planRevision: 1,
      approvedBy: undefined,
      approvedAt: undefined,
      approvalSnapshot: undefined,
      activatedAt: undefined,
      completedAt: undefined,
      previousRevisionHoleId: undefined,
      parentPlanId: undefined,
      plannedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  });
  return { ...updated, activeHoleId: library.activeHoleId };
}

export type { CreatePlannerRevisionOpts, CreatePlannerRevisionResult };

export function createPlannerRevision(
  library: HoleLibrary,
  sourceHoleId: string,
  opts?: CreatePlannerRevisionOpts
): HoleLibrary | null {
  const result = createPlannerRevisionImpl(library, sourceHoleId, opts);
  return result?.library ?? null;
}

export function createEmptyLibraryForPlanner(draft: PlannerDraft): HoleLibrary {
  const project = plannerDraftToSavedHoleProject(draft);
  if (!project) {
    const holeId = createHoleId();
    return {
      version: 1,
      activeHoleId: holeId,
      holes: [
        snapshotProject({
          holeId,
          holeName: draft.holeName ?? "Planned hole",
          siteName: draft.projectName,
          planRecords: draft.planRecords,
          actualRecords: draft.planRecords.length ? [draft.planRecords[0]!] : [],
          target: buildTargetConfigFromDraft(draft, draft.planRecords),
          mode: "simple",
          history: [],
        }),
      ],
    };
  }
  return {
    version: 1,
    activeHoleId: project.holeId,
    holes: [project],
  };
}

export function resolveDaughterKickoff(
  motherActual: SurveyRecord[],
  kickoffMd: number,
  motherHoleId: string,
  motherHoleName: string
): PlannerDraft["daughterKickoff"] | null {
  const kickoff = kickoffStationFromMother(motherActual, kickoffMd);
  if (!kickoff) return null;
  return {
    motherHoleId,
    motherHoleName,
    kickoffMd: kickoff.md,
    e: kickoff.e,
    n: kickoff.n,
    d: kickoff.d,
    dip: kickoff.dip,
    azimuth: kickoff.azimuth,
  };
}
