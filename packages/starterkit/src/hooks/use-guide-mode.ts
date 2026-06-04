"use client";

import { useCallback, useRef, useState } from "react";
import {
  getGuideFlowMeta,
  getGuideStep,
  getGuideStepCount,
  getGuideSteps,
  resolveGuideTab,
} from "@/lib/drilling/guide-flows";
import type { AdvancedTab, GuideFlowId, GuideStep } from "@/lib/drilling/guide-types";
import type { DecisionHistoryEntry } from "@/lib/drilling/history";
import type { HoleLibrary } from "@/lib/drilling/hole-library";
import type { SurveyRecord, TargetConfig } from "@/lib/drilling/types";

export type GuideProjectSnapshot = {
  planRecords: SurveyRecord[];
  actualRecords: SurveyRecord[];
  target: TargetConfig;
  mode: "simple" | "advanced";
  advancedTab: AdvancedTab;
  history: DecisionHistoryEntry[];
  library: HoleLibrary | null;
};

export type GuideUiDeps = {
  setMode: (m: "simple" | "advanced") => void;
  setAdvancedTab: (tab: AdvancedTab) => void;
  onActiveChange?: (active: boolean) => void;
  onRestoreSnapshot?: (snapshot: GuideProjectSnapshot) => void;
};

/** UI-only step application — never mutates survey data. */
export function applyGuideStepUi(
  step: GuideStep,
  deps: GuideUiDeps
): AdvancedTab | undefined {
  if (step.mode) deps.setMode(step.mode);
  const tab = resolveGuideTab(step);
  if (tab) deps.setAdvancedTab(tab);
  return tab;
}

export function useGuideMode(deps: GuideUiDeps) {
  const [guideActive, setGuideActive] = useState(false);
  const [flowId, setFlowId] = useState<GuideFlowId | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [centerOpen, setCenterOpen] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [pendingFlowId, setPendingFlowId] = useState<GuideFlowId | null>(null);
  const backupRef = useRef<GuideProjectSnapshot | null>(null);

  const activeFlowId = flowId ?? "standard";
  const steps = flowId ? getGuideSteps(flowId) : [];
  const stepCount = flowId ? getGuideStepCount(flowId) : 0;
  const currentStep = flowId
    ? (getGuideStep(flowId, stepIndex) ?? getGuideSteps(flowId)[0])
    : getGuideSteps("standard")[0];

  const applyStep = useCallback(
    (index: number, activeFlow: GuideFlowId) => {
      const step = getGuideStep(activeFlow, index);
      if (!step) return;
      applyGuideStepUi(step, deps);
    },
    [deps]
  );

  const startGuide = useCallback(
    (id: GuideFlowId, snapshot: GuideProjectSnapshot) => {
      if (!guideActive) {
        backupRef.current = snapshot;
        setGuideActive(true);
        deps.onActiveChange?.(true);
      }
      setFlowId(id);
      setDemoLoaded(false);
      setCenterOpen(false);
      setStepIndex(0);
      applyStep(0, id);
    },
    [applyStep, deps, guideActive]
  );

  const exitGuide = useCallback(() => {
    const backup = backupRef.current;
    if (backup) {
      deps.onRestoreSnapshot?.(backup);
      deps.setMode(backup.mode);
      deps.setAdvancedTab(backup.advancedTab);
    }
    backupRef.current = null;
    setGuideActive(false);
    setFlowId(null);
    setDemoLoaded(false);
    setStepIndex(0);
    setPendingFlowId(null);
    deps.onActiveChange?.(false);
    setCenterOpen(false);
  }, [deps]);

  const restartGuide = useCallback(() => {
    const backup = backupRef.current;
    const active = flowId;
    if (!backup || !active) return;
    deps.onRestoreSnapshot?.(backup);
    setDemoLoaded(false);
    setStepIndex(0);
    applyStep(0, active);
  }, [applyStep, deps, flowId]);

  const nextStep = useCallback(() => {
    if (!flowId) return;
    if (stepIndex >= stepCount - 1) {
      exitGuide();
      return;
    }
    const next = stepIndex + 1;
    setStepIndex(next);
    applyStep(next, flowId);
  }, [applyStep, exitGuide, flowId, stepCount, stepIndex]);

  const prevStep = useCallback(() => {
    if (!flowId || stepIndex <= 0) return;
    const prev = stepIndex - 1;
    setStepIndex(prev);
    applyStep(prev, flowId);
  }, [applyStep, flowId, stepIndex]);

  const openTabForCurrentStep = useCallback(() => {
    if (!flowId) return;
    const step = getGuideStep(flowId, stepIndex);
    if (!step) return;
    deps.setMode("advanced");
    const tab = resolveGuideTab(step);
    if (tab) deps.setAdvancedTab(tab);
  }, [deps, flowId, stepIndex]);

  const flowMeta = flowId ? getGuideFlowMeta(flowId) : null;

  return {
    guideActive,
    flowId,
    flowMeta,
    stepIndex,
    stepCount,
    currentStep,
    steps,
    centerOpen,
    setCenterOpen,
    pendingFlowId,
    setPendingFlowId,
    startGuide,
    exitGuide,
    restartGuide,
    nextStep,
    prevStep,
    openTabForCurrentStep,
    demoLoaded,
    setDemoLoaded,
  };
}
