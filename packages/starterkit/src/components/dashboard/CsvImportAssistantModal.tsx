"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CSV_IMPORT_TEMPLATES,
  downloadCsvBlob,
  type ImportKind,
  validateCsvText,
  type CsvImportValidation,
} from "@/lib/drilling/csv-import-assistant";
import { SAMPLE_ACTUAL_CSV, SAMPLE_PLAN_CSV } from "@/lib/sample-data";
import type { SurveyRecord } from "@/lib/drilling/types";
import { FileDropzone } from "@/components/planner/ui/FileDropzone";

type Props = {
  open: boolean;
  importKind: ImportKind;
  activeHoleId: string;
  activeHoleName: string;
  existingPlanRecords: SurveyRecord[];
  existingActualRecords: SurveyRecord[];
  onClose: () => void;
  onImport: (records: SurveyRecord[], fileName: string, summary: ImportSummary) => void;
};

export type ImportSummary = {
  stationsImported: number;
  skippedCount: number;
  warnings: string[];
};

const TITLES: Record<ImportKind, string> = {
  plan: "Hole plan",
  actual: "Survey results",
};

const LEADS: Record<ImportKind, string> = {
  plan: "Planned trajectory CSV — MD, dip, and azimuth for the full hole design. Import replaces the active hole plan.",
  actual:
    "Actual survey CSV — downhole readings from camera or gyro, station by station. Import replaces actual surveys on the selected hole.",
};

function confidenceLabel(c: CsvImportValidation["confidence"]): string {
  if (c === "ready") return "Ready to import";
  if (c === "needs_review") return "Needs review before import";
  return "Cannot import — fix errors below";
}

function confidenceNoticeClass(c: CsvImportValidation["confidence"]): string {
  if (c === "ready") return "tl-modal-notice tl-modal-notice--success";
  if (c === "needs_review") return "tl-modal-notice tl-modal-notice--warn";
  return "tl-modal-notice tl-modal-notice--error";
}

