"use client";

import { FileDropzone } from "@/components/planner/ui/FileDropzone";
import { CapabilityAssumptionsEditor } from "@/components/dashboard/CapabilityAssumptionsEditor";
import { GearOnSitePanel } from "@/components/dashboard/GearOnSitePanel";
import { PlanCorridorEditor } from "@/components/dashboard/PlanCorridorEditor";
import { ReferenceSystemPanel } from "@/components/dashboard/ReferenceSystemPanel";
import { SteeringRulesPanel } from "@/components/dashboard/SteeringRulesPanel";
import { SurveyToolProfilePanel } from "@/components/dashboard/SurveyToolProfilePanel";
import { TargetLimitsPanel } from "@/components/dashboard/TargetLimitsPanel";
import type { CapabilityAssumptions } from "@/lib/drilling/capability-assumptions";
import type { PlanCorridorConfig, PlanCorridorStatus } from "@/lib/drilling/plan-corridor";
import type { ReferenceSystemConfig, ReferenceWarning } from "@/lib/drilling/reference-system";
import type {
  SurveyToolProfile,
  SurveyUncertaintyAssessment,
} from "@/lib/drilling/survey-tool-profile";
import type { SteeringSettings } from "@/lib/drilling/steering-settings";
import type { AssumptionSignOff, AssumptionValidationStatus } from "@/lib/drilling/validation";
import { AssumptionSignOffCard } from "@/components/dashboard/AssumptionSignOffCard";
import { AdvancedTabHero } from "@/components/dashboard/AdvancedTabHero";
import { TargetLockFormCard } from "@/components/targetlock/TargetLockFormCard";
import type { TargetConfig } from "@/lib/drilling/types";

type Props = {
  steeringSettings: SteeringSettings;
  onSteeringSettingsChange: (next: SteeringSettings) => void;
  target: TargetConfig;
  onTargetChange: (next: TargetConfig) => void;
  onUsePlannedTarget: () => void;
  canUsePlanTarget: boolean;
  planCorridor: PlanCorridorConfig;
  corridorStatus: PlanCorridorStatus | null;
  onPlanCorridorChange: (next: PlanCorridorConfig) => void;
  sanitizePlanCorridorField: (
    field: keyof PlanCorridorConfig,
    value: number,
    current: PlanCorridorConfig
  ) => number;
  recoveryAssumptions: CapabilityAssumptions;
  onRecoveryAssumptionsChange: (next: CapabilityAssumptions) => void;
  onResetRecoveryAssumptions: () => void;
  assumptionsValidationStatus?: AssumptionValidationStatus;
  assumptionSignOff?: AssumptionSignOff | null;
  onAssumptionSignOff?: (validatedBy: string) => void;
  onClearAssumptionSignOff?: () => void;
  surveyToolProfile: SurveyToolProfile;
  surveyAssessment: SurveyUncertaintyAssessment | null;
  onSurveyToolProfileChange: (next: SurveyToolProfile) => void;
  referenceSystem: ReferenceSystemConfig;
  referenceWarnings: ReferenceWarning[];
  onReferenceSystemChange: (next: ReferenceSystemConfig) => void;
  onExportHolePackage?: () => void;
  onImportHolePackage?: (file: File) => void;
  canExportPackage: boolean;
  planFieldsLocked?: boolean;
  planEditNotice?: string | null;
};

function validationBadge(status?: AssumptionValidationStatus): string {
  if (!status) return "Not reviewed";
  if (status.state === "validated") return "Signed off";
  if (status.state === "stale") return "Stale";
  return "Not signed off";
}

