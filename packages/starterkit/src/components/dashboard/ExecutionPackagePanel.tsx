"use client";

import type { HoleLibrary } from "@/lib/drilling/hole-library";
import {
  downloadActualSurveysCsv,
  downloadExecutionManifest,
  resolveExecutionPackageSupport,
} from "@/lib/drilling/execution-package";
import { downloadExecutionTxt } from "@/lib/drilling/execution-report-text";
import { downloadExecutionPdf } from "@/lib/drilling/execution-report-pdf";
import { buildHoleDxf, downloadDxf } from "@/lib/drilling/dxf-export";
import type { SavedHoleProject } from "@/lib/drilling/storage";

type Props = {
  hole: SavedHoleProject;
  library: HoleLibrary;
  onExported?: (label: string) => void;
};

export function ExecutionPackagePanel({ hole, library, onExported }: Props) {
  const support = resolveExecutionPackageSupport(hole);

  if (!support.supported) {
    return (
      <article className="targetlock-panel execution-package-panel">
        <div className="targetlock-panel-title">
          <h3>Execution package</h3>
        </div>
        <p className="targetlock-panel-copy">{support.reason}</p>
      </article>
    );
  }

  return (
    <article className="targetlock-panel execution-package-panel">
      <div className="targetlock-panel-title">
        <h3>Execution package</h3>
      </div>
      <p className="targetlock-panel-copy">
        Export execution evidence for pilot review — locked plan comparison, audit trail,
        and field actuals.
      </p>
      <div className="targetlock-btn-row">
        <button
          type="button"
          className="targetlock-btn targetlock-btn-sm"
          onClick={() => {
            if (downloadExecutionTxt(library, hole.holeId)) {
              onExported?.("Execution TXT");
            }
          }}
        >
          Export execution TXT
        </button>
        <button
          type="button"
          className="targetlock-btn targetlock-btn-sm"
          onClick={() => {
            void downloadExecutionPdf(library, hole.holeId).then((ok) => {
              if (ok) onExported?.("Execution PDF");
            });
          }}
        >
          Export execution PDF
        </button>
        <button
          type="button"
          className="targetlock-btn targetlock-btn-sm"
          onClick={() => {
            if (downloadActualSurveysCsv(hole)) {
              onExported?.("Actual survey CSV");
            }
          }}
        >
          Export actual survey CSV
        </button>
        <button
          type="button"
          className="targetlock-btn targetlock-btn-sm"
          onClick={() => {
            if (downloadExecutionManifest(hole, library)) {
              onExported?.("Audit manifest JSON");
            }
          }}
        >
          Export audit manifest JSON
        </button>
        <button
          type="button"
          className="targetlock-btn targetlock-btn-sm"
          onClick={() => {
            const lockedPlan =
              hole.plannerMeta?.lockedPlan?.planRecords ?? hole.planRecords;
            downloadDxf(
              buildHoleDxf(
                hole.holeName,
                lockedPlan,
                hole.actualRecords,
                hole.target
              ),
              `targetlock-${hole.holeName.replace(/[^\w.-]+/g, "-").toLowerCase()}-execution-trajectory`
            );
            onExported?.("Trajectory DXF");
          }}
        >
          Export trajectory DXF
        </button>
      </div>
    </article>
  );
}
