"use client";

import { useCallback, useState } from "react";
import {
  PLANNER_GUIDE_STEPS,
  type PlannerGuideStep,
  type PlannerGuideTab,
} from "@/lib/drilling/planner-guide-flow";

type Options = {
  onTabChange: (tab: PlannerGuideTab) => void;
};

export type PlannerGuideState = {
  active: boolean;
  stepIndex: number;
  stepCount: number;
  currentStep: PlannerGuideStep;
  start: () => void;
  next: () => void;
  prev: () => void;
  restart: () => void;
  exit: () => void;
};

/**
 * Lightweight planner tour state. Unlike the dashboard guide there is no
 * project backup/restore: the tour never mutates plans, and the demo program
 * load it offers is idempotent and explicit.
 */
export function usePlannerGuide({ onTabChange }: Options): PlannerGuideState {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(PLANNER_GUIDE_STEPS.length - 1, index));
      setStepIndex(clamped);
      onTabChange(PLANNER_GUIDE_STEPS[clamped]!.tab);
    },
    [onTabChange]
  );

  const start = useCallback(() => {
    setActive(true);
    goTo(0);
  }, [goTo]);

  const exit = useCallback(() => {
    setActive(false);
    setStepIndex(0);
  }, []);

  const next = useCallback(() => {
    if (stepIndex >= PLANNER_GUIDE_STEPS.length - 1) {
      exit();
      return;
    }
    goTo(stepIndex + 1);
  }, [stepIndex, goTo, exit]);

  const prev = useCallback(() => {
    goTo(stepIndex - 1);
  }, [stepIndex, goTo]);

  const restart = useCallback(() => {
    goTo(0);
  }, [goTo]);

  return {
    active,
    stepIndex,
    stepCount: PLANNER_GUIDE_STEPS.length,
    currentStep: PLANNER_GUIDE_STEPS[stepIndex]!,
    start,
    next,
    prev,
    restart,
    exit,
  };
}
