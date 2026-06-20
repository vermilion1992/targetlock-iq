"use client";

import { useMemo } from "react";
import { Trajectory3D } from "@/components/charts/Trajectory3D";
import { TrajectoryCanvas } from "@/components/charts/TrajectoryCanvas";
import { buildBranchChartOverlayWithContext } from "@/components/charts/chart-branch-overlay";
import { InfoTip } from "@/components/layout/InfoTip";
import {
  analyzeDaughterBranch,
  kickoffStationFromMother,
  methodLabel,
} from "@/lib/drilling/branch-program";
import type { BranchProgram, BranchTarget, DaughterHole } from "@/lib/drilling/branch-program-types";
import type { BranchApprovalSnapshot } from "@/lib/drilling/branch-program-approval";
import type { CreateDaughterInput } from "@/lib/drilling/branch-program-library";
import { buildBranchReportData } from "@/lib/drilling/branch-report-data";
import { downloadBranchReportPdf } from "@/lib/drilling/branch-report-pdf";
import { loadPdfLogoBase64 } from "@/lib/drilling/pdf-brand";
import { getTrajectorySnapshot } from "@/lib/drilling/trajectory-snapshot";
import { branchExportReadiness } from "@/lib/drilling/workspace-action-contract";
import type { CapabilityAssumptions } from "@/lib/drilling/capability-assumptions";
import { buildStations } from "@/lib/drilling/desurvey";
import { round } from "@/lib/drilling/format";
import type { GuideHighlight } from "@/lib/drilling/guide-types";
import type { Recommendation } from "@/lib/drilling/types";
import { BranchApprovalPanel } from "./branch-program/BranchApprovalPanel";
import { BranchDaughterList } from "./branch-program/BranchDaughterList";
import { BranchProgramSummary } from "./branch-program/BranchProgramSummary";
import { BranchTargetEditor } from "./branch-program/BranchTargetEditor";
import { KickoffPlannerPanel } from "./branch-program/KickoffPlannerPanel";
import { AdvancedTabHero } from "@/components/dashboard/AdvancedTabHero";
import { BranchPlannerWorkflowBanner } from "./BranchPlannerWorkflowBanner";
import { ChartPanel } from "@/components/dashboard/ChartPanel";
import type { BranchPlannerContext } from "@/lib/drilling/planner-branch-context";

type Props = {
  program: BranchProgram;
  planStations: ReturnType<typeof buildStations>;
  actualStations: ReturnType<typeof buildStations>;
  recommendation: Recommendation | null;
  holeRole: "standard" | "mother" | "daughter";
  activeHoleId: string;
  recoveryAssumptions: CapabilityAssumptions;
  branchPlannerContext?: BranchPlannerContext | null;
  onInitProgram?: () => void;
  onAddTarget: (t: Omit<BranchTarget, "id">) => void;
  onUpdateTarget: (id: string, patch: Partial<BranchTarget>) => void;
  onRemoveTarget: (id: string) => void;
  onSaveDaughter: (input: CreateDaughterInput) => string | null;
  onSetActiveDaughter: (daughterHoleId: string) => void;
  onArchiveDaughter: (daughterHoleId: string) => void;
  onStatusChange: (daughterHoleId: string, status: import("@/lib/drilling/branch-program-types").DaughterStatus) => void;
  onApprove: (daughterHoleId: string, snapshot: BranchApprovalSnapshot) => void;
  guideSectionClass?: (id: GuideHighlight) => string;
};

function separationLabel(status: string): string {
  if (status === "warning") return "Warning";
  if (status === "caution") return "Caution";
  return "OK";
}

