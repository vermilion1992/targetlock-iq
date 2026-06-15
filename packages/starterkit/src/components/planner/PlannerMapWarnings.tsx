"use client";

import type { PlannerClearancePair } from "@/lib/drilling/planner-types";

type Props = {
  programWarnings: string[];
  holeWarnings: string[];
  holeName?: string;
  clearanceRisks?: PlannerClearancePair[];
  satelliteWarnings?: string[];
};

export function PlannerMapWarnings({
  programWarnings,
  holeWarnings,
  holeName,
  clearanceRisks = [],
  satelliteWarnings = [],
}: Props) {
  const hasWarnings =
    programWarnings.length > 0 ||
    holeWarnings.length > 0 ||
    clearanceRisks.length > 0 ||
    satelliteWarnings.length > 0;

  return (
    <article className="targetlock-panel planner-map-warnings">
      <div className="targetlock-panel-title">
        <h3>Warnings</h3>
      </div>
      {!hasWarnings ? (
        <p className="targetlock-panel-copy planner-map-warnings-empty">
          No spatial warnings.
        </p>
      ) : (
        <div className="planner-map-warnings-lists">
          {programWarnings.length > 0 ? (
            <section>
              <h4>Program</h4>
              <ul>
                {programWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {holeWarnings.length > 0 ? (
            <section>
              <h4>{holeName ?? "Selected hole"}</h4>
              <ul>
                {holeWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {satelliteWarnings.length > 0 ? (
            <section>
              <h4>Satellite placement</h4>
              <ul>
                {satelliteWarnings.slice(0, 6).map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {clearanceRisks.length > 0 ? (
            <section>
              <h4>Clearance risks</h4>
              <ul>
                {clearanceRisks.slice(0, 5).map((p) => (
                  <li key={`${p.holeAId}-${p.holeBId}`}>{p.message}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </article>
  );
}
