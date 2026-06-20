"use client";

import { useMemo } from "react";
import {
  resolveProgramCoordinateSystem,
  type HoleLibrary,
} from "@/lib/drilling/hole-library";
import {
  buildRelationshipTree,
  derivePlannerPrograms,
  holesInProgram,
  plannerHoleSummary,
} from "@/lib/drilling/planner-program";
import type {
  PlannerProjectCoordinateSystem,
  PlannerQaReport,
} from "@/lib/drilling/planner-types";
import { firstCollarLatLon } from "@/lib/drilling/coordinate-system";
import { evaluateProgramReadiness } from "@/lib/drilling/planner-command-center";
import { AdvancedTabHero } from "@/components/dashboard/AdvancedTabHero";
import { PlannerRelationshipTree } from "./PlannerRelationshipTree";
import { PlannerStatusBadge } from "./PlannerStatusBadge";
import { ProjectCoordinatePanel } from "./ProjectCoordinatePanel";
import { PlannerEmptyState } from "./ui/PlannerEmptyState";
import { PlannerMetricRow } from "./ui/PlannerMetricRow";
import { PlannerSubPanel } from "./ui/PlannerSubPanel";
import { PlannerWarningList } from "./ui/PlannerWarningList";

type Props = {
  library: HoleLibrary;
  selectedProgramId?: string | null;
  qaReport?: PlannerQaReport | null;
  onSaveProjectCoordinates: (
    programId: string,
    pcs: PlannerProjectCoordinateSystem | undefined
  ) => void;
  onOpenReview?: (holeId: string) => void;
  selectedHoleId?: string | null;
};

export function PlannerProgramView({
  library,
  selectedProgramId,
  onSaveProjectCoordinates,
  onOpenReview,
  selectedHoleId,
}: Props) {
  const programs = useMemo(() => derivePlannerPrograms(library), [library]);
  const programId =
    selectedProgramId ?? programs[0]?.programId ?? null;
  const program = programs.find((p) => p.programId === programId);

  const programHoles = useMemo(
    () => (programId ? holesInProgram(library, programId, true) : []),
    [library, programId]
  );

  const tree = useMemo(
    () => buildRelationshipTree(programHoles, library),
    [programHoles, library]
  );

  const programReadiness = useMemo(
    () => (programId ? evaluateProgramReadiness(library, programId) : null),
    [library, programId]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const h of programHoles) {
      const s = plannerHoleSummary(h, library).status;
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [programHoles, library]);

  if (!programs.length) {
    return (
      <div className="planner-program-view">
        <AdvancedTabHero
          eyebrow="Visualise"
          title="Program"
          copy="Program operations — relationships, counts, and coordinate setup."
        />
        <PlannerEmptyState message="No planner programs yet. Create plans and assign a program name in project setup." />
      </div>
    );
  }

  // Readiness badge and Holes / QA risk counts live in the sidebar status
  // footer; this panel only carries the per-status breakdown unique to Program.
  const statusTone = (status: string): "default" | "on-track" | "watch" | "risk" => {
    const s = status.toLowerCase();
    if (s.includes("active") || s.includes("approved")) {
      return s.includes("stale") ? "risk" : "on-track";
    }
    if (s.includes("draft")) return "watch";
    if (s.includes("blocked") || s.includes("stale")) return "risk";
    return "default";
  };
  const programMetrics = Object.entries(statusCounts).map(([status, count]) => ({
    label: status,
    value: String(count),
    tone: statusTone(status),
  }));

  return (
    <div className="planner-program-view">
      <AdvancedTabHero
        eyebrow="Visualise"
        title={program?.name ?? "Program"}
        copy="Program operations — relationships, counts, and coordinate setup."
        meta={program ? <PlannerStatusBadge status={program.status} /> : null}
        actions={
          selectedHoleId && onOpenReview ? (
            <button
              type="button"
              className="targetlock-btn targetlock-btn-sm"
              onClick={() => onOpenReview(selectedHoleId)}
            >
              Review selected
            </button>
          ) : null
        }
      />

      {programMetrics.length ? (
        <PlannerSubPanel kicker="Program" title="Status breakdown">
          <PlannerMetricRow metrics={programMetrics} />
        </PlannerSubPanel>
      ) : null}

      {programReadiness?.blockers.length ? (
        <PlannerWarningList
          title="Blockers"
          items={programReadiness.blockers}
          variant="risk"
        />
      ) : null}
      {programReadiness?.warnings.length ? (
        <PlannerWarningList
          title="Warnings"
          items={programReadiness.warnings}
          variant="watch"
        />
      ) : null}

      <PlannerSubPanel kicker="Program" title="Relationship tree">
        <PlannerRelationshipTree nodes={tree} />
      </PlannerSubPanel>

      {programReadiness ? (
        <PlannerSubPanel kicker="Program" title="Package readiness">
          <ul className="planner-checklist">
            {programReadiness.gates.map((g) => (
              <li
                key={g.id}
                className={`planner-checklist-item planner-checklist-item--${
                  g.passed ? "ok" : "watch"
                }`}
              >
                <span className="planner-checklist-icon" aria-hidden="true">
                  {g.passed ? "✓" : "!"}
                </span>
                <span className="planner-checklist-text">
                  <span className="planner-checklist-label">{g.label}</span>
                  <span className="planner-checklist-detail">
                    {g.passed ? "Ready" : g.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </PlannerSubPanel>
      ) : null}

      {programId ? (
        <ProjectCoordinatePanel
          compact
          pcs={resolveProgramCoordinateSystem(programHoles)}
          fallbackLatLon={firstCollarLatLon(programHoles)}
          onSave={(pcs) => onSaveProjectCoordinates(programId, pcs)}
        />
      ) : null}
    </div>
  );
}
