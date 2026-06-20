"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseSurveyCsv } from "@/lib/drilling/csv";
import { buildStations } from "@/lib/drilling/desurvey";
import {
  buildBlankProject,
  buildProjectFromSampleData,
  createLibraryWithHole,
  duplicateHole,
  findHole,
  getActiveHole,
  migrateLegacyProject,
  removeHole,
  resetActiveHoleInLibrary,
  setActiveHole,
  snapshotProject,
  uniqueHoleName,
  upsertHole,
} from "@/lib/drilling/hole-library";
import type { HoleLibrary } from "@/lib/drilling/hole-library";
import {
  createHistoryId,
  formatRecommendationSnapshot,
  type DecisionHistoryEntry,
} from "@/lib/drilling/history";
import { planTargetFromStations } from "@/lib/drilling/recommendation";
import {
  clearLibrary,
  loadLibraryWithStatus,
  loadProject,
  saveLibrary,
  slugifyHoleId,
  type SavedHoleProject,
} from "@/lib/drilling/storage";
import {
  snapshotFingerprint,
  type StorageLoadStatus,
} from "@/lib/drilling/storage-health";
import {
  DEFAULT_CAPABILITY_ASSUMPTIONS,
  normalizeCapabilityAssumptions,
  type CapabilityAssumptions,
} from "@/lib/drilling/capability-assumptions";
import type { AssumptionSignOff } from "@/lib/drilling/validation";
import {
  DEFAULT_PLAN_CORRIDOR,
  derivePlanCorridorFromPlan,
  type PlanCorridorConfig,
} from "@/lib/drilling/plan-corridor";
import {
  completePlannerExecution,
  markExecutionDrilling,
} from "@/lib/drilling/execution-bridge";
import { guardLockedPlanEdit } from "@/lib/drilling/plan-lock";
import { plannerStatus } from "@/lib/drilling/planner-status";
import {
  syntheticHoleToProject,
  type SyntheticHoleParams,
} from "@/lib/drilling/synthetic-hole-builder";
import {
  DEFAULT_SURVEY_TOOL_PROFILE,
  normalizeSurveyToolProfile,
  type SurveyToolProfile,
} from "@/lib/drilling/survey-tool-profile";
import {
  DEFAULT_REFERENCE_SYSTEM,
  normalizeReferenceSystem,
  type ReferenceSystemConfig,
} from "@/lib/drilling/reference-system";
import {
  DEFAULT_STEERING_SETTINGS,
  normalizeSteeringSettings,
  type SteeringSettings,
} from "@/lib/drilling/steering-settings";
import {
  addTarget as libAddTarget,
  archiveDaughter as libArchiveDaughter,
  branchProgramViewModel,
  createBranchProgramOnMother,
  createDaughterFromKickoff,
  importScenarioAsProgram,
  removeTarget as libRemoveTarget,
  setActiveDaughter as libSetActiveDaughter,
  setDaughterStatus as libSetDaughterStatus,
  setDaughterApproval as libSetDaughterApproval,
  updateMotherBranchProgram,
  updateTarget as libUpdateTarget,
  type CreateDaughterInput,
} from "@/lib/drilling/branch-program-library";
import type { BranchApprovalSnapshot } from "@/lib/drilling/branch-program-approval";
import { findBranchScenario } from "@/lib/drilling/branch-program-scenarios";
import type {
  BranchProgram,
  BranchTarget,
  PersistedBranchProgram,
} from "@/lib/drilling/branch-program-types";
import { targetFromPlanRecords } from "@/lib/drilling/synthetic-hole-builder";
import {
  findScenario,
  scenarioTarget,
} from "@/lib/drilling/test-scenarios";
import type { Recommendation, SurveyRecord, TargetConfig } from "@/lib/drilling/types";
import { DEFAULT_TARGET } from "@/lib/drilling/compute";
import { SAMPLE_ACTUAL_CSV, SAMPLE_PLAN_CSV } from "@/lib/sample-data";

const MAX_HISTORY = 100;

