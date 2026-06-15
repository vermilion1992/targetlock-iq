"use client";

import { useCallback, useState } from "react";
import type { HoleLibrary } from "@/lib/drilling/hole-library";
import {
  applyPlannerImport,
  parsePlannerImportFiles,
  type PlannerImportParseResult,
} from "@/lib/drilling/planner-csv-import";
import { FileDropzone } from "./ui/FileDropzone";

type Props = {
  library: HoleLibrary;
  open: boolean;
  onClose: () => void;
  onImported: (library: HoleLibrary, programId: string) => void;
};

export function PlannerImportAssistant({
  library,
  open,
  onClose,
  onImported,
}: Props) {
  const [collarCsv, setCollarCsv] = useState("");
  const [surveyCsv, setSurveyCsv] = useState("");
  const [targetCsv, setTargetCsv] = useState("");
  const [daughterCsv, setDaughterCsv] = useState("");
  const [programName, setProgramName] = useState("");
  const [parsed, setParsed] = useState<PlannerImportParseResult | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [loadedNames, setLoadedNames] = useState<Record<string, string>>({});

  const runPreview = useCallback(() => {
    const result = parsePlannerImportFiles(
      {
        collarCsv,
        surveyCsv: surveyCsv || undefined,
        targetCsv: targetCsv || undefined,
        daughterCsv: daughterCsv || undefined,
        programName: programName || undefined,
      },
      library
    );
    setParsed(result);
  }, [collarCsv, surveyCsv, targetCsv, daughterCsv, programName, library]);

  const handleImport = () => {
    if (!parsed?.ok) return;
    const next = applyPlannerImport(library, parsed, {
      overwriteExisting: overwrite,
    });
    onImported(next, parsed.programId);
    onClose();
  };

  const loadFile = async (file: File, slot: string, setter: (v: string) => void) => {
    const text = await file.text();
    setter(text);
    setLoadedNames((prev) => ({ ...prev, [slot]: file.name }));
  };

  if (!open) return null;

  return (
    <div className="planner-import-overlay" role="dialog" aria-modal="true">
      <div className="planner-import-modal targetlock-panel">
        <div className="targetlock-panel-title">
          <h2>Import planned program</h2>
          <button type="button" className="targetlock-btn targetlock-btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="targetlock-panel-copy">
          Upload collar CSV (required) and optional planned survey, target, and daughter kickoff
          files. Existing planner holes are skipped unless overwrite is enabled.
        </p>

        <label className="targetlock-survey-field">
          <span>Program name</span>
          <input
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            placeholder="Imported program name"
          />
        </label>

        <div className="planner-import-files">
          {(
            [
              { slot: "collar", title: "Collar CSV (required)", setter: setCollarCsv },
              { slot: "survey", title: "Planned survey CSV", setter: setSurveyCsv },
              { slot: "target", title: "Target CSV (optional)", setter: setTargetCsv },
              {
                slot: "daughter",
                title: "Daughter kickoff CSV (optional)",
                setter: setDaughterCsv,
              },
            ] as const
          ).map(({ slot, title, setter }) => (
            <div key={slot} className="targetlock-survey-field">
              <span>{title}</span>
              <FileDropzone
                compact
                accept=".csv,text/csv"
                label={`Choose ${title.toLowerCase()} file`}
                lead="Drop CSV or browse"
                hint=".csv"
                fileName={loadedNames[slot] ?? null}
                onFiles={(files) => void loadFile(files[0], slot, setter)}
              />
            </div>
          ))}
        </div>

        <label className="planner-handoff-checkbox">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
          />
          Overwrite existing planner holes with matching IDs
        </label>

        <div className="planner-import-actions">
          <button
            type="button"
            className="targetlock-btn targetlock-btn-secondary"
            onClick={runPreview}
            disabled={!collarCsv.trim()}
          >
            Preview import
          </button>
          <button
            type="button"
            className="targetlock-btn targetlock-btn-primary"
            onClick={handleImport}
            disabled={!parsed?.ok}
          >
            Import as planner program
          </button>
        </div>

        {parsed ? (
          <div className="planner-import-summary">
            <p>
              <strong>{parsed.detectedHoleCount}</strong> hole(s) detected —{" "}
              {parsed.ok ? "ready to import" : "fix errors below"}
            </p>
            {parsed.errors.map((e) => (
              <p key={e} className="planner-review-qa-blocker">
                {e}
              </p>
            ))}
            {parsed.warnings.slice(0, 5).map((w) => (
              <p key={w} className="targetlock-panel-copy">
                {w}
              </p>
            ))}
            {parsed.previewRows.length ? (
              <div className="planner-table-wrap">
                <table className="planner-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Hole</th>
                      <th>Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.previewRows.slice(0, 12).map((row) => (
                      <tr key={row.rowIndex}>
                        <td>{row.rowIndex}</td>
                        <td>{row.holeId}</td>
                        <td>
                          {[...row.errors, ...row.warnings].join("; ") || "OK"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}

        <p className="targetlock-panel-copy planner-package-hint">
          Templates:{" "}
          <a href="/templates/targetlock-planner-collars-template.csv" download>
            collars
          </a>
          ,{" "}
          <a href="/templates/targetlock-planner-planned-surveys-template.csv" download>
            surveys
          </a>
        </p>
      </div>
    </div>
  );
}
