"use client";

import Link from "next/link";
import { ExecutionAuditPanel } from "@/components/dashboard/ExecutionAuditPanel";
import { ExecutionPackagePanel } from "@/components/dashboard/ExecutionPackagePanel";
import type { ActualVsPlannedResult } from "@/lib/drilling/actual-vs-plan";
import {
  buildExecutionAuditReport,
  type ExecutionAuditReport,
} from "@/lib/drilling/execution-audit";
import type { PlannerExecutionContext } from "@/lib/drilling/execution-bridge";
import { round } from "@/lib/drilling/format";
import type { HoleLibrary } from "@/lib/drilling/hole-library";
import type { SavedHoleProject } from "@/lib/drilling/storage";
import { PlannerSubPanel } from "./ui/PlannerSubPanel";

type Props = {
  hole: SavedHoleProject;
  library: HoleLibrary;
  context: PlannerExecutionContext;
  actualVsPlanned: ActualVsPlannedResult;
  audit?: ExecutionAuditReport | null;
};

export function PlannerExecutionAuditPanel({
  hole,
  library,
  context,
  actualVsPlanned,
  audit: auditProp,
}: Props) {
  const audit = auditProp ?? buildExecutionAuditReport(hole, library);
  if (!audit) return null;

  const completion = hole.plannerMeta?.completionSnapshot;

  return (
    <div className="planner-execution-audit-stack">
      <ExecutionAuditPanel audit={audit} />
      {completion ? (
        <PlannerSubPanel kicker="Execution" title="Completion snapshot">
          <dl className="planner-lock-dl">
            <div>
              <dt>Completed at</dt>
              <dd>{new Date(completion.completedAt).toLocaleString("en-AU")}</dd>
            </div>
            {completion.completedBy ? (
              <div>
                <dt>Completed by</dt>
                <dd>{completion.completedBy}</dd>
              </div>
            ) : null}
            <div>
              <dt>Final actual MD</dt>
              <dd>
                {completion.finalActualMd !== null
                  ? `${round(completion.finalActualMd, 0)} m`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Final tracking</dt>
              <dd>{completion.finalTrackingStatus ?? "—"}</dd>
            </div>
            {completion.reportSummary ? (
              <div>
                <dt>Summary</dt>
                <dd>{completion.reportSummary}</dd>
              </div>
            ) : null}
          </dl>
        </PlannerSubPanel>
      ) : (
        <PlannerSubPanel kicker="Execution" title="Latest tracking">
          <p className="targetlock-panel-copy">
            {actualVsPlanned.summary} — offset{" "}
            {actualVsPlanned.latestPlanOffsetM !== null
              ? `${round(actualVsPlanned.latestPlanOffsetM, 2)} m`
              : "—"}
          </p>
        </PlannerSubPanel>
      )}
      <ExecutionPackagePanel hole={hole} library={library} />
      <Link
        href="/targetlock"
        className="targetlock-btn targetlock-btn-sm"
      >
        Open dashboard ({context.holeName})
      </Link>
    </div>
  );
}