function applyProjectToState(
  project: SavedHoleProject,
  setters: {
    setHoleId: (id: string) => void;
    setHoleName: (name: string) => void;
    setSiteName: (site: string) => void;
    setMode: (mode: "simple" | "advanced") => void;
    setPlanRecords: (r: SurveyRecord[]) => void;
    setActualRecords: (r: SurveyRecord[]) => void;
    setTarget: (t: TargetConfig) => void;
    setHistory: (h: DecisionHistoryEntry[]) => void;
    setRecoveryAssumptions: (a: CapabilityAssumptions) => void;
    setAssumptionSignOff: (s: AssumptionSignOff | null) => void;
    setActiveScenario: (s: { id: string; name: string } | null) => void;
    setPlanCorridor: (c: PlanCorridorConfig) => void;
    setSurveyToolProfile: (p: SurveyToolProfile) => void;
    setReferenceSystem: (r: ReferenceSystemConfig) => void;
    setSteeringSettings: (s: SteeringSettings) => void;
  }
) {
  setters.setHoleId(project.holeId);
  setters.setHoleName(project.holeName);
  setters.setSiteName(project.siteName ?? "");
  setters.setMode(project.mode);
  setters.setPlanRecords(project.planRecords);
  setters.setActualRecords(project.actualRecords);
  setters.setTarget(project.target);
  setters.setHistory(project.history ?? []);
  setters.setRecoveryAssumptions(
    normalizeCapabilityAssumptions(project.recoveryAssumptions)
  );
  setters.setAssumptionSignOff(project.assumptionSignOff ?? null);
  setters.setActiveScenario(project.activeScenario ?? null);
  setters.setPlanCorridor(project.planCorridor ?? { ...DEFAULT_PLAN_CORRIDOR });
  setters.setSurveyToolProfile(
    normalizeSurveyToolProfile(project.surveyToolProfile ?? DEFAULT_SURVEY_TOOL_PROFILE)
  );
  setters.setReferenceSystem(
    normalizeReferenceSystem(project.referenceSystem ?? DEFAULT_REFERENCE_SYSTEM)
  );
  setters.setSteeringSettings(
    normalizeSteeringSettings(project.steeringSettings)
  );
}

