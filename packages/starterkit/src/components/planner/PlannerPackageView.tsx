"use client";



import type { HoleLibrary } from "@/lib/drilling/hole-library";

import { findHole } from "@/lib/drilling/hole-library";

import { plannerStatus } from "@/lib/drilling/planner-status";

import { resolveExecutionPackageSupport } from "@/lib/drilling/execution-package";

import type { SavedHoleProject } from "@/lib/drilling/storage";

import {
  PROGRAM_COLLAR_CSV_HEADER,
  PROGRAM_TARGET_CSV_HEADER,
} from "@/lib/drilling/planner-export";

import {
  buildHoleDxf,
  buildProgramDxf,
  downloadDxf,
} from "@/lib/drilling/dxf-export";
import { PlannerActionGroup } from "./ui/PlannerActionGroup";
import { PlannerSectionHeader } from "./ui/PlannerSectionHeader";



type Props = {

  library: HoleLibrary;

  programId: string | null;

  programName: string | null;

  selectedHoleId?: string | null;

  onExportProgramPackage: (programId: string, programName: string) => void;

  onExportProgramPdf: (programId: string, programName: string) => void;

  onExportProgramTxt: (programId: string, programName: string) => void;

  onExportHolePdf: (holeId: string) => void;

  onExportHoleTxt: (holeId: string) => void;

  onExportHoleCsv: (holeId: string) => void;

  onExportHolePackage: (holeId: string) => void;

  onExportExecutionPackage?: (holeId: string) => void;

};



export function PlannerLimitationsPanel() {

  return (

    <article className="targetlock-panel planner-limitations-panel">

      <div className="targetlock-panel-title">

        <h3>Known limitations</h3>

      </div>

      <ul className="planner-limitations-list">

        <li>Local browser storage only — no cloud audit trail.</li>

        <li>
          Approximate clearance only — separation factors use a simplified
          (ISCWSA-inspired) uncertainty model, not certified anti-collision.
        </li>

        <li>Geology overlays are display-only (no interpretation); no terrain model.</li>

        <li>CRS metadata support — verify coordinates independently before field use.</li>

        <li>Official survey database remains source of truth.</li>

        <li>Contractor / geologist / supervisor approval required before drilling.</li>

      </ul>

    </article>

  );

}



function ExecutionEvidenceSection({

  hole,

  onExport,

}: {

  hole: SavedHoleProject;

  onExport?: () => void;

}) {

  const support = resolveExecutionPackageSupport(hole);

  if (!support.supported) {

    return (

      <div className="planner-package-section">

        <h4>Execution evidence — {hole.holeName}</h4>

        <p className="targetlock-panel-copy">{support.reason}</p>

      </div>

    );

  }



  return (

    <div className="planner-package-section">

      <h4>Execution evidence — {hole.holeName}</h4>

      <p className="targetlock-panel-copy">Execution evidence available.</p>

      {onExport ? (

        <button

          type="button"

          className="targetlock-btn targetlock-btn-secondary"

          onClick={onExport}

        >

          Export execution package

        </button>

      ) : null}

    </div>

  );

}



