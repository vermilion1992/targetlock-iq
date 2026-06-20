"use client";

import { useState } from "react";
import { SettingsTextField } from "@/components/dashboard/SettingsTextField";
import type { PlannerDraft, PlannerPlanType } from "@/lib/drilling/planner-types";
import { FileDropzone } from "./ui/FileDropzone";
import { PlannerModeSwitch } from "./ui/PlannerModeSwitch";
import { PlannerStepCard } from "./PlannerStepCard";

type Props = {
  draft: PlannerDraft;
  onChange: (patch: Partial<PlannerDraft>) => void;
  onImportFile: (text: string) => void;
};

const SEGMENT_MODES: { id: PlannerPlanType; label: string }[] = [
  { id: "standard", label: "Standard hole" },
  { id: "daughter", label: "Daughter hole" },
];

export function ProjectCoordinateStep({ draft, onChange, onImportFile }: Props) {
  const planType = draft.planType === "import" ? "standard" : draft.planType;
  const [importedFileName, setImportedFileName] = useState<string | null>(null);

  return (
    <PlannerStepCard
      kicker="Program setup"
      title="Program / hole identity"
      copy="Name the program and hole, then choose the plan type. Collar and target coordinates are entered in the next steps — coordinates are the plan."
    >
      <fieldset className="targetlock-settings-form-group">
        <legend>Identity</legend>
        <div className="targetlock-settings-form-grid targetlock-settings-form-grid--2">
          <SettingsTextField
            label="Project / site name"
            value={draft.projectName}
            placeholder="North Camp — Phase 1"
            onChange={(v) => onChange({ projectName: v })}
          />
          <SettingsTextField
            label="Program name"
            value={draft.programName ?? ""}
            placeholder="DDH-0247 program"
            onChange={(v) =>
              onChange({
                programName: v,
                programId: draft.programId,
              })
            }
          />
          {draft.planType !== "import" ? (
            <SettingsTextField
              label={planType === "daughter" ? "Daughter hole ID" : "Hole ID"}
              value={draft.holeName ?? ""}
              placeholder={planType === "daughter" ? "DDH-0247A" : "DDH-0247"}
              onChange={(v) => onChange({ holeName: v })}
            />
          ) : null}
        </div>
      </fieldset>

      <fieldset className="targetlock-settings-form-group">
        <legend>Plan type</legend>
        <PlannerModeSwitch
          options={SEGMENT_MODES}
          value={planType}
          onChange={(nextType) => onChange({ planType: nextType })}
          label="Plan type"
        />
        <button
          type="button"
          className={`targetlock-btn targetlock-btn-sm planner-import-mode-btn${
            draft.planType === "import" ? " planner-import-mode-btn--active" : ""
          }`}
          onClick={() => onChange({ planType: "import" })}
        >
          Import planned survey CSV
        </button>
      </fieldset>

      {draft.planType === "import" ? (
        <fieldset className="targetlock-settings-form-group">
          <legend>Import planned survey</legend>
          <div className="planner-import-block">
            <FileDropzone
              compact
              accept=".csv,text/csv"
              label="Choose planned survey CSV file"
              lead="Drop CSV or browse"
              hint=".csv with md, dip, azimuth"
              fileName={importedFileName}
              onFiles={(files) => {
                const file = files[0];
                setImportedFileName(file.name);
                const reader = new FileReader();
                reader.onload = () => onImportFile(String(reader.result ?? ""));
                reader.readAsText(file);
              }}
            />
            <SettingsTextField
              label="Or paste CSV"
              value={draft.importCsvText ?? ""}
              placeholder="md,dip,azimuth"
              multiline
              rows={6}
              onChange={(v) => onChange({ importCsvText: v })}
            />
          </div>
        </fieldset>
      ) : null}

      {draft.planType === "standard" ? (
        <p className="targetlock-helper">
          Next: collar coordinates, target coordinates, and path constraints.
        </p>
      ) : null}
      {draft.planType === "daughter" ? (
        <p className="targetlock-helper">
          Next: mother kickoff, daughter target coordinates, and path constraints.
        </p>
      ) : null}
    </PlannerStepCard>
  );
}
