"use client";

import { useMemo } from "react";
import {
  analyzeDaughterBranch,
  methodSuitabilityForDls,
} from "@/lib/drilling/branch-program";
import type { BranchProgram } from "@/lib/drilling/branch-program-types";
import { buildStations } from "@/lib/drilling/desurvey";
import { round } from "@/lib/drilling/format";
import type { Recommendation } from "@/lib/drilling/types";

type Props = {
  program: BranchProgram;
  actualRecords: import("@/lib/drilling/types").SurveyRecord[];
  recommendation: Recommendation | null;
  holeRole: "standard" | "mother" | "daughter";
  holeName: string;
  parentHoleName?: string | null;
  kickoffMd?: number | null;
  branchTargetId?: string | null;
  activeHoleId?: string;
};

export function BranchProgramSimpleStrip({
  program,
  actualRecords,
  recommendation,
  holeRole,
  holeName,
  parentHoleName,
  kickoffMd,
  branchTargetId,
  activeHoleId,
}: Props) {
  const motherStations = useMemo(
    () =>
      holeRole === "daughter"
        ? buildStations(program.mother.actualRecords)
        : buildStations(actualRecords),
    [holeRole, program.mother.actualRecords, actualRecords]
  );

  const activeDaughter =
    holeRole === "daughter"
      ? program.daughters.find((d) => d.daughterHoleId === activeHoleId)
      : program.daughters.find(
          (d) => d.daughterHoleId === program.persisted?.activeDaughterHoleId
        ) ?? program.daughters[0];

  const analysis = useMemo(() => {
    const daughter = activeDaughter ?? program.daughters[0];
    if (!daughter) return null;
    return analyzeDaughterBranch(
      program.mother.actualRecords,
      daughter,
      program.targets,
      motherStations
    );
  }, [program, activeDaughter, motherStations]);

  const onTrack = useMemo(() => {
    if (!analysis?.separation) return "unknown";
    if (analysis.separation.status === "warning") return "off-track";
    if (analysis.separation.status === "caution") return "watch";
    if (analysis.requiredDls > 5) return "watch";
    return "on-track";
  }, [analysis]);

  const directionalReview =
    analysis != null && methodSuitabilityForDls(analysis.requiredDls) === "wedge";

  const currentAction = recommendation?.classification.label ?? "No data";
  const targetLabel =
    (branchTargetId && program.targets.find((t) => t.id === branchTargetId)?.label) ||
    analysis?.target?.label ||
    "—";

  const activeHoleLabel =
    holeRole === "daughter"
      ? `${holeName} (daughter)`
      : holeRole === "mother"
        ? `${holeName} (mother)`
        : holeName;

  return (
    <section className="targetlock-panel branch-simple-strip simple-only" aria-label="Branch program summary">
      <div className="targetlock-panel-title">
        <h2>Branch program</h2>
        <span className={`branch-on-track branch-on-track--${onTrack}`}>
          {onTrack === "on-track"
            ? "On track"
            : onTrack === "watch"
              ? "Watch"
              : onTrack === "off-track"
                ? "Review"
                : "—"}
        </span>
      </div>
      <dl className="targetlock-validation-values branch-simple-strip-grid">
        <div>
          <dt>Active hole</dt>
          <dd>{activeHoleLabel}</dd>
        </div>
        {holeRole === "daughter" && parentHoleName ? (
          <div>
            <dt>Parent</dt>
            <dd>{parentHoleName}</dd>
          </div>
        ) : null}
        {kickoffMd != null ? (
          <div>
            <dt>Kickoff</dt>
            <dd>{round(kickoffMd, 0)} m</dd>
          </div>
        ) : null}
        <div>
          <dt>Current action</dt>
          <dd>{currentAction}</dd>
        </div>
        <div>
          <dt>Active target</dt>
          <dd>{targetLabel}</dd>
        </div>
        {analysis ? (
          <div>
            <dt>Required DLS</dt>
            <dd>{round(analysis.requiredDls, 1)}°/30 m</dd>
          </div>
        ) : null}
      </dl>
      {directionalReview ? (
        <p className="branch-simple-review" role="status">
          Directional review required — branch exceeds smooth recovery band.
        </p>
      ) : null}
    </section>
  );
}
