"use client";

import { useState, type DragEvent } from "react";

type Props = {
  /** Accept attribute for the file input, e.g. ".csv,text/csv". */
  accept?: string;
  /** Accessible label for the input ("Choose collar CSV file"). */
  label: string;
  /** Lead line; defaults to the standard drop/browse prompt. */
  lead?: string;
  /** Hint shown when no file is loaded, e.g. "Accepted: .csv". */
  hint?: string;
  /** Name of the currently loaded file, shown in place of the hint. */
  fileName?: string | null;
  /** Badge text inside the icon chip (CSV, OBJ, JSON…). */
  icon?: string;
  /** Single-line variant for inline form slots. */
  compact?: boolean;
  onFiles: (files: File[]) => void;
};

/**
 * Shared drag-and-drop file picker — every file import point in TargetLock
 * and the planner uses this so rig-side users can drop files anywhere a
 * browse button exists. Native DnD, no dependency; styling reuses the
 * `.csv-import-dropzone` pattern.
 */
export function FileDropzone({
  accept,
  label,
  lead = "Drop file here or click to browse",
  hint,
  fileName,
  icon = "CSV",
  compact = false,
  onFiles,
}: Props) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) onFiles(files);
  };

  const className = [
    "csv-import-dropzone",
    compact ? "csv-import-dropzone--compact" : "",
    dragActive ? "csv-import-dropzone--active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        className="csv-import-file-input"
        aria-label={label}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          // Allow re-selecting the same file.
          e.target.value = "";
        }}
      />
      <span className="csv-import-dropzone-icon" aria-hidden>
        {icon}
      </span>
      {compact ? (
        <span className="csv-import-dropzone-compact-text">
          {fileName ? (
            <span className="csv-import-dropzone-file">{fileName}</span>
          ) : (
            <>
              <span className="csv-import-dropzone-lead">{lead}</span>
              {hint ? <span className="csv-import-dropzone-hint">{hint}</span> : null}
            </>
          )}
        </span>
      ) : (
        <>
          <p className="csv-import-dropzone-lead">{lead}</p>
          {fileName ? (
            <p className="csv-import-dropzone-file">{fileName}</p>
          ) : hint ? (
            <p className="csv-import-dropzone-hint">{hint}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
