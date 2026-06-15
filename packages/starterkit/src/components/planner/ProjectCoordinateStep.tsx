"use client";

import { useState } from "react";
import type { PlannerDraft, PlannerPlanType } from "@/lib/drilling/planner-types";
import { FileDropzone } from "./ui/FileDropzone";
import { PlannerModeSwitch } from "./ui/PlannerModeSwitch";

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
    <article className="targetlock-panel planner-step-panel">
      <div className="targetlock-panel-title">
        <h2>Program / hole identity</h2>
      </div>
      <p className="targetlock-panel-copy">
        Name the program and hole, then choose the plan type. Collar and target coordinates
        are entered in the next steps — coordinates are the plan.
      </p>

      <div className="targetlock-survey-fields">
        <label className="targetlock-survey-field targetlock-survey-field--full">
          <span>Project / site name</span>
          <input
            type="text"
            value={draft.projectName}
            onChange={(e) => onChange({ projectName: e.target.value })}
            placeholder="North Camp — Phase 1"
          />
        </label>

        <label className="targetlock-survey-field targetlock-survey-field--full">
          <span>Program name</span>
          <input
            type="text"
            value={draft.programName ?? ""}
            onChange={(e) =>
              onChange({
                programName: e.target.value,
                programId: draft.programId,
              })
            }
            placeholder="DDH-0247 program"
          />
        </label>

        {draft.planType !== "import" ? (
          <label className="targetlock-survey-field targetlock-survey-field--full">
            <span>{planType === "daughter" ? "Daughter hole ID" : "Hole ID"}</span>
            <input
              type="text"
              value={draft.holeName ?? ""}
              onChange={(e) => onChange({ holeName: e.target.value })}
              placeholder={planType === "daughter" ? "DDH-0247A" : "DDH-0247"}
            />
          </label>
        ) : null}
      </div>

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

      {draft.planType === "import" ? (
        <div className="planner-import-block">
          <div className="targetlock-survey-field targetlock-survey-field--full">
            <span>Planned survey CSV</span>
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
          </div>
          <label className="targetlock-survey-field targetlock-survey-field--full">
            <span>Or paste CSV</span>
            <textarea
              rows={6}
              value={draft.importCsvText ?? ""}
              onChange={(e) => onChange({ importCsvText: e.target.value })}
              placeholder="md,dip,azimuth"
            />
          </label>
        </div>
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
    </article>
  );
}
