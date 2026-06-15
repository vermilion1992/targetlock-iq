"use client";

import type { PlannerPlanType, PlannerStepId } from "@/lib/drilling/planner-types";
import { PLANNER_STEPS } from "@/lib/drilling/planner-types";

type Props = {
  currentStep: PlannerStepId;
  planType: PlannerPlanType;
  onStepClick?: (step: PlannerStepId) => void;
};

function stepLabel(stepId: PlannerStepId, planType: PlannerPlanType): string {
  if (stepId === "collar") {
    return planType === "daughter" ? "Mother + kickoff" : "Collar coordinates";
  }
  const found = PLANNER_STEPS.find((s) => s.id === stepId);
  return found?.label ?? stepId;
}

function visibleSteps(planType: PlannerPlanType) {
  return PLANNER_STEPS.filter((step) => {
    if (step.id === "collar" && planType === "import") return false;
    if (step.id === "constraints" && planType === "import") return false;
    return true;
  });
}

export function PlannerStepper({ currentStep, planType, onStepClick }: Props) {
  const steps = visibleSteps(planType);
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <nav className="planner-stepper" aria-label="Planner steps">
      <ol className="planner-stepper-list">
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const active = step.id === currentStep;
          return (
            <li
              key={step.id}
              className={`planner-stepper-item ${done ? "done" : ""} ${active ? "active" : ""}`}
            >
              <button
                type="button"
                className="planner-stepper-button"
                onClick={() => onStepClick?.(step.id)}
                aria-current={active ? "step" : undefined}
              >
                <span className="planner-stepper-index">{index + 1}</span>
                <span className="planner-stepper-label">
                  {stepLabel(step.id, planType)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
