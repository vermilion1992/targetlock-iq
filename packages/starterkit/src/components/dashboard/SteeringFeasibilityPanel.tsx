"use client";

import { useState } from "react";
import { InfoTip } from "@/components/layout/InfoTip";
import { round } from "@/lib/drilling/format";
import { liftDropLabel, swingLabel } from "@/lib/drilling/steering-feasibility";
import type { PlanCorridorStatus } from "@/lib/drilling/plan-corridor";
import type {
  MethodFeasibility,
  SteeringFeasibility,
  SteeringMethodId,
} from "@/lib/drilling/steering-types";

type Props = {
  steering: SteeringFeasibility;
  corridorStatus?: PlanCorridorStatus | null;
};

type SummaryRow = {
  label: string;
  verdict: string;
  ok: boolean;
  tip?: string;
};

function method(steering: SteeringFeasibility, id: SteeringMethodId): MethodFeasibility | undefined {
  return steering.methods.find((m) => m.id === id);
}

function buildSummary(steering: SteeringFeasibility): SummaryRow[] {
  const natural = method(steering, "natural");
  const parameter = method(steering, "parameter");
  const motor = method(steering, "motor_navi");
  const devidrill = method(steering, "devidrill");
  const wedge = method(steering, "wedge_branch");

  const naturalParamOk = Boolean(natural?.feasible || parameter?.feasible);
  const motorDeviOk = Boolean(motor?.feasible || devidrill?.feasible);
  const wedgeReview = Boolean(wedge?.feasible);

  return [
    {
      label: "Natural / parameter correction",
      verdict: naturalParamOk ? "May recover the hole" : "Unlikely at current drift",
      ok: naturalParamOk,
      tip: "Rig steering or WOB/RPM/pump changes within configured DLS assumptions.",
    },
    {
      label: "Motor / Navi or DeviDrill",
      verdict: naturalParamOk
        ? "Not required yet"
        : motorDeviOk
          ? "Review recommended"
          : "Beyond assumed tool range",
      ok: naturalParamOk,
      tip: "Directional tooling — capability depends on hole size, ground, and contractor.",
    },
    {
      label: "Wedge / branch",
      verdict: wedgeReview ? "Review recommended" : "Not indicated",
      ok: !wedgeReview,
      tip: "Sidetrack or branch — not a smooth in-hole recovery.",
    },
    {
      label: "Point of no return (est.)",
      verdict: steering.pointOfNoReturnMd
        ? `${round(steering.pointOfNoReturnMd, 0)} m`
        : "Not reached in remaining hole",
      ok: !steering.pointOfNoReturnMd,
      tip: "Estimated depth where available methods may no longer recover the hole to target.",
    },
  ];
}

