"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseSurveyCsv } from "@/lib/drilling/csv";
import { buildStations } from "@/lib/drilling/desurvey";
import {
  buildBlankProject,
  buildProjectFromSampleData,
  createLibraryWithHole,
  duplicateHole,
  getActiveHole,
  migrateLegacyProject,
  removeHole,
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
  loadLibrary,
  loadProject,
  saveLibrary,
  type SavedHoleProject,
} from "@/lib/drilling/storage";
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
  syntheticHoleToProject,
  type SyntheticHoleParams,
} from "@/lib/drilling/synthetic-hole-builder";
import {
  DEFAULT_SURVEY_TOOL_PROFILE,
  normalizeSurveyToolProfile,
  type SurveyToolProfile,
} from "@/lib/drilling/survey-tool-profile";
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
  const [planCorridor, setPlanCorridor] = useState<PlanCorridorConfig>({
    ...DEFAULT_PLAN_CORRIDOR,
  });
  const [surveyToolProfile, setSurveyToolProfile] = useState<SurveyToolProfile>(
    DEFAULT_SURVEY_TOOL_PROFILE
  );
  const [library, setLibrary] = useState<HoleLibrary | null>(null);
  const libraryRef = useRef<HoleLibrary | null>(null);
  const skipSaveRef = useRef(true);
  const lastPersistedRef = useRef("");

  libraryRef.current = library;

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

  const currentSnapshot = useCallback(
    (): SavedHoleProject =>
      snapshotProject({
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
      }),
    [
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
    ]
  );

  const persistLibrary = useCallback(
    (nextLibrary: HoleLibrary) => {
      setLibrary(nextLibrary);
      if (!suspendPersistence) {
        saveLibrary(nextLibrary);
      }
    },
    [suspendPersistence]
  );

  const applyHole = useCallback((project: SavedHoleProject) => {
    skipSaveRef.current = true;
    lastPersistedRef.current = JSON.stringify({
      holeId: project.holeId,
      holeName: project.holeName,
      siteName: project.siteName,
      planRecords: project.planRecords,
      actualRecords: project.actualRecords,
      target: project.target,
      mode: project.mode,
      history: project.history ?? [],
      recoveryAssumptions: normalizeCapabilityAssumptions(project.recoveryAssumptions),
      assumptionSignOff: project.assumptionSignOff ?? null,
      activeScenario: project.activeScenario ?? null,
      planCorridor: project.planCorridor ?? null,
      surveyToolProfile: project.surveyToolProfile ?? null,
    });
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
    });
  }, []);

  useEffect(() => {
    let initialLibrary = loadLibrary();
    if (!initialLibrary) {
      const legacy = loadProject();
      if (legacy && legacy.planRecords.length > 0) {
        initialLibrary = migrateLegacyProject(legacy);
        saveLibrary(initialLibrary);
      } else {
        const sample = buildProjectFromSampleData(
          "DDH-0247",
          "",
          SAMPLE_PLAN_CSV,
          SAMPLE_ACTUAL_CSV,
          "ddh-0247"
        );
        initialLibrary = createLibraryWithHole(sample);
        saveLibrary(initialLibrary);
      }
    }
    const active = getActiveHole(initialLibrary);
    if (active) {
      applyHole(active);
    } else {
      loadSampleData(false);
    }
    setLibrary(initialLibrary);
    skipSaveRef.current = true;
    setHydrated(true);
  }, [applyHole, loadSampleData]);

  useEffect(() => {
    if (!hydrated || suspendPersistence || !libraryRef.current) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    const snapshot = currentSnapshot();
    const fingerprint = JSON.stringify({
      holeId: snapshot.holeId,
      holeName: snapshot.holeName,
      siteName: snapshot.siteName,
      planRecords: snapshot.planRecords,
      actualRecords: snapshot.actualRecords,
      target: snapshot.target,
      mode: snapshot.mode,
      history: snapshot.history,
      recoveryAssumptions: snapshot.recoveryAssumptions,
      assumptionSignOff: snapshot.assumptionSignOff ?? null,
      activeScenario: snapshot.activeScenario ?? null,
      planCorridor: snapshot.planCorridor ?? null,
      surveyToolProfile: snapshot.surveyToolProfile ?? null,
    });
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
    suspendPersistence,
    currentSnapshot,
    persistLibrary,
  ]);

  const resetRecoveryAssumptions = useCallback(() => {
    setRecoveryAssumptions({ ...DEFAULT_CAPABILITY_ASSUMPTIONS });
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
      applyHole(hole);
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
    clearLibrary();
    const sample = buildProjectFromSampleData(
      "DDH-0247",
      "",
      SAMPLE_PLAN_CSV,
      SAMPLE_ACTUAL_CSV,
      "ddh-0247"
    );
    const nextLibrary: HoleLibrary = createLibraryWithHole(sample);
    saveLibrary(nextLibrary);
    setLibrary(nextLibrary);
    applyHole(sample);
    pushHistory({
      type: "data_loaded",
      summary: "Hole reset to sample package",
      actionTaken: "Reset hole",
    });
  }, [applyHole, pushHistory]);

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

      const plan = parseSurveyCsv(scenario.planCsv);
      const actual = parseSurveyCsv(scenario.actualCsv);
      setHoleName(scenario.name);
      setSiteName(scenario.site);
      setPlanRecords(plan);
      setActualRecords(actual);
      setTarget(scenarioTarget(scenario));
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
    [pushHistory]
  );

  const loadSyntheticHole = useCallback(
    (params: SyntheticHoleParams): string => {
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
    setPlanRecords,
    actualRecords,
    setActualRecords,
    target,
    setTarget,
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
    loadSyntheticHole,
    planCorridor,
    setPlanCorridor,
    surveyToolProfile,
    setSurveyToolProfile,
    seedPlanCorridorFromPlan,
  };
}
