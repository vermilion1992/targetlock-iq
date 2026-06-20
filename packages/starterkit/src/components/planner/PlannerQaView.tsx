"use client";

import { useMemo, useState } from "react";
import type { HoleLibrary } from "@/lib/drilling/hole-library";
import { derivePlannerPrograms } from "@/lib/drilling/planner-program";
import { buildProgramQaReport } from "@/lib/drilling/planner-qa";
import type { PlannerClearancePair, PlannerQaSettings } from "@/lib/drilling/planner-types";
import { AdvancedTabHero } from "@/components/dashboard/AdvancedTabHero";
import { PlannerClearanceTable } from "./PlannerClearanceTable";
import { PlannerDrillabilityPanel } from "./PlannerDrillabilityPanel";
import { PlannerQaSettingsPanel } from "./PlannerQaSettingsPanel";
import { PlannerEmptyState } from "./ui/PlannerEmptyState";
import { PlannerMetricStrip } from "./ui/PlannerMetricStrip";
import { PlannerSubPanel } from "./ui/PlannerSubPanel";

type Props = {
  library: HoleLibrary;
  selectedProgramId?: string | null;
  selectedHoleId?: string | null;
  onSelectHole: (holeId: string) => void;
  onViewOnMap: (pair: PlannerClearancePair) => void;
  onSaveQaSettings: (programId: string, settings: PlannerQaSettings) => void;
};

function pairKey(pair: PlannerClearancePair): string {
  return `${pair.holeAId}:${pair.holeBId}:${pair.relationship}`;
}

export function PlannerQaView({
  library,
  selectedProgramId,
  selectedHoleId,
  onSelectHole,
  onViewOnMap,
  onSaveQaSettings,
}: Props) {
  const programs = useMemo(() => derivePlannerPrograms(library), [library]);
  const programId = selectedProgramId ?? programs[0]?.programId ?? null;

  const report = useMemo(
    () => (programId ? buildProgramQaReport(library, programId) : null),
    [library, programId]
  );

  const [selectedPairKey, setSelectedPairKey] = useState<string | null>(null);

  const holeNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const hole of library.holes) {
      names[hole.holeId] = hole.holeName;
    }
    return names;
  }, [library]);

  if (!programs.length) {
    return (
      <div className="planner-qa-view">
        <AdvancedTabHero
          eyebrow="Verify"
          title="Planning QA"
          copy="Institutional review board — blockers, clearance pairs, and drillability."
        />
        <PlannerEmptyState message="No planner programs yet. Create plans to run clearance and drillability checks." />
      </div>
    );
  }

  const hardBlockers =
    report?.holeSummaries.filter((s) => s.badge === "blocked").length ?? 0;

  const qaMetrics = report
    ? [
        {
          id: "blockers",
          label: "Blockers",
          value: String(hardBlockers),
          tone: hardBlockers > 0 ? ("risk" as const) : ("on-track" as const),
        },
        {
          id: "risks",
          label: "Risks",
          value: String(report.programSummary.riskCount),
          tone: report.programSummary.riskCount > 0 ? ("risk" as const) : ("on-track" as const),
        },
        {
          id: "warnings",
          label: "Warnings",
          value: String(report.programSummary.watchCount),
          tone: report.programSummary.watchCount > 0 ? ("watch" as const) : ("default" as const),
        },
        {
          id: "clearance",
          label: "Closest clearance",
          value:
            report.programSummary.closestClearanceM !== null
              ? `${report.programSummary.closestClearanceM.toFixed(1)} m`
              : "—",
        },
      ]
    : [];

  return (
    <div className="planner-qa-view">
      <AdvancedTabHero
        eyebrow="Verify"
        title="Planning QA"
        copy="Institutional review board — blockers, clearance pairs, and drillability."
      />

      {report ? (
        <PlannerMetricStrip title="Program QA summary" metrics={qaMetrics} />
      ) : null}

      {report ? (
        <div className="planner-qa-detail-grid">
          <PlannerSubPanel kicker="QA" title="Clearance checks">
            <PlannerClearanceTable
              pairs={report.clearancePairs}
              selectedPairKey={selectedPairKey}
              onSelectPair={(pair) => {
                setSelectedPairKey(pairKey(pair));
                onSelectHole(pair.holeAId);
              }}
              onViewOnMap={onViewOnMap}
            />
            <p className="targetlock-panel-footnote">
              Approximate planning QA — not a certified anti-collision system. Assumptions
              and formulas are documented in How it works.
            </p>
          </PlannerSubPanel>

          <PlannerDrillabilityPanel
            summaries={report.holeSummaries}
            holeNames={holeNames}
            selectedHoleId={selectedHoleId}
            onSelectHole={onSelectHole}
          />
        </div>
      ) : null}

      {report && programId ? (
        <PlannerQaSettingsPanel
          settings={report.settings}
          onSave={(settings) => onSaveQaSettings(programId, settings)}
        />
      ) : null}
    </div>
  );
}
