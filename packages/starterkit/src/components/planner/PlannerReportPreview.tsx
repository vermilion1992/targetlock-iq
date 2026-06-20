"use client";

import { useMemo } from "react";
import type { HoleLibrary } from "@/lib/drilling/hole-library";
import {
  buildHolePlanningReportData,
  buildProgramPlanningReportData,
} from "@/lib/drilling/planner-report-data";
import {
  buildHolePlanningReportText,
  buildProgramPlanningReportText,
} from "@/lib/drilling/planner-report-text";
import { PlannerCollapsibleCard } from "./ui/PlannerCollapsibleCard";

type HoleProps = {
  mode: "hole";
  library: HoleLibrary;
  holeId: string;
};

type ProgramProps = {
  mode: "program";
  library: HoleLibrary;
  programId: string;
};

type Props = HoleProps | ProgramProps;

export function PlannerReportPreview(props: Props) {
  const text = useMemo(() => {
    if (props.mode === "hole") {
      const data = buildHolePlanningReportData(props.library, props.holeId);
      return data ? buildHolePlanningReportText(data) : null;
    }
    const data = buildProgramPlanningReportData(props.library, props.programId);
    return data ? buildProgramPlanningReportText(data) : null;
  }, [props]);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!text) {
    return null;
  }

  return (
    <PlannerCollapsibleCard
      kicker="Package"
      title="Report preview"
      className="planner-side-panel planner-report-preview"
    >
      <p className="targetlock-panel-copy">
        Preview the planning TXT report before export or handoff.
      </p>
      <pre className="planner-report-preview-text">{text}</pre>
      <button
        type="button"
        className="targetlock-btn targetlock-btn-secondary"
        onClick={handleCopy}
      >
        Copy to clipboard
      </button>
    </PlannerCollapsibleCard>
  );
}
