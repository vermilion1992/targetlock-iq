"use client";

import { useCallback, useRef, useState } from "react";
import {
  getPitchPlanRecords,
  getPitchStep,
  PITCH_STEP_COUNT,
  PITCH_STEPS,
  resolvePitchTarget,
} from "@/lib/drilling/pitch-scenario";
import type { DecisionHistoryEntry } from "@/lib/drilling/history";
import type { SurveyRecord, TargetConfig } from "@/lib/drilling/types";

type ProjectSnapshot = {
  planRecords: SurveyRecord[];
  actualRecords: SurveyRecord[];
  target: TargetConfig;
  mode: "simple" | "advanced";
  history: DecisionHistoryEntry[];
};

type ApplyPitchDeps = {
  setPlanRecords: (r: SurveyRecord[]) => void;
  setActualRecords: (r: SurveyRecord[]) => void;
  setTarget: (t: TargetConfig) => void;
  setMode: (m: "simple" | "advanced") => void;
  onActiveChange?: (active: boolean) => void;
};

export function usePitchMode(deps: ApplyPitchDeps) {
  const [pitchActive, setPitchActive] = useState(false);
  const [pitchStepIndex, setPitchStepIndex] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const backupRef = useRef<ProjectSnapshot | null>(null);

  const applyPitchStep = useCallback(
    (index: number) => {
      const step = getPitchStep(index);
      if (!step) return;
      deps.setPlanRecords(getPitchPlanRecords());
      deps.setActualRecords(step.actualRecords);
      deps.setTarget(resolvePitchTarget(step));
      deps.setMode(step.mode);
      if (step.showProductSummary) setSummaryOpen(true);
    },
    [deps]
  );

  const startPitch = useCallback(
    (snapshot: ProjectSnapshot) => {
      if (!pitchActive) {
        backupRef.current = snapshot;
        setPitchActive(true);
        deps.onActiveChange?.(true);
      }
      setSummaryOpen(false);
      setPitchStepIndex(0);
      applyPitchStep(0);
    },
    [applyPitchStep, deps, pitchActive]
  );

  const exitPitch = useCallback(() => {
    const backup = backupRef.current;
    if (backup) {
      deps.setPlanRecords(backup.planRecords);
      deps.setActualRecords(backup.actualRecords);
      deps.setTarget(backup.target);
      deps.setMode(backup.mode);
    }
    backupRef.current = null;
    setPitchActive(false);
    deps.onActiveChange?.(false);
    setPitchStepIndex(0);
    setSummaryOpen(false);
  }, [deps]);

  const nextPitchStep = useCallback(() => {
    if (pitchStepIndex >= PITCH_STEP_COUNT - 1) {
      exitPitch();
      return;
    }
    const next = pitchStepIndex + 1;
    setPitchStepIndex(next);
    applyPitchStep(next);
  }, [pitchStepIndex, applyPitchStep, exitPitch]);

  const prevPitchStep = useCallback(() => {
    if (pitchStepIndex <= 0) return;
    const prev = pitchStepIndex - 1;
    setPitchStepIndex(prev);
    applyPitchStep(prev);
  }, [pitchStepIndex, applyPitchStep]);

  const currentStep = getPitchStep(pitchStepIndex) ?? PITCH_STEPS[0];

  return {
    pitchActive,
    pitchStepIndex,
    pitchStepCount: PITCH_STEP_COUNT,
    currentStep,
    summaryOpen,
    setSummaryOpen,
    startPitch,
    exitPitch,
    nextPitchStep,
    prevPitchStep,
  };
}