export function CsvImportAssistantModal({
  open,
  importKind,
  activeHoleId,
  activeHoleName,
  existingPlanRecords,
  existingActualRecords,
  onClose,
  onImport,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [ackMetres, setAckMetres] = useState(false);
  const [ackDip, setAckDip] = useState(false);
  const [ackAzimuth, setAckAzimuth] = useState(false);
  const [doneSummary, setDoneSummary] = useState<ImportSummary | null>(null);

  const resetFile = useCallback(() => {
    setFileText(null);
    setFileName("");
    setAckMetres(false);
    setAckDip(false);
    setAckAzimuth(false);
    setDoneSummary(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetFile();
      return;
    }
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, resetFile]);

  const validation = useMemo(() => {
    if (!fileText) return null;
    return validateCsvText(fileText, {
      importKind,
      activeHoleId,
      activeHoleName,
      existingPlanRecords,
      existingActualRecords,
      fileName: fileName || undefined,
    });
  }, [
    fileText,
    importKind,
    activeHoleId,
    activeHoleName,
    existingPlanRecords,
    existingActualRecords,
    fileName,
  ]);

  const conventionsOk = ackMetres && ackDip && ackAzimuth;
  const canImport =
    validation != null &&
    validation.confidence !== "cannot_import" &&
    validation.stationsReady > 0 &&
    conventionsOk &&
    !doneSummary;

  const loadText = (text: string, name: string) => {
    setFileText(text);
    setFileName(name);
    setDoneSummary(null);
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      loadText(text, file.name);
    } catch {
      loadText("", file.name);
    }
  };

  const handleImport = () => {
    if (!validation || !canImport) return;
    const summary: ImportSummary = {
      stationsImported: validation.stationsReady,
      skippedCount: validation.skippedCount,
      warnings: validation.warnings.map((w) => w.message),
    };
    onImport(validation.records, fileName || "import.csv", summary);
    setDoneSummary(summary);
  };

  if (!open) return null;

  const title = TITLES[importKind];
  const sampleCsv = importKind === "plan" ? SAMPLE_PLAN_CSV : SAMPLE_ACTUAL_CSV;
  const stationCount = validation?.stationsReady ?? 0;

  return (
    <div
      className="tl-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-import-title"
      onClick={onClose}
    >
      <div className="tl-modal tl-modal--guide tl-modal--csv-import" onClick={(e) => e.stopPropagation()}>
        <header className="tl-modal-header">
          <div className="tl-modal-header-text">
            <h2 id="csv-import-title">Import {title}</h2>
            <p className="tl-modal-lead">{LEADS[importKind]}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="tl-modal-close"
            onClick={onClose}
            aria-label={`Close import ${title}`}
          >
            Close
          </button>
        </header>

        <div className="tl-modal-body tl-modal-body--flush">
          <p className="tl-modal-notice tl-modal-notice--info" role="status">
            Active hole: <strong>{activeHoleName}</strong> — nothing is written until you confirm
            import at the bottom.
          </p>

          {doneSummary ? (
            <div className="tl-modal-panel">
              <section className="tl-modal-panel-section">
                <h3 className="tl-modal-panel-section-title">Import complete</h3>
                <p className="tl-modal-notice tl-modal-notice--success">
                  <strong>{doneSummary.stationsImported}</strong> survey station
                  {doneSummary.stationsImported === 1 ? "" : "s"} loaded
                  {fileName ? (
                    <>
                      {" "}
                      from <strong>{fileName}</strong>
                    </>
                  ) : null}
                  .
                  {doneSummary.skippedCount > 0 ? (
                    <>
                      {" "}
                      {doneSummary.skippedCount} row
                      {doneSummary.skippedCount === 1 ? "" : "s"} were skipped.
                    </>
                  ) : null}
                </p>
              </section>
              {doneSummary.warnings.length > 0 ? (
                <section className="tl-modal-panel-section tl-modal-panel-section--last">
                  <h3 className="tl-modal-panel-section-title">Warnings recorded</h3>
                  <div className="tl-modal-subpanel tl-modal-subpanel--warn">
                    <ul className="tl-modal-panel-list">
                      {doneSummary.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              ) : (
                <section className="tl-modal-panel-section tl-modal-panel-section--last">
                  <p className="tl-modal-panel-text">
                    Close this dialog to review the hole in the main workspace. Use{" "}
                    <strong>Undo import</strong> in the sidebar if you need to revert.
                  </p>
                </section>
              )}
            </div>
          ) : (
            <div className="tl-modal-panel">
              <section className="tl-modal-panel-section">
                <h3 className="tl-modal-panel-section-title">1. Prepare your file</h3>
                <p className="tl-modal-panel-text">
                  Start from a template or sample, then edit in Excel or your survey export tool.
                </p>
                <div className="csv-import-action-grid" role="list">
                  <button
                    type="button"
                    role="listitem"
                    className="csv-import-action-card"
                    onClick={() =>
                      downloadCsvBlob(
                        importKind === "plan"
                          ? "targetlock-plan-template.csv"
                          : "targetlock-survey-template.csv",
                        importKind === "plan"
                          ? CSV_IMPORT_TEMPLATES.simplePlan
                          : CSV_IMPORT_TEMPLATES.simpleSurvey
                      )
                    }
                  >
                    <span className="csv-import-action-card-title">Download template</span>
                    <span className="csv-import-action-card-meta">md_m · dip_deg · azimuth_deg</span>
                    <span className="csv-import-action-card-sub">Minimal CSV for pilot testing</span>
                  </button>
                  <a
                    role="listitem"
                    className="csv-import-action-card csv-import-action-card--link"
                    href="/templates/targetlock-survey-with-metadata.csv"
                    download
                  >
                    <span className="csv-import-action-card-title">Template with metadata</span>
                    <span className="csv-import-action-card-meta">hole_id · survey_tool · date</span>
                    <span className="csv-import-action-card-sub">Professional export format</span>
                  </a>
                  <button
                    type="button"
                    role="listitem"
                    className="csv-import-action-card"
                    onClick={() => loadText(sampleCsv, "sample.csv")}
                  >
                    <span className="csv-import-action-card-title">Use sample CSV</span>
                    <span className="csv-import-action-card-meta">DDH-0247 demo data</span>
                    <span className="csv-import-action-card-sub">Load into this assistant for preview</span>
                  </button>
                </div>
                <div className="tl-modal-subpanel tl-modal-subpanel--muted">
                  <h4 className="tl-modal-subpanel-title">Required columns</h4>
                  <ul className="tl-modal-panel-list">
                    <li>
                      <strong>Measured depth</strong> — <code>md_m</code>, md, depth, or
                      measured_depth_m (metres)
                    </li>
                    <li>
                      <strong>Dip</strong> — <code>dip_deg</code>, dip, or inclination_deg (degrees,
                      negative downward)
                    </li>
                    <li>
                      <strong>Azimuth</strong> — <code>azimuth_deg</code>, azimuth, or azi (degrees
                      clockwise from north)
                    </li>
                    <li>
                      <strong>Optional</strong> — <code>hole_id</code>, tolerance columns (plan
                      only)
                    </li>
                  </ul>
                </div>
              </section>

              <section className="tl-modal-panel-section">
                <h3 className="tl-modal-panel-section-title">2. Choose a file</h3>
                <p className="tl-modal-panel-text">
                  Drop a CSV here or browse. Only comma-separated values are supported in this
                  release.
                </p>
                <div className="tl-modal-subpanel">
                  <FileDropzone
                    accept=".csv,text/csv"
                    label={`Choose ${title} CSV file`}
                    hint="Accepted: .csv"
                    fileName={fileName || null}
                    onFiles={(files) => void handleFile(files[0])}
                  />
                </div>
              </section>

              {validation ? (
                <>
                  <section className="tl-modal-panel-section">
                    <h3 className="tl-modal-panel-section-title">3. Review validation</h3>
                    <p className="tl-modal-panel-text">
                      Check column mapping and the first rows before confirming conventions below.
                    </p>
                    <p
                      className={confidenceNoticeClass(validation.confidence)}
                      role="status"
                    >
                      <strong>{confidenceLabel(validation.confidence)}</strong>
                      {validation.stationsReady > 0 ? (
                        <>
                          {" "}
                          — {validation.stationsReady} station
                          {validation.stationsReady === 1 ? "" : "s"} ready
                        </>
                      ) : null}
                      {validation.skippedCount > 0 ? (
                        <>
                          {" "}
                          · {validation.skippedCount} row
                          {validation.skippedCount === 1 ? "" : "s"} skipped
                        </>
                      ) : null}
                    </p>

                    <div className="tl-modal-subpanel">
                      <h4 className="tl-modal-subpanel-title">Detected columns</h4>
                      <dl className="csv-import-mapping-grid">
                        <div className="csv-import-mapping-item">
                          <dt>Measured depth</dt>
                          <dd>{validation.mapping.md ?? "Not found"}</dd>
                        </div>
                        <div className="csv-import-mapping-item">
                          <dt>Dip</dt>
                          <dd>{validation.mapping.dip ?? "Not found"}</dd>
                        </div>
                        <div className="csv-import-mapping-item">
                          <dt>Azimuth</dt>
                          <dd>{validation.mapping.azimuth ?? "Not found"}</dd>
                        </div>
                        <div className="csv-import-mapping-item">
                          <dt>Hole ID</dt>
                          <dd>
                            {validation.detectedHoleIds.length > 0
                              ? validation.detectedHoleIds.join(", ")
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {validation.previewRows.length > 0 ? (
                      <div className="tl-modal-subpanel">
                        <h4 className="tl-modal-subpanel-title">Preview (first rows)</h4>
                        <div className="csv-import-preview-scroll">
                          <table className="csv-import-preview-table">
                            <thead>
                              <tr>
                                <th>Row</th>
                                <th>MD (m)</th>
                                <th>Dip (°)</th>
                                <th>Azi (°)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {validation.previewRows.map((row) => (
                                <tr key={row.lineNumber}>
                                  <td>{row.lineNumber}</td>
                                  <td>{Number.isFinite(row.md) ? row.md : "—"}</td>
                                  <td>{Number.isFinite(row.dip) ? row.dip : "—"}</td>
                                  <td>{Number.isFinite(row.azimuth) ? row.azimuth : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}

                    {validation.errors.length > 0 ? (
                      <div className="tl-modal-subpanel tl-modal-subpanel--error">
                        <h4 className="tl-modal-subpanel-title">Fix before import</h4>
                        <ul className="tl-modal-panel-list">
                          {validation.errors.map((e, i) => (
                            <li key={`e-${e.row ?? i}-${e.message.slice(0, 24)}`}>
                              {e.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {validation.warnings.length > 0 ? (
                      <div className="tl-modal-subpanel tl-modal-subpanel--warn">
                        <h4 className="tl-modal-subpanel-title">Review before import</h4>
                        <ul className="tl-modal-panel-list">
                          {validation.warnings.map((w, i) => (
                            <li key={`w-${w.row ?? i}-${w.message.slice(0, 24)}`}>
                              {w.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </section>

                  <section className="tl-modal-panel-section tl-modal-panel-section--last">
                    <h3 className="tl-modal-panel-section-title">4. Confirm survey conventions</h3>
                    <p className="tl-modal-panel-text">
                      TargetLock assumes exploration dip and north-referenced azimuth. Confirm all
                      three before import is enabled.
                    </p>
                    <p className="tl-modal-panel-text">
                      Import <strong>replaces</strong> existing{" "}
                      {importKind === "plan" ? "hole plan" : "survey results"} on the selected hole.
                      Use <strong>Undo import</strong> in the sidebar to restore the previous data.
                    </p>
                    <div className="csv-import-convention-list">
                      <label className="csv-import-convention-card">
                        <input
                          type="checkbox"
                          checked={ackMetres}
                          onChange={(e) => setAckMetres(e.target.checked)}
                        />
                        <span className="csv-import-convention-card-body">
                          <span className="csv-import-convention-card-title">
                            Measured depth is in metres
                          </span>
                          <span className="csv-import-convention-card-sub">
                            MD values are not feet or other units
                          </span>
                        </span>
                      </label>
                      <label className="csv-import-convention-card">
                        <input
                          type="checkbox"
                          checked={ackDip}
                          onChange={(e) => setAckDip(e.target.checked)}
                        />
                        <span className="csv-import-convention-card-body">
                          <span className="csv-import-convention-card-title">
                            Dip is negative downward
                          </span>
                          <span className="csv-import-convention-card-sub">
                            Exploration convention, not positive inclination
                          </span>
                        </span>
                      </label>
                      <label className="csv-import-convention-card">
                        <input
                          type="checkbox"
                          checked={ackAzimuth}
                          onChange={(e) => setAckAzimuth(e.target.checked)}
                        />
                        <span className="csv-import-convention-card-body">
                          <span className="csv-import-convention-card-title">
                            Azimuth is clockwise from north
                          </span>
                          <span className="csv-import-convention-card-sub">
                            0–360°; magnetic, true, or grid per your plan
                          </span>
                        </span>
                      </label>
                    </div>
                  </section>
                </>
              ) : (
                <section className="tl-modal-panel-section tl-modal-panel-section--last">
                  <h3 className="tl-modal-panel-section-title">3. Review validation</h3>
                  <p className="tl-modal-panel-text">
                    After you choose a file or sample, column mapping, preview, and validation
                    results will appear in this section.
                  </p>
                </section>
              )}
            </div>
          )}
        </div>

        <footer className="tl-modal-footer">
          {doneSummary ? (
            <button
              type="button"
              className="targetlock-btn targetlock-btn-primary"
              onClick={onClose}
            >
              Done
            </button>
          ) : (
            <>
              <button type="button" className="targetlock-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="targetlock-btn targetlock-btn-primary"
                disabled={!canImport}
                onClick={handleImport}
              >
                Import {stationCount} station{stationCount === 1 ? "" : "s"}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
