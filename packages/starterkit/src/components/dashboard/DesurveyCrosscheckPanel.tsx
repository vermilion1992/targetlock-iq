"use client";

import { useMemo } from "react";
import { compareDesurveyMethods } from "@/lib/drilling/desurvey";
import { InfoTip } from "@/components/layout/InfoTip";
import type { SurveyRecord } from "@/lib/drilling/types";

type Props = {
  planRecords: SurveyRecord[];
  actualRecords: SurveyRecord[];
};

function ComparisonTable({
  title,
  records,
}: {
  title: string;
  records: SurveyRecord[];
}) {
  const comparison = useMemo(() => compareDesurveyMethods(records), [records]);
  if (!comparison.length) return null;

  return (
    <div className="desurvey-crosscheck-block">
      <h4>{title}</h4>
      <table className="targetlock-table desurvey-crosscheck-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>End E (m)</th>
            <th>End N (m)</th>
            <th>End D (m)</th>
            <th>Δ vs min curvature</th>
          </tr>
        </thead>
        <tbody>
          {comparison.map((entry) => (
            <tr key={entry.method}>
              <td>{entry.label}</td>
              <td>{entry.end.e.toFixed(2)}</td>
              <td>{entry.end.n.toFixed(2)}</td>
              <td>{entry.end.d.toFixed(2)}</td>
              <td>
                {entry.method === "minimum-curvature"
                  ? "reference"
                  : `${entry.deltaFromMinCurveM.toFixed(2)} m`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DesurveyCrosscheckPanel({ planRecords, actualRecords }: Props) {
  const hasData = planRecords.length > 1 || actualRecords.length > 1;

  return (
    <article className="targetlock-panel desurvey-crosscheck-panel">
      <div className="targetlock-panel-title">
        <h3>
          Desurvey method cross-check{" "}
          <InfoTip tip="Bottom-hole position computed with minimum curvature (TargetLock default), balanced tangential, and radius of curvature. Use this to reconcile against contractor or mine databases that desurvey with a different method." />
        </h3>
      </div>
      {!hasData ? (
        <p className="targetlock-panel-copy">
          Load plan or actual surveys to compare desurvey methods.
        </p>
      ) : (
        <>
          <p className="targetlock-panel-copy">
            All TargetLock calculations use minimum curvature. The deltas below
            quantify how much an alternative desurvey convention shifts the
            bottom-hole position for this hole.
          </p>
          {actualRecords.length > 1 ? (
            <ComparisonTable title="Actual surveys" records={actualRecords} />
          ) : null}
          {planRecords.length > 1 ? (
            <ComparisonTable title="Planned surveys" records={planRecords} />
          ) : null}
        </>
      )}
    </article>
  );
}