export function BranchProgramPanel({
  program,
  planStations,
  actualStations,
  recommendation,
  holeRole,
  activeHoleId,
  recoveryAssumptions,
  branchPlannerContext = null,
  onInitProgram,
  onAddTarget,
  onUpdateTarget,
  onRemoveTarget,
  onSaveDaughter,
  onSetActiveDaughter,
  onArchiveDaughter,
  onStatusChange,
  onApprove,
  guideSectionClass: gs = () => "",
}: Props) {
  const analyses = useMemo(
    () =>
      program.daughters.map((d) =>
        analyzeDaughterBranch(
          program.mother.actualRecords,
          d,
          program.targets,
          buildStations(program.mother.actualRecords)
        )
      ),
    [program]
  );

  const kickoffMarkers = useMemo(
    () =>
      program.daughters
        .map((d) => {
          const kickoff = kickoffStationFromMother(
            program.mother.actualRecords,
            d.kickoffMd
          );
          if (!kickoff) return null;
          return {
            md: d.kickoffMd,
            station: kickoff,
            label: `${d.daughterId} KO`,
          };
        })
        .filter((k): k is NonNullable<typeof k> => k != null),
    [program]
  );

  const branchOverlay = useMemo(
    () =>
      buildBranchChartOverlayWithContext({
        program,
        viewingHoleId: activeHoleId,
        holeRole,
        kickoffs: kickoffMarkers,
      }),
    [program, kickoffMarkers, activeHoleId, holeRole]
  );

  const activeDaughterHoleId = program.persisted?.activeDaughterHoleId ?? null;
  const exportDaughter: DaughterHole | undefined =
    program.daughters.find((d) => d.daughterHoleId === activeDaughterHoleId) ??
    program.daughters[0];

  const exportReady = exportDaughter
    ? branchExportReadiness({
        daughter: exportDaughter,
        motherActualRecords: program.mother.actualRecords,
        approval: exportDaughter.approval,
        recoveryAssumptions,
      })
    : null;

  const handleExportPdf = async () => {
    if (!exportDaughter || !exportReady?.ready) return;
    const logoImagePng = await loadPdfLogoBase64();
    const trajectoryImagePng = getTrajectorySnapshot(
      planStations,
      actualStations,
      recommendation,
      { branchOverlay }
    );
    const data = buildBranchReportData({
      program,
      daughter: exportDaughter,
      recoveryAssumptions,
      logoImagePng,
      trajectoryImagePng,
    });
    await downloadBranchReportPdf(data);
  };

  const hasProgram = Boolean(program.persisted);
  const planningReadOnly = branchPlannerContext?.planningReadOnly ?? false;

  return (
    <div className="branch-program-panel">
      <AdvancedTabHero
        eyebrow="Mother hole branching"
        title="Branch program"
        copy="Define branch targets, rank kickoff depths, and track daughter approval and handover. Planning estimates only — confirm kickoff and toolface with the directional contractor before drilling."
      />
      {branchPlannerContext &&
      (branchPlannerContext.planningReadOnly ||
        branchPlannerContext.blockBranchInit ||
        branchPlannerContext.isPlannerHole) ? (
        <BranchPlannerWorkflowBanner context={branchPlannerContext} />
      ) : null}

      <p className="branch-program-disclaimer" role="note">
        <strong>Planning estimate only</strong>
        Kickoff depth, required dogleg, and toolface must be confirmed by the directional drilling
        contractor and site geologist before drilling a daughter hole.
      </p>

      <div className={gs("branch-mother-path")}>
        <BranchProgramSummary
          program={program}
          recommendation={recommendation}
          onInitProgram={onInitProgram}
          hasProgram={hasProgram}
        />
      </div>

      {hasProgram ? (
        <>
          <div className={gs("branch-targets")}>
            <BranchTargetEditor
              targets={program.targets}
              readOnly={planningReadOnly}
              onAdd={onAddTarget}
              onUpdate={onUpdateTarget}
              onRemove={onRemoveTarget}
            />
          </div>

          <div className={gs("kickoff-planner")}>
            <KickoffPlannerPanel
              program={program}
              readOnly={planningReadOnly}
              onSaveDaughter={onSaveDaughter}
            />
          </div>

          <div className={gs("branch-daughters")}>
            <BranchDaughterList
              program={program}
              activeDaughterHoleId={activeDaughterHoleId}
              readOnly={planningReadOnly}
              onSetActive={onSetActiveDaughter}
              onArchive={onArchiveDaughter}
              onStatusChange={onStatusChange}
            />
          </div>

          {program.daughters.map((d) => (
            <div key={d.daughterHoleId} className={gs("branch-approval")}>
              <BranchApprovalPanel
                program={program}
                daughter={d}
                recoveryAssumptions={recoveryAssumptions}
                readOnly={planningReadOnly}
                onApprove={onApprove}
                onStatusChange={onStatusChange}
              />
            </div>
          ))}

          {exportDaughter ? (
            <article className={`targetlock-panel ${gs("branch-export")}`}>
              <div className="targetlock-panel-title">
                <h2>
                  Branch handover{" "}
                  <InfoTip tip="PDF branch planning report for the active daughter — decision support only." />
                </h2>
              </div>
              <p className="targetlock-panel-copy">
                Export includes kickoff, required DLS, separation context, and approval snapshot
                when present.
              </p>
              <button
                type="button"
                className="targetlock-btn targetlock-btn-primary"
                onClick={() => void handleExportPdf()}
                disabled={!exportReady?.ready}
                title={!exportReady?.ready ? exportReady?.reason : undefined}
              >
                Export branch plan PDF ({exportDaughter.daughterId})
              </button>
              {!exportReady?.ready ? (
                <p className="targetlock-helper m-0 mt-2" role="note">
                  {exportReady?.reason}
                </p>
              ) : null}
            </article>
          ) : null}
        </>
      ) : null}

      <section className="targetlock-charts-band" aria-label="Program map">
        <ChartPanel
          kicker="Program map"
          title="Plan view"
          meta={
            <span className="targetlock-legend text-xs text-[var(--tl-muted)]">
              <i className="plan-line" />
              Plan <i className="actual-line" />
              Actual
            </span>
          }
          lead={
            <p className="targetlock-settings-form-card-copy">
              {holeRole === "daughter"
                ? "Mother (muted) · siblings · active daughter"
                : "Mother · daughters · kickoffs · targets"}
            </p>
          }
        >
          <TrajectoryCanvas
            kind="plan"
            planStations={planStations}
            actualStations={actualStations}
            recommendation={recommendation}
            branchOverlay={branchOverlay}
            className="chart-canvas-wrap"
          />
        </ChartPanel>
        <ChartPanel
          kicker="Program map"
          className="targetlock-chart-3d-panel"
          title={
            <>
              3D view{" "}
              <InfoTip tip="Plan and actual paths in east, north, and down. Branch overlays show mother, daughters, and kickoff nodes." />
            </>
          }
          meta={
            <span className="targetlock-legend text-xs text-[var(--tl-muted)]">
              <i className="plan-line" />
              Plan <i className="actual-line" />
              Actual
            </span>
          }
        >
          <Trajectory3D
            planStations={planStations}
            actualStations={actualStations}
            recommendation={recommendation}
            branchOverlay={branchOverlay}
          />
        </ChartPanel>
      </section>

      <article className="targetlock-panel">
        <div className="targetlock-panel-title">
          <h2>Branch table</h2>
          <span className="targetlock-mini-tag">
            {program.daughters.length} daughter{program.daughters.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="targetlock-panel-copy">
          At-a-glance comparison of daughters linked to this mother program.
        </p>
        {program.daughters.length === 0 ? (
          <p className="branch-program-muted">No daughters in the program yet.</p>
        ) : (
          <div className="branch-program-table-wrap">
            <table className="branch-program-table">
              <thead>
                <tr>
                  <th>Daughter</th>
                  <th>Target</th>
                  <th>Kickoff MD</th>
                  <th>Method</th>
                  <th>Required DLS</th>
                  <th>Separation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {program.daughters.map((d, i) => {
                  const a = analyses[i]!;
                  const isActive = d.daughterHoleId === activeDaughterHoleId;
                  return (
                    <tr key={d.daughterHoleId} className={isActive ? "is-selected" : undefined}>
                      <td>{d.daughterId}</td>
                      <td>{a.target?.label ?? d.targetId}</td>
                      <td>{round(d.kickoffMd, 0)} m</td>
                      <td>{methodLabel(d.method)}</td>
                      <td>{round(a.requiredDls, 1)}°/30 m</td>
                      <td>
                        {a.separation
                          ? `${round(a.separation.minDistanceM, 1)} m · ${separationLabel(a.separation.status)}`
                          : "—"}
                      </td>
                      <td>
                        <span className={`branch-status branch-status--${d.status}`}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  );
}
