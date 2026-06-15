"use client";

import type { ReactNode } from "react";
import type { PlannerPlanType, PlannerStepId } from "@/lib/drilling/planner-types";
import { PlannerStepper } from "./PlannerStepper";
import { PlannerSectionHeader } from "./ui/PlannerSectionHeader";

type Props = {
  currentStep: PlannerStepId;
  planType: PlannerPlanType;
  onStepClick?: (step: PlannerStepId) => void;
  stepContent: ReactNode;
  footer?: ReactNode;
};

export function PlannerCreateView({
  currentStep,
  planType,
  onStepClick,
  stepContent,
  footer,
}: Props) {
  return (
    <div className="planner-create-view">
      <PlannerSectionHeader
        title="Create plan"
        subtitle="Coordinates-first workflow — identity, collar or kickoff, target, constraints, generate, and save."
      />
      <div className="planner-create-main">
        <PlannerStepper
          currentStep={currentStep}
          planType={planType}
          onStepClick={onStepClick}
        />
        {stepContent}
      </div>
      {footer ? <footer className="planner-create-footer">{footer}</footer> : null}
    </div>
  );
}