export function SteeringFeasibilityPanel({ steering, corridorStatus }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const summary = buildSummary(steering);

  return (
    <article className="targetlock-panel targetlock-steering-panel">
      {corridorStatus ? (
        <p className="targetlock-corridor-inline" role="status">
          <strong>Plan corridor:</strong> {corridorStatus.detailPhrase}
        </p>
      ) : null}
      <div className="targetlock-panel-title">
        <h2>
          Steering feasibility{" "}
          <InfoTip tip="Can the hole realistically recover, and with what method? Values are configurable assumptions — verify against site conditions." />
        </h2>
        <span className="targetlock-mini-tag">
          DLS to target{" "}
          {Number.isFinite(steering.requiredDlsToTarget)
            ? round(steering.requiredDlsToTarget, 2)
            : "—"}
          °/30 m
        </span>
      </div>

      <p className="targetlock-panel-copy">{steering.trendPhrase}</p>

      <dl className="targetlock-steering-verdicts">
        {summary.map((row) => (
          <div
            key={row.label}
            className={`targetlock-steering-verdict ${row.ok ? "is-ok" : "is-review"}`}
          >
            <dt>
              {row.label}
              {row.tip ? <InfoTip tip={row.tip} /> : null}
            </dt>
            <dd>{row.verdict}</dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        className="targetlock-link-btn"
        onClick={() => setShowDetails((v) => !v)}
        aria-expanded={showDetails}
      >
        {showDetails ? "Hide details" : "Show details (intervals, rejoin DLS, method assumptions)"}
      </button>

      {showDetails ? (
        <div className="targetlock-steering-details">
          <div className="targetlock-steering-detail-cols">
            <section className="targetlock-steering-detail-col">
              <h3 className="targetlock-steering-subhead">
                Interval behaviour — planned vs actual{" "}
                <InfoTip tip="Lift/drop is the change in dip across the interval; swing is the change in azimuth. Δ is actual minus planned — large Δ means the hole is not building or turning as expected." />
              </h3>
              <div className="targetlock-table-wrap targetlock-table-wrap--steering">
                <table>
                  <thead>
                    <tr>
                      <th>MD</th>
                      <th>Planned lift/drop</th>
                      <th>Actual lift/drop</th>
                      <th>Δ</th>
                      <th>Planned swing</th>
                      <th>Actual swing</th>
                      <th>Δ</th>
                      <th>Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {steering.intervals.length === 0 ? (
                      <tr>
                        <td colSpan={8}>Need at least two surveys for interval comparison.</td>
                      </tr>
                    ) : (
                      steering.intervals.map((row) => (
                        <tr key={`${row.mdFrom}-${row.mdTo}`}>
                          <td>
                            {round(row.mdFrom, 0)}–{round(row.mdTo, 0)}
                          </td>
                          <td>{liftDropLabel(row.plannedLiftDrop)}</td>
                          <td>{liftDropLabel(row.actualLiftDrop)}</td>
                          <td>{liftDropLabel(row.liftDropDelta)}</td>
                          <td>{swingLabel(row.plannedSwing)}</td>
                          <td>{swingLabel(row.actualSwing)}</td>
                          <td>{swingLabel(row.swingDelta)}</td>
                          <td className={row.outsideTolerance ? "status-watch" : "status-ok"}>
                            {row.outsideTolerance ? "Outside" : "OK"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="targetlock-steering-detail-col">
              <h3 className="targetlock-steering-subhead">
                DLS to rejoin planned path{" "}
                <InfoTip tip="Dogleg severity (°/30 m) needed to steer back onto the plan by each depth. 'Within max DLS' compares it against your configured assumption." />
              </h3>
              <div className="targetlock-table-wrap targetlock-table-wrap--steering">
                <table>
                  <thead>
                    <tr>
                      <th>By depth</th>
                      <th>Required DLS</th>
                      <th>Within max DLS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {steering.rejoinByDepth.map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        <td>
                          {Number.isFinite(row.requiredDls)
                            ? `${round(row.requiredDls, 2)}°/30 m`
                            : "—"}
                        </td>
                        <td className={row.feasible ? "status-ok" : "status-watch"}>
                          {row.feasible ? "Yes" : "Review"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <h3 className="targetlock-steering-subhead">Method feasibility (assumptions)</h3>
          <div className="targetlock-steering-methods">
            {steering.methods.map((method) => (
              <div
                key={method.id}
                className={`targetlock-steering-method ${method.feasible ? "feasible" : "review"}`}
              >
                <div className="targetlock-steering-method-head">
                  <strong>{method.label}</strong>
                  <span className="targetlock-mini-tag">{method.dlsRangeLabel}</span>
                </div>
                <p>{method.phrase}</p>
                <small>{method.note}</small>
              </div>
            ))}
          </div>

          <p className="targetlock-panel-footnote">{steering.assumptionsNote}</p>
        </div>
      ) : (
        <p className="targetlock-panel-footnote">
          DLS assumptions are configurable and depend on ground, rig, rods, hole size, tool, and
          contractor.
        </p>
      )}
    </article>
  );
}
