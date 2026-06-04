"use client";

import type { BranchProgram } from "@/lib/drilling/branch-program-types";
import type { Recommendation } from "@/lib/drilling/types";
import { round } from "@/lib/drilling/format";

type Props = {
  program: BranchProgram;
  recommendation: Recommendation | null;
  onInitProgram?: () => void;
  hasProgram: boolean;
};

export function BranchProgramSummary({
  program,
  recommendation,
  onInitProgram,
  hasProgram,
}: Props) {
  if (!hasProgram) {
    return (
      <article className="targetlock-panel">
        <div className="targetlock-panel-title">
          <h2>Branch program</h2>
        </div>
        <p className="targetlock-panel-copy">
          No branch program on this mother hole yet. Start one to add targets, rank kickoffs, and
          manage daughter holes.
        </p>
        {onInitProgram ? (
          <button
            type="button"
            className="targetlock-btn targetlock-btn-primary"
            onClick={onInitProgram}
          >
            Start branch program
          </button>
        ) : null}
      </article>
    );
  }

  const latestMd =
    recommendation?.current.md ??
    (program.mother.actualRecords.length
      ? program.mother.actualRecords[program.mother.actualRecords.length - 1]!.md
      : null);

  return (
    <article className="targetlock-panel">
      <div className="targetlock-panel-title">
        <h2>Program summary</h2>
        <span className="targetlock-mini-tag">
          {program.daughters.length} daughter{program.daughters.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="targetlock-panel-copy">
        {program.name}
        {program.site ? ` · ${program.site}` : ""} · {program.targets.length} target
        {program.targets.length === 1 ? "" : "s"}
      </p>
      <dl className="targetlock-validation-values">
        <div>
          <dt>Mother hole</dt>
          <dd>{program.mother.holeId}</dd>
        </div>
        <div>
          <dt>Mother latest MD</dt>
          <dd>{latestMd != null ? `${round(latestMd, 0)} m` : "—"}</dd>
        </div>
        <div>
          <dt>Program ID</dt>
          <dd>{program.id}</dd>
        </div>
      </dl>
    </article>
  );
}
