"use client";

import type { ReactNode } from "react";
import type { PlannerPlanType, PlannerStepId } from "@/lib/drilling/planner-types";
import { AdvancedTabHero } from "@/components/dashboard/AdvancedTabHero";
import { PlannerStepper } from "./PlannerStepper";

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
    <div className="planner-create-view targetlock-settings-tab">
      <AdvancedTabHero
        eyebrow="New plan workflow"
        title="Create plan"
        copy="Coordinates-first workflow — identity, collar or kickoff, target, constraints, generate, and save."
      />

      <nav className="planner-create-stepper-card" aria-label="Planner steps">
        <PlannerStepper
          currentStep={currentStep}
          planType={planType}
          onStepClick={onStepClick}
        />
      </nav>

      <div className="planner-create-stack">{stepContent}</div>

      {footer ? <footer className="planner-create-footer">{footer}</footer> : null}
    </div>
  );
}