export function useTargetLockProject(suspendPersistence = false) {
  const [hydrated, setHydrated] = useState(false);
  const [holeId, setHoleId] = useState("ddh-0247");
  const [holeName, setHoleName] = useState("DDH-0247");
  const [siteName, setSiteName] = useState("");
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [planRecords, setPlanRecords] = useState<SurveyRecord[]>([]);
  const [actualRecords, setActualRecords] = useState<SurveyRecord[]>([]);
  const [target, setTarget] = useState<TargetConfig>(DEFAULT_TARGET);
  const [history, setHistory] = useState<DecisionHistoryEntry[]>([]);
  const [recoveryAssumptions, setRecoveryAssumptions] = useState<CapabilityAssumptions>(
    DEFAULT_CAPABILITY_ASSUMPTIONS
  );
  const [assumptionSignOff, setAssumptionSignOff] = useState<AssumptionSignOff | null>(null);
  const [activeScenario, setActiveScenario] = useState<{ id: string; name: string } | null>(null);
  const [branchProgram, setBranchProgram] = useState<BranchProgram | null>(null);
  const [holeRole, setHoleRole] = useState<"standard" | "mother" | "daughter">("standard");
  const [persistedBranchProgram, setPersistedBranchProgram] =
    useState<PersistedBranchProgram | null>(null);
  const [planCorridor, setPlanCorridor] = useState<PlanCorridorConfig>({
    ...DEFAULT_PLAN_CORRIDOR,
  });
  const [surveyToolProfile, setSurveyToolProfile] = useState<SurveyToolProfile>(
    DEFAULT_SURVEY_TOOL_PROFILE
  );
  const [referenceSystem, setReferenceSystemState] = useState<ReferenceSystemConfig>(
    DEFAULT_REFERENCE_SYSTEM
  );
  const [steeringSettings, setSteeringSettingsState] = useState<SteeringSettings>(
    DEFAULT_STEERING_SETTINGS
  );
  const [library, setLibrary] = useState<HoleLibrary | null>(null);
  const [storageHealth, setStorageHealth] = useState<StorageLoadStatus>("missing");
  const [storageError, setStorageError] = useState<string | null>(null);
  const [planEditNotice, setPlanEditNotice] = useState<string | null>(null);
  const libraryRef = useRef<HoleLibrary | null>(null);
  const skipSaveRef = useRef(true);
  const lastPersistedRef = useRef("");

  libraryRef.current = library;

  const setReferenceSystem = useCallback((next: ReferenceSystemConfig) => {
    const normalized = normalizeReferenceSystem(next);
    setReferenceSystemState(normalized);
    setSurveyToolProfile((prev) =>
      normalizeSurveyToolProfile({
        ...prev,
        northReference: normalized.surveyReference,
      })
    );
  }, []);

  const pushHistory = useCallback(
    (entry: Omit<DecisionHistoryEntry, "id" | "timestamp">) => {
      setHistory((prev) =>
        [
          {
            ...entry,
            id: createHistoryId(),
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, MAX_HISTORY)
      );
    },
    []
  );

  const logRecommendation = useCallback(
    (reco: Recommendation | null, actionTaken?: string) => {
      if (!reco) return;
      pushHistory({
        type: "recommendation_snapshot",
        summary: `Recommendation at MD ${reco.current.md.toFixed(0)} m — ${reco.classification.label}`,
        detail: formatRecommendationSnapshot(reco),
        md: reco.current.md,
        statusLabel: reco.classification.label,
        actionTaken,
      });
    },
    [pushHistory]
  );

  const applySampleTarget = useCallback((plan: SurveyRecord[]) => {
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
  }, []);

  const loadSampleData = useCallback(
    (logEvent = true) => {
      const plan = parseSurveyCsv(SAMPLE_PLAN_CSV);
      const actual = parseSurveyCsv(SAMPLE_ACTUAL_CSV);
      setPlanRecords(plan);
      setActualRecords(actual);
      setTarget(applySampleTarget(plan));
      setActiveScenario(null);
      if (logEvent) {
        pushHistory({
          type: "data_loaded",
          summary: "Sample plan and actual surveys loaded",
          detail: `${plan.length} plan stations, ${actual.length} actual surveys`,
          actionTaken: "Load sample",
        });
      }
    },
    [applySampleTarget, pushHistory]
  );

  const currentSnapshot = useCallback((): SavedHoleProject => {
    const base = snapshotProject({
      holeId,
      holeName,
      siteName,
      planRecords,
      actualRecords,
      target,
      mode,
      history,
      recoveryAssumptions,
      assumptionSignOff,
      activeScenario,
      planCorridor,
      surveyToolProfile,
      referenceSystem,
      steeringSettings,
      holeRole,
      branchProgram: holeRole === "mother" ? persistedBranchProgram : null,
    });
    const activeInLib = libraryRef.current
      ? findHole(libraryRef.current, holeId)
      : undefined;
    if (!activeInLib) return base;

    let plannerMeta = activeInLib.plannerMeta ?? null;
    if (plannerMeta && plannerStatus({ ...base, plannerMeta }) === "active") {
      const withMeta = { ...base, plannerMeta };
      if (
        actualRecords.length > 1 &&
        plannerMeta.executionStatus?.state === "not-started"
      ) {
        const marked = markExecutionDrilling(withMeta);
        plannerMeta = marked.plannerMeta ?? plannerMeta;
      }
    }

    return {
      ...base,
      programId: activeInLib.programId,
      parentHoleId: activeInLib.parentHoleId,
      parentHoleName: activeInLib.parentHoleName,
      kickoffMd: activeInLib.kickoffMd,
      kickoffE: activeInLib.kickoffE,
      kickoffN: activeInLib.kickoffN,
      kickoffD: activeInLib.kickoffD,
      kickoffDip: activeInLib.kickoffDip,
      kickoffAzimuth: activeInLib.kickoffAzimuth,
      branchTargetId: activeInLib.branchTargetId,
      branchMethod: activeInLib.branchMethod,
      branchStatus: activeInLib.branchStatus,
      plannerMeta,
      branchProgram:
        holeRole === "mother" ? persistedBranchProgram : activeInLib.branchProgram,
    };
  }, [
    holeId,
    holeName,
    siteName,
    planRecords,
    actualRecords,
    target,
    mode,
    history,
    recoveryAssumptions,
    assumptionSignOff,
    activeScenario,
    planCorridor,
    surveyToolProfile,
    referenceSystem,
    steeringSettings,
    holeRole,
    persistedBranchProgram,
  ]);

  const persistLibrary = useCallback(
    (nextLibrary: HoleLibrary) => {
      setLibrary(nextLibrary);
      if (!suspendPersistence) {
        saveLibrary(nextLibrary);
      }
    },
    [suspendPersistence]
  );

  const guardPlanEdit = useCallback(
    (field: "planRecords" | "target" | "planCorridor"): boolean => {
      const activeInLib = libraryRef.current
        ? findHole(libraryRef.current, holeId)
        : undefined;
      if (!activeInLib) return true;
      const err = guardLockedPlanEdit(activeInLib, field);
      if (err) {
        setPlanEditNotice(err);
        return false;
      }
      setPlanEditNotice(null);
      return true;
    },
    [holeId]
  );

  const planFieldsLocked = useMemo(() => {
    if (!library) return false;
    const active = findHole(library, holeId);
    if (!active) return false;
    return guardLockedPlanEdit(active, "target") != null;
  }, [library, holeId]);

  const setPlanRecordsGuarded = useCallback(
    (records: SurveyRecord[]) => {
      if (!guardPlanEdit("planRecords")) return;
      setPlanRecords(records);
    },
    [guardPlanEdit]
  );

  const setTargetGuarded = useCallback(
    (next: TargetConfig | ((prev: TargetConfig) => TargetConfig)) => {
      if (!guardPlanEdit("target")) return;
      setTarget(next);
    },
    [guardPlanEdit]
  );

  const setPlanCorridorGuarded = useCallback(
    (next: PlanCorridorConfig) => {
      if (!guardPlanEdit("planCorridor")) return;
      setPlanCorridor(next);
    },
    [guardPlanEdit]
  );

  const applyHole = useCallback(
    (project: SavedHoleProject, lib?: HoleLibrary | null) => {
      skipSaveRef.current = true;
      const role = project.holeRole ?? "standard";
      setHoleRole(role);
      setPersistedBranchProgram(project.branchProgram ?? null);
      const libNow = lib ?? libraryRef.current;
      if (libNow && role === "mother" && project.branchProgram) {
        setBranchProgram(branchProgramViewModel(libNow, project.holeId));
      } else if (libNow && role === "daughter" && project.programId) {
        const mother = libNow.holes.find(
          (h) =>
            h.holeRole === "mother" && h.branchProgram?.programId === project.programId
        );
        if (mother) setBranchProgram(branchProgramViewModel(libNow, mother.holeId));
        else setBranchProgram(null);
      } else {
        setBranchProgram(null);
      }
      lastPersistedRef.current = snapshotFingerprint(project);
      applyProjectToState(project, {
        setHoleId,
        setHoleName,
        setSiteName,
        setMode,
        setPlanRecords,
        setActualRecords,
        setTarget,
        setHistory,
        setRecoveryAssumptions,
        setAssumptionSignOff,
        setActiveScenario,
        setPlanCorridor,
        setSurveyToolProfile,
        setReferenceSystem,
        setSteeringSettings: setSteeringSettingsState,
      });
    },
    []
  );

  const initFreshSampleLibrary = useCallback(() => {
    const sample = buildProjectFromSampleData(
      "DDH-0247",
      "",
      SAMPLE_PLAN_CSV,
      SAMPLE_ACTUAL_CSV,
      "ddh-0247"
    );
    const initialLibrary = createLibraryWithHole(sample);
    saveLibrary(initialLibrary);
    setLibrary(initialLibrary);
    libraryRef.current = initialLibrary;
    setStorageHealth("ok");
    setStorageError(null);
    const active = getActiveHole(initialLibrary);
    if (active) applyHole(active, initialLibrary);
    else loadSampleData(false);
    skipSaveRef.current = true;
  }, [applyHole, loadSampleData]);

  useEffect(() => {
    const loaded = loadLibraryWithStatus();
    setStorageHealth(loaded.status);
    setStorageError(loaded.error ?? null);

    if (loaded.status === "corrupt") {
      setLibrary(null);
      libraryRef.current = null;
      setHydrated(true);
      return;
    }

    let initialLibrary = loaded.library ?? null;
    if (!initialLibrary) {
      const legacy = loadProject();
      if (legacy && legacy.planRecords.length > 0) {
        initialLibrary = migrateLegacyProject(legacy);
        saveLibrary(initialLibrary);
        setStorageHealth("ok");
      } else {
        initFreshSampleLibrary();
        setHydrated(true);
        return;
      }
    }

    const active = getActiveHole(initialLibrary);
    if (active) {
      applyHole(active, initialLibrary);
    } else {
      loadSampleData(false);
    }
    setLibrary(initialLibrary);
    libraryRef.current = initialLibrary;
    skipSaveRef.current = true;
    setHydrated(true);
  }, [applyHole, loadSampleData, initFreshSampleLibrary]);

  useEffect(() => {
    if (!hydrated || suspendPersistence || !libraryRef.current) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    const snapshot = currentSnapshot();
    const fingerprint = snapshotFingerprint(snapshot);
    if (fingerprint === lastPersistedRef.current) return;
    lastPersistedRef.current = fingerprint;

    const nextLibrary = upsertHole(
      { ...libraryRef.current, activeHoleId: snapshot.holeId },
      snapshot
    );
    libraryRef.current = nextLibrary;
    persistLibrary(nextLibrary);
  }, [
    hydrated,
    holeId,
    holeName,
    siteName,
    planRecords,
    actualRecords,
    target,
    mode,
    history,
    recoveryAssumptions,
    assumptionSignOff,
    activeScenario,
    planCorridor,
    surveyToolProfile,
    referenceSystem,
    steeringSettings,
    holeRole,
    persistedBranchProgram,
    suspendPersistence,
    currentSnapshot,
    persistLibrary,
  ]);

  const resetRecoveryAssumptions = useCallback(() => {
    setRecoveryAssumptions({ ...DEFAULT_CAPABILITY_ASSUMPTIONS });
  }, []);

  const resetSteeringSettings = useCallback(() => {
    setSteeringSettingsState(normalizeSteeringSettings(null));
  }, []);

  const setSteeringSettings = useCallback((next: SteeringSettings) => {
    setSteeringSettingsState(normalizeSteeringSettings(next));
  }, []);

  const switchHole = useCallback(
    (nextHoleId: string) => {
      if (!library || nextHoleId === holeId) return;
      let nextLibrary = upsertHole(library, currentSnapshot());
      const switched = setActiveHole(nextLibrary, nextHoleId);
      if (!switched) return;
      const hole = getActiveHole(switched);
      if (!hole) return;
      persistLibrary(switched);
      applyHole(hole, switched);
    },
    [library, holeId, currentSnapshot, persistLibrary, applyHole]
  );

  const createNewHole = useCallback(
    (withSample: boolean) => {
      if (!library) return;
      let nextLibrary = upsertHole(library, currentSnapshot());
      const name = uniqueHoleName(nextLibrary, withSample ? "DDH-0247" : "New hole");
      const project = withSample
        ? buildProjectFromSampleData(name, siteName, SAMPLE_PLAN_CSV, SAMPLE_ACTUAL_CSV)
        : buildBlankProject(name, siteName);
      nextLibrary = {
        version: 1 as const,
        activeHoleId: project.holeId,
        holes: [...nextLibrary.holes, project],
      };
      persistLibrary(nextLibrary);
      applyHole(project);
    },
    [library, currentSnapshot, siteName, persistLibrary, applyHole]
  );

  const duplicateCurrentHole = useCallback(() => {
    if (!library) return;
    const nextLibrary = upsertHole(library, currentSnapshot());
    const copyName = uniqueHoleName(nextLibrary, `${holeName} (copy)`);
    const duped = duplicateHole(nextLibrary, holeId, copyName);
    if (!duped) return;
    persistLibrary(duped);
    const hole = getActiveHole(duped);
    if (hole) applyHole(hole);
  }, [library, currentSnapshot, holeName, holeId, persistLibrary, applyHole]);

  const deleteCurrentHole = useCallback(() => {
    if (!library) return false;
    const nextLibrary = removeHole(upsertHole(library, currentSnapshot()), holeId);
    if (!nextLibrary) return false;
    persistLibrary(nextLibrary);
    const hole = getActiveHole(nextLibrary);
    if (hole) applyHole(hole);
    return true;
  }, [library, currentSnapshot, holeId, persistLibrary, applyHole]);

  const resetHole = useCallback(() => {
    if (!library) return;
    const nextLibrary = resetActiveHoleInLibrary(library, holeId);
    if (!nextLibrary) return;
    persistLibrary(nextLibrary);
    const hole = findHole(nextLibrary, holeId);
    if (hole) {
      applyHole(hole, nextLibrary);
      setBranchProgram(null);
      setPersistedBranchProgram(null);
      setHoleRole("standard");
    }
    pushHistory({
      type: "data_loaded",
      summary: `Active hole reset — surveys, target, corridor, and history cleared for ${hole?.holeName ?? "hole"}`,
      actionTaken: "Reset active hole",
    });
  }, [library, holeId, persistLibrary, applyHole, pushHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const loadTestScenario = useCallback(
    (scenarioId: string): string => {
      const scenario = findScenario(scenarioId);
      if (!scenario) return "Unknown test scenario.";

      if (scenario.kind === "invalid-import") {
        const records = parseSurveyCsv(scenario.invalidCsv ?? "");
        pushHistory({
          type: "data_loaded",
          summary: "Invalid CSV import demo",
          detail: scenario.description,
          actionTaken: "Load test scenario",
        });
        if (records.length === 0) {
          return "No valid surveys found. Expected columns: MD, dip, azimuth (see the example template).";
        }
        return "Unexpected: malformed CSV still parsed records.";
      }

      setBranchProgram(null);
      const plan = parseSurveyCsv(scenario.planCsv);
      const actual = parseSurveyCsv(scenario.actualCsv);
      setHoleName(scenario.name);
      setSiteName(scenario.site);
      setPlanRecords(plan);
      setActualRecords(actual);
      setTarget(scenarioTarget(scenario));
      setReferenceSystem(normalizeReferenceSystem(scenario.referenceSystem));
      setActiveScenario({ id: scenario.id, name: scenario.name });
      setAssumptionSignOff(null);
      pushHistory({
        type: "data_loaded",
        summary: `Test scenario loaded — ${scenario.name}`,
        detail: `${scenario.description} Expected: ${scenario.expectedStatus}.`,
        actionTaken: "Load test scenario",
      });
      return `${scenario.name} loaded — expect “${scenario.expectedStatus}”. ${scenario.expectedAction}`;
    },
    [pushHistory, setReferenceSystem]
  );

  const loadBranchScenario = useCallback(
    (scenarioId: string): string => {
      const scenario = findBranchScenario(scenarioId);
      if (!scenario) return "Unknown branch program scenario.";
      if (!library) return "Library not ready.";

      let nextLib = upsertHole(library, currentSnapshot());
      const motherId = slugifyHoleId(scenario.mother.holeId);
      const motherHole = findHole(nextLib, motherId) ?? findHole(nextLib, holeId);
      const targetMotherId = motherHole?.holeId ?? holeId;

      const motherProject: SavedHoleProject = {
        ...(findHole(nextLib, targetMotherId) ?? currentSnapshot()),
        holeId: targetMotherId,
        holeName: scenario.mother.holeId,
        siteName: scenario.site,
        planRecords: scenario.mother.planRecords,
        actualRecords: scenario.mother.actualRecords,
        target: targetFromPlanRecords(scenario.mother.planRecords, {
          maxDls: 3,
          nextInterval: 30,
        }),
        holeRole: "mother",
        activeScenario: {
          id: scenario.id,
          name: `Scenario lab · Branch · ${scenario.name}`,
        },
      };
      nextLib = upsertHole(nextLib, motherProject);
      const imported = importScenarioAsProgram(nextLib, targetMotherId, scenario);
      if (!imported) return "Could not import branch program.";
      nextLib = { ...imported, activeHoleId: targetMotherId };
      persistLibrary(nextLib);
      const active = getActiveHole(nextLib);
      if (active) applyHole(active, nextLib);
      pushHistory({
        type: "data_loaded",
        summary: `Branch program loaded — ${scenario.name}`,
        detail: scenario.description ?? "",
        actionTaken: "Load branch scenario",
      });
      return `${scenario.name} loaded — ${scenario.expectedInsight ?? ""}`;
    },
    [pushHistory, library, currentSnapshot, persistLibrary, applyHole, holeId]
  );

  const getMotherHoleId = useCallback((): string | null => {
    if (!library) return null;
    if (holeRole === "mother") return holeId;
    if (holeRole === "daughter") {
      const active = findHole(library, holeId);
      return (
        library.holes.find(
          (h) =>
            h.holeRole === "mother" &&
            h.branchProgram?.programId === active?.programId
        )?.holeId ?? null
      );
    }
    return null;
  }, [library, holeRole, holeId]);

  const persistBranchProgram = useCallback(
    (program: PersistedBranchProgram) => {
      const motherId = getMotherHoleId();
      if (!library || !motherId) return;
      let nextLib = upsertHole(library, currentSnapshot());
      nextLib = updateMotherBranchProgram(nextLib, motherId, program) ?? nextLib;
      setPersistedBranchProgram(program);
      setBranchProgram(branchProgramViewModel(nextLib, motherId));
      persistLibrary(nextLib);
    },
    [library, getMotherHoleId, currentSnapshot, persistLibrary]
  );

  const initBranchProgram = useCallback(() => {
    const motherId = holeRole === "mother" ? holeId : getMotherHoleId();
    if (!library || !motherId) return;
    let nextLib = upsertHole(library, currentSnapshot());
    nextLib = createBranchProgramOnMother(nextLib, motherId, siteName) ?? nextLib;
    persistLibrary(nextLib);
    const m = findHole(nextLib, motherId);
    if (m) applyHole(m, nextLib);
  }, [library, holeId, holeRole, siteName, currentSnapshot, persistLibrary, applyHole, getMotherHoleId]);

  const branchAddTarget = useCallback(
    (target: Omit<BranchTarget, "id">) => {
      const motherId = getMotherHoleId();
      if (!library || !motherId) return;
      let nextLib = upsertHole(library, currentSnapshot());
      nextLib = libAddTarget(nextLib, motherId, target) ?? nextLib;
      persistLibrary(nextLib);
      const m = findHole(nextLib, motherId);
      if (m) applyHole(m, nextLib);
    },
    [library, getMotherHoleId, currentSnapshot, persistLibrary, applyHole]
  );

  const branchSaveDaughter = useCallback(
    (input: CreateDaughterInput) => {
      const motherId = getMotherHoleId();
      if (!library || !motherId) return null;
      let nextLib = upsertHole(library, currentSnapshot());
      const result = createDaughterFromKickoff(nextLib, motherId, input);
      if (!result) return null;
      persistLibrary(result.library);
      const m = findHole(result.library, motherId);
      if (m) applyHole(m, result.library);
      return result.daughterHoleId;
    },
    [library, getMotherHoleId, currentSnapshot, persistLibrary, applyHole]
  );

  const branchSetActiveDaughter = useCallback(
    (daughterHoleId: string | null) => {
      const motherId = getMotherHoleId();
      if (!library || !motherId) return;
      let nextLib = upsertHole(library, currentSnapshot());
      nextLib = libSetActiveDaughter(nextLib, motherId, daughterHoleId) ?? nextLib;
      persistLibrary(nextLib);
      const active = getActiveHole(nextLib);
      if (active) applyHole(active, nextLib);
    },
    [library, getMotherHoleId, currentSnapshot, persistLibrary, applyHole]
  );

  const branchSetDaughterStatus = useCallback(
    (daughterHoleId: string, status: import("@/lib/drilling/branch-program-types").DaughterStatus) => {
      const motherId = getMotherHoleId();
      if (!library || !motherId) return;
      let nextLib = upsertHole(library, currentSnapshot());
      nextLib = libSetDaughterStatus(nextLib, motherId, daughterHoleId, status) ?? nextLib;
      persistLibrary(nextLib);
      const m = findHole(nextLib, motherId);
      if (m) applyHole(m, nextLib);
    },
    [library, getMotherHoleId, currentSnapshot, persistLibrary, applyHole]
  );

  const importSurveysToHole = useCallback(
    (targetHoleId: string, type: "plan" | "actual", records: SurveyRecord[]) => {
      if (!library) return;
      if (type === "plan" && targetHoleId === holeId && !guardPlanEdit("planRecords")) {
        return;
      }
      let nextLib = upsertHole(library, currentSnapshot());
      const hole = findHole(nextLib, targetHoleId);
      if (!hole) return;
      const updated =
        type === "plan"
          ? { ...hole, planRecords: records }
          : { ...hole, actualRecords: records };
      nextLib = upsertHole(nextLib, updated);
      if (targetHoleId === holeId) {
        if (type === "plan") setPlanRecords(records);
        else setActualRecords(records);
      }
      persistLibrary(nextLib);
    },
    [library, currentSnapshot, holeId, persistLibrary, guardPlanEdit]
  );

  const loadSyntheticHole = useCallback(
    (params: SyntheticHoleParams): string => {
      setBranchProgram(null);
      const project = syntheticHoleToProject({
        ...params,
        siteName: params.siteName ?? siteName,
      });
      setHoleName(project.holeName);
      setSiteName(project.siteName ?? "");
      setPlanRecords(project.planRecords);
      setActualRecords(project.actualRecords);
      setTarget(project.target);
      setActiveScenario(project.activeScenario ?? null);
      setPlanCorridor(
        derivePlanCorridorFromPlan(project.planRecords, params.surveyInterval)
      );
      setAssumptionSignOff(null);
      pushHistory({
        type: "data_loaded",
        summary: `Scenario lab — ${project.holeName}`,
        detail: params.expectedOutcomeLabel ?? params.driftPattern,
        actionTaken: "Generate scenario",
      });
      const label = params.expectedOutcomeLabel?.trim();
      return label
        ? `${project.holeName} loaded — ${label}`
        : `${project.holeName} loaded from Scenario lab (${params.driftPattern}).`;
    },
    [pushHistory, siteName]
  );

  const seedPlanCorridorFromPlan = useCallback((plan: SurveyRecord[]) => {
    if (plan.length >= 2) {
      setPlanCorridor(derivePlanCorridorFromPlan(plan, target.nextInterval));
    }
  }, [target.nextInterval]);

  const branchUpdateTarget = useCallback(
    (targetId: string, patch: Partial<BranchTarget>) => {
      const motherId = getMotherHoleId();
      if (!library || !motherId) return;
      let nextLib = upsertHole(library, currentSnapshot());
      nextLib = libUpdateTarget(nextLib, motherId, targetId, patch) ?? nextLib;
      persistLibrary(nextLib);
      const m = findHole(nextLib, motherId);
      if (m) applyHole(m, nextLib);
    },
    [library, getMotherHoleId, currentSnapshot, persistLibrary, applyHole]
  );

  const branchRemoveTarget = useCallback(
    (targetId: string) => {
      const motherId = getMotherHoleId();
      if (!library || !motherId) return;
      let nextLib = upsertHole(library, currentSnapshot());
      nextLib = libRemoveTarget(nextLib, motherId, targetId) ?? nextLib;
      persistLibrary(nextLib);
      const m = findHole(nextLib, motherId);
      if (m) applyHole(m, nextLib);
    },
    [library, getMotherHoleId, currentSnapshot, persistLibrary, applyHole]
  );

  const branchArchiveDaughter = useCallback(
    (daughterHoleId: string) => {
      const motherId = getMotherHoleId();
      if (!library || !motherId) return;
      let nextLib = upsertHole(library, currentSnapshot());
      nextLib = libArchiveDaughter(nextLib, motherId, daughterHoleId) ?? nextLib;
      persistLibrary(nextLib);
      const m = findHole(nextLib, motherId);
      if (m) applyHole(m, nextLib);
    },
    [library, getMotherHoleId, currentSnapshot, persistLibrary, applyHole]
  );

  const resetAllLocalData = useCallback(() => {
    clearLibrary();
    setBranchProgram(null);
    setPersistedBranchProgram(null);
    setStorageHealth("missing");
    setStorageError(null);
    initFreshSampleLibrary();
    setHydrated(true);
  }, [initFreshSampleLibrary]);

  const importHolePackage = useCallback(
    (nextLibrary: HoleLibrary) => {
      saveLibrary(nextLibrary);
      setLibrary(nextLibrary);
      libraryRef.current = nextLibrary;
      setStorageHealth("ok");
      setStorageError(null);
      const active = getActiveHole(nextLibrary);
      if (active) applyHole(active, nextLibrary);
      skipSaveRef.current = true;
    },
    [applyHole]
  );

  const branchApproveDaughter = useCallback(
    (daughterHoleId: string, snapshot: BranchApprovalSnapshot) => {
      const motherId = getMotherHoleId();
      if (!library || !motherId) return;
      let nextLib = upsertHole(library, currentSnapshot());
      nextLib = libSetDaughterApproval(nextLib, motherId, daughterHoleId, snapshot) ?? nextLib;
      persistLibrary(nextLib);
      const m = findHole(nextLib, motherId);
      if (m) applyHole(m, nextLib);
      pushHistory({
        type: "supervisor_decision",
        summary: `Branch plan approved — ${snapshot.approvedBy}`,
        detail: `Kickoff MD ${snapshot.approvedKickoffMd} m`,
        actionTaken: "Approve branch plan",
      });
    },
    [library, getMotherHoleId, currentSnapshot, persistLibrary, applyHole, pushHistory]
  );

  const completePlannerPlanExecution = useCallback(
    (opts?: { completedBy?: string; completionNotes?: string; notes?: string }) => {
      if (!library) return false;
      const result = completePlannerExecution(library, holeId, opts);
      if (!result) return false;
      persistLibrary(result.library);
      applyHole(result.completedHole, result.library);
      return true;
    },
    [library, holeId, persistLibrary, applyHole]
  );

  return {
    hydrated,
    holeId,
    holeName,
    setHoleName,
    siteName,
    setSiteName,
    mode,
    setMode,
    planRecords,
    setPlanRecords: setPlanRecordsGuarded,
    actualRecords,
    setActualRecords,
    target,
    setTarget: setTargetGuarded,
    history,
    pushHistory,
    logRecommendation,
    loadSampleData,
    resetHole,
    clearHistory,
    library,
    switchHole,
    createNewHole,
    duplicateCurrentHole,
    deleteCurrentHole,
    recoveryAssumptions,
    setRecoveryAssumptions,
    resetRecoveryAssumptions,
    assumptionSignOff,
    setAssumptionSignOff,
    activeScenario,
    setActiveScenario,
    loadTestScenario,
    loadBranchScenario,
    loadSyntheticHole,
    branchProgram,
    setBranchProgram,
    holeRole,
    persistedBranchProgram,
    persistBranchProgram,
    initBranchProgram,
    branchAddTarget,
    branchUpdateTarget,
    branchRemoveTarget,
    branchSaveDaughter,
    branchSetActiveDaughter,
    branchSetDaughterStatus,
    branchArchiveDaughter,
    branchApproveDaughter,
    getMotherHoleId,
    importSurveysToHole,
    planCorridor,
    setPlanCorridor: setPlanCorridorGuarded,
    planEditNotice,
    planFieldsLocked,
    setPlanEditNotice,
    surveyToolProfile,
    setSurveyToolProfile,
    referenceSystem,
    setReferenceSystem,
    steeringSettings,
    setSteeringSettings,
    resetSteeringSettings,
    seedPlanCorridorFromPlan,
    storageHealth,
    storageError,
    resetAllLocalData,
    initFreshSampleLibrary,
    importHolePackage,
    completePlannerPlanExecution,
  };
}