export function SteeringSettingsTab({
  steeringSettings,
  onSteeringSettingsChange,
  target,
  onTargetChange,
  onUsePlannedTarget,
  canUsePlanTarget,
  planCorridor,
  corridorStatus,
  onPlanCorridorChange,
  sanitizePlanCorridorField,
  recoveryAssumptions,
  onRecoveryAssumptionsChange,
  onResetRecoveryAssumptions,
  assumptionsValidationStatus,
  assumptionSignOff,
  onAssumptionSignOff,
  onClearAssumptionSignOff,
  surveyToolProfile,
  surveyAssessment,
  onSurveyToolProfileChange,
  referenceSystem,
  referenceWarnings,
  onReferenceSystemChange,
  onExportHolePackage,
  onImportHolePackage,
  canExportPackage,
  planFieldsLocked = false,
  planEditNotice,
}: Props) {
  const enabledRules = steeringSettings.rules.filter((r) => r.enabled).length;

  const setGear = (gear: SteeringSettings["gear"]) => {
    onSteeringSettingsChange({ ...steeringSettings, gear });
  };

  return (
    <div className="targetlock-settings-tab" role="tabpanel">
      <AdvancedTabHero
        eyebrow="Supervisor configuration"
        title="Steering settings"
        copy={
          <>
            Standard escalation rules are always active for this hole. Adjust thresholds, gear, and
            limits below — evaluated after each survey on the action plan.
          </>
        }
        meta={
          <>
            <span
              className={`targetlock-settings-status-chip targetlock-settings-status-chip--${assumptionsValidationStatus?.state ?? "unvalidated"}`}
            >
              {validationBadge(assumptionsValidationStatus)}
            </span>
            <span className="targetlock-settings-status-chip targetlock-settings-status-chip--neutral">
              {enabledRules} of {steeringSettings.rules.length} rules on
            </span>
          </>
        }
      />

      {planFieldsLocked && planEditNotice ? (
        <p className="targetlock-settings-plan-lock-note" role="status">
          {planEditNotice} Target limits and plan corridor are read-only here — create a revision in
          Hole Planner to change them.
        </p>
      ) : null}

      <div className="targetlock-settings-stack">
        <GearOnSitePanel gear={steeringSettings.gear} onChange={setGear} />
        <CapabilityAssumptionsEditor
          assumptions={recoveryAssumptions}
          onChange={onRecoveryAssumptionsChange}
          onReset={onResetRecoveryAssumptions}
          validationStatus={assumptionsValidationStatus}
        />
        {assumptionsValidationStatus &&
        onAssumptionSignOff &&
        onClearAssumptionSignOff ? (
          <AssumptionSignOffCard
            status={assumptionsValidationStatus}
            signOff={assumptionSignOff ?? null}
            onSignOff={onAssumptionSignOff}
            onClearSignOff={onClearAssumptionSignOff}
          />
        ) : null}
        <TargetLimitsPanel
          target={target}
          onChange={onTargetChange}
          onUsePlannedTarget={onUsePlannedTarget}
          canUsePlanTarget={canUsePlanTarget}
          readOnly={planFieldsLocked}
        />
        <PlanCorridorEditor
          corridor={planCorridor}
          status={corridorStatus}
          onChange={onPlanCorridorChange}
          sanitizeField={sanitizePlanCorridorField}
          readOnly={planFieldsLocked}
        />
        <SurveyToolProfilePanel
          profile={surveyToolProfile}
          assessment={surveyAssessment}
          onChange={onSurveyToolProfileChange}
        />
        <ReferenceSystemPanel
          config={referenceSystem}
          warnings={referenceWarnings}
          onChange={onReferenceSystemChange}
        />
      </div>

      <SteeringRulesPanel
        settings={steeringSettings}
        onChange={onSteeringSettingsChange}
      />

      <TargetLockFormCard
        kicker="Library backup"
        title="Hole package backup"
      >
        <p className="targetlock-form-card-copy">
          Export or import the full browser library including steering settings, assumptions, and
          branch programs.
        </p>
        <div className="targetlock-form-actions">
          <button
            type="button"
            className="targetlock-btn targetlock-btn-primary"
            onClick={onExportHolePackage}
            disabled={!canExportPackage}
          >
            Export full hole package
          </button>
        </div>
        {onImportHolePackage ? (
          <div className="mt-3">
            <FileDropzone
              compact
              accept=".json,application/json"
              label="Import hole package JSON"
              lead="Import hole package — drop JSON or browse"
              hint="Import replaces local data"
              icon="JSON"
              onFiles={(files) => onImportHolePackage(files[0]!)}
            />
          </div>
        ) : null}
      </TargetLockFormCard>
    </div>
  );
}