export function PlannerPackageView({

  library,

  programId,

  programName,

  selectedHoleId,

  onExportProgramPackage,

  onExportProgramPdf,

  onExportProgramTxt,

  onExportHolePdf,

  onExportHoleTxt,

  onExportHoleCsv,

  onExportHolePackage,

  onExportExecutionPackage,

}: Props) {

  const selectedHole = selectedHoleId ? findHole(library, selectedHoleId) : null;

  const activeHoles = programId

    ? library.holes.filter(

        (h) =>

          h.plannerMeta?.programId === programId &&

          (plannerStatus(h) === "active" || plannerStatus(h) === "completed")

      )

    : [];



  return (

    <div className="planner-package-view">

      <article className="targetlock-panel">

        <PlannerSectionHeader

          title="Export & package"

          subtitle="Grouped exports for contractors, geologists, and execution handoff."

        />



        <div className="planner-package-groups">

          <section className="planner-package-group">

            <h3 className="planner-package-group-title">Coordinate exports</h3>

            <p className="targetlock-panel-copy">

              Contractor CSV columns — collars, targets, planned surveys, daughters, PCS metadata.

            </p>

            <code className="planner-export-header-preview">{PROGRAM_COLLAR_CSV_HEADER}</code>

            <code className="planner-export-header-preview">{PROGRAM_TARGET_CSV_HEADER}</code>

            <p className="targetlock-panel-copy">

              hole_id,md,dip,azimuth · daughters.csv · coordinate-system.csv · manifest.json

            </p>

          </section>



          <section className="planner-package-group">

            <h3 className="planner-package-group-title">Program package</h3>

            <p className="targetlock-panel-copy">

              CSVs, manifest JSON, and planning reports for the active program.

            </p>

            <PlannerActionGroup>

              <button

                type="button"

                className="targetlock-btn targetlock-btn-primary"

                disabled={!programId}

                onClick={() =>

                  programId &&

                  onExportProgramPackage(programId, programName ?? "program")

                }

              >

                Package (CSV + manifest)

              </button>

              <button

                type="button"

                className="targetlock-btn targetlock-btn-secondary"

                disabled={!programId}

                onClick={() =>

                  programId &&

                  onExportProgramPdf(programId, programName ?? "program")

                }

              >

                Planning PDF

              </button>

              <button

                type="button"

                className="targetlock-btn targetlock-btn-secondary"

                disabled={!programId}

                onClick={() =>

                  programId &&

                  onExportProgramTxt(programId, programName ?? "program")

                }

              >

                Planning TXT

              </button>

              <button
                type="button"
                className="targetlock-btn targetlock-btn-secondary"
                disabled={!programId}
                onClick={() => {
                  if (!programId) return;
                  const dxf = buildProgramDxf(library, programId);
                  if (dxf) {
                    downloadDxf(
                      dxf,
                      `targetlock-${(programName ?? "program").replace(/[^\w.-]+/g, "-").toLowerCase()}-trajectories`
                    );
                  }
                }}
              >
                Trajectories DXF
              </button>

            </PlannerActionGroup>

          </section>



          {selectedHole ? (

            <section className="planner-package-group">

              <h3 className="planner-package-group-title">

                Selected hole — {selectedHole.holeName}

              </h3>

              <PlannerActionGroup>

                <button

                  type="button"

                  className="targetlock-btn targetlock-btn-primary"

                  disabled={!selectedHole.planRecords.length}

                  onClick={() => onExportHolePackage(selectedHole.holeId)}

                >

                  Hole package

                </button>

                <button

                  type="button"

                  className="targetlock-btn targetlock-btn-secondary"

                  disabled={!selectedHole.planRecords.length}

                  onClick={() => onExportHolePdf(selectedHole.holeId)}

                >

                  Planning PDF

                </button>

                <button

                  type="button"

                  className="targetlock-btn targetlock-btn-secondary"

                  disabled={!selectedHole.planRecords.length}

                  onClick={() => onExportHoleTxt(selectedHole.holeId)}

                >

                  Planning TXT

                </button>

                <button

                  type="button"

                  className="targetlock-btn targetlock-btn-secondary"

                  disabled={!selectedHole.planRecords.length}

                  onClick={() => onExportHoleCsv(selectedHole.holeId)}

                >

                  Plan CSV

                </button>

                <button
                  type="button"
                  className="targetlock-btn targetlock-btn-secondary"
                  disabled={!selectedHole.planRecords.length}
                  onClick={() =>
                    downloadDxf(
                      buildHoleDxf(
                        selectedHole.holeName,
                        selectedHole.planRecords,
                        selectedHole.actualRecords,
                        selectedHole.target
                      ),
                      `targetlock-${selectedHole.holeName.replace(/[^\w.-]+/g, "-").toLowerCase()}-trajectory`
                    )
                  }
                >
                  Trajectory DXF
                </button>

              </PlannerActionGroup>

              <ExecutionEvidenceSection

                hole={selectedHole}

                onExport={

                  onExportExecutionPackage

                    ? () => onExportExecutionPackage(selectedHole.holeId)

                    : undefined

                }

              />

            </section>

          ) : (

            <section className="planner-package-group">

              <p className="targetlock-panel-copy">

                Select a hole from Plans or Review to export hole-level packages.

              </p>

            </section>

          )}



          {activeHoles.length > 0 && !selectedHole ? (

            <section className="planner-package-group">

              <h3 className="planner-package-group-title">Execution evidence</h3>

              {activeHoles.map((h) => (

                <ExecutionEvidenceSection

                  key={h.holeId}

                  hole={h}

                  onExport={

                    onExportExecutionPackage

                      ? () => onExportExecutionPackage(h.holeId)

                      : undefined

                  }

                />

              ))}

            </section>

          ) : null}

        </div>

      </article>



      <PlannerLimitationsPanel />



      <p className="targetlock-panel-copy planner-package-templates">

        Import templates:{" "}

        <a href="/templates/targetlock-planner-collars-template.csv" download>

          collars

        </a>

        ,{" "}

        <a href="/templates/targetlock-planner-planned-surveys-template.csv" download>

          planned surveys

        </a>

        ,{" "}

        <a href="/templates/targetlock-planner-targets-template.csv" download>

          targets

        </a>

        ,{" "}

        <a href="/templates/targetlock-planner-daughters-template.csv" download>

          daughters

        </a>

        ,{" "}

        <a href="/templates/targetlock-planner-coordinate-system-template.csv" download>

          coordinate system

        </a>

      </p>

    </div>

  );

}


