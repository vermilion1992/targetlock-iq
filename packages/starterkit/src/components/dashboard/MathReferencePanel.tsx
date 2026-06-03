"use client";

import type { ReactNode } from "react";
import { InfoTip } from "@/components/layout/InfoTip";
import { round } from "@/lib/drilling/format";
import { directionLabel } from "@/lib/drilling/geometry";
import { dipInstruction, azimuthInstruction } from "@/lib/drilling/recommendation";
import { liftDropLabel, swingLabel } from "@/lib/drilling/steering-feasibility";
import type { Recommendation } from "@/lib/drilling/types";
import type { SteeringFeasibility } from "@/lib/drilling/steering-types";

type Props = {
  recommendation: Recommendation | null;
  steering: SteeringFeasibility | null;
};

const DASH = "--";

function fmtDir(value: ReturnType<typeof directionLabel>): string {
  return value === DASH ? DASH : `${value.amount} ${value.direction}`;
}

function Section({
  index,
  title,
  formula,
  children,
  defaultOpen = false,
}: {
  index: number;
  title: string;
  formula: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="targetlock-math-section" open={defaultOpen}>
      <summary>
        <span className="targetlock-math-index">{index}</span>
        <span className="targetlock-math-title">{title}</span>
      </summary>
      <div className="targetlock-math-body">
        {children}
        <pre className="targetlock-math-formula">
          <code>{formula}</code>
        </pre>
      </div>
    </details>
  );
}

function Values({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="targetlock-math-values">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function MathReferencePanel({ recommendation, steering }: Props) {
  const r = recommendation;
  const interval = steering?.latestInterval ?? null;

  return (
    <article className="targetlock-panel targetlock-math-panel">
      <div className="targetlock-panel-title">
        <h2>
          Math reference{" "}
          <InfoTip tip="How TargetLock IQ derives direction, miss, DLS, and feasibility. Reference only — opening this does not change any calculation." />
        </h2>
        <span className="targetlock-mini-tag">Reference</span>
      </div>
      <p className="targetlock-panel-copy">
        Plain-English explanation of the calculations behind the recommendations, with live values
        from the current hole. This is here if a geologist, supervisor, or engineer wants to see
        how a number was produced — it is not part of the driller workflow.
      </p>

      {!r ? (
        <p className="targetlock-helper">
          Load plan and actual surveys to populate the live values below. The explanations still
          apply.
        </p>
      ) : null}

      <div className="targetlock-math-sections">
        <Section
          index={1}
          title="Survey direction"
          defaultOpen
          formula={`East  = cos(dip) × sin(azimuth)
North = cos(dip) × cos(azimuth)
Down  = −sin(dip)`}
        >
          <p>
            Each survey&apos;s dip and azimuth are converted into a 3D unit direction vector. Dip is
            negative pointing downward, and Down is positive with increasing depth.
          </p>
          <Values
            rows={[
              { label: "Latest dip", value: r ? `${round(r.current.dip, 1)}°` : DASH },
              { label: "Latest azimuth", value: r ? `${round(r.current.azimuth, 1)}°` : DASH },
              {
                label: "Unit vector (E / N / D)",
                value: r
                  ? `${round(r.currentVector.e, 3)} / ${round(r.currentVector.n, 3)} / ${round(
                      r.currentVector.d,
                      3
                    )}`
                  : DASH,
              },
            ]}
          />
        </Section>

        <Section
          index={2}
          title="Minimum curvature desurvey"
          formula={`β   = dogleg angle between station directions
RF  = (2 / β) × tan(β / 2)          (ratio factor)
Δpos = (L / 2) × RF × (dir₁ + dir₂)`}
        >
          <p>
            Positions are built with the minimum-curvature method: the dogleg angle between two
            consecutive survey directions is found, then a ratio factor smooths the path into a
            curve (rather than two straight legs) to estimate the displacement over the interval
            length L.
          </p>
          <Values
            rows={[
              {
                label: "Latest interval length",
                value: interval ? `${round(interval.length, 1)} m` : DASH,
              },
              {
                label: "Latest interval DLS",
                value: r ? `${round(r.current.dls, 2)}°/30 m` : DASH,
              },
              {
                label: "Current position (E / N / D)",
                value: r
                  ? `${round(r.current.e, 1)} / ${round(r.current.n, 1)} / ${round(r.current.d, 1)} m`
                  : DASH,
              },
            ]}
          />
        </Section>

        <Section
          index={3}
          title="Offset from plan"
          formula={`offset from plan = | actual_pos − planned_pos |   (3D distance)`}
        >
          <p>
            At the latest measured depth, the actual hole position is compared with the planned
            position interpolated to the same depth. The offset from plan is the straight-line 3D
            distance between them.
          </p>
          <Values
            rows={[
              {
                label: "Actual position (E / N / D)",
                value: r
                  ? `${round(r.current.e, 1)} / ${round(r.current.n, 1)} / ${round(r.current.d, 1)} m`
                  : DASH,
              },
              {
                label: "Planned position (E / N / D)",
                value: r?.currentPlan
                  ? `${round(r.currentPlan.e, 1)} / ${round(r.currentPlan.n, 1)} / ${round(
                      r.currentPlan.d,
                      1
                    )} m`
                  : DASH,
              },
              { label: "Offset from plan", value: r ? `${round(r.planOffset, 2)} m` : DASH },
            ]}
          />
        </Section>

        <Section
          index={4}
          title="Projected target miss"
          formula={`projected = current_pos + current_dir × remaining
miss      = | projected − target_pos |`}
        >
          <p>
            The current survey direction is extended in a straight line from the latest survey to
            the target measured depth. The projected miss is the 3D distance between that projected
            position and the target, broken into east/west, north/south, and high/low components.
          </p>
          <Values
            rows={[
              { label: "Remaining to target", value: r ? `${round(r.remaining, 1)} m` : DASH },
              { label: "Projected miss", value: r ? `${round(r.miss, 2)} m` : DASH },
              {
                label: "East / west",
                value: r ? fmtDir(directionLabel(r.missVector.e, "west", "east")) : DASH,
              },
              {
                label: "North / south",
                value: r ? fmtDir(directionLabel(r.missVector.n, "south", "north")) : DASH,
              },
              {
                label: "High / low",
                value: r ? fmtDir(directionLabel(r.missVector.d, "high", "low")) : DASH,
              },
            ]}
          />
        </Section>

        <Section
          index={5}
          title="Required direction to target"
          formula={`v       = target_pos − current_pos
azimuth = atan2(v_E, v_N)
dip     = −asin(v_D / |v|)`}
        >
          <p>
            The vector from the current position to the target is computed, then converted back into
            a required dip and azimuth. This is capped by the maximum dogleg over the next interval,
            producing the aim direction and the driller instruction.
          </p>
          <Values
            rows={[
              { label: "Required aim dip", value: r ? `${round(r.aimDip, 1)}°` : DASH },
              { label: "Required aim azimuth", value: r ? `${round(r.aimAzimuth, 1)}°` : DASH },
              {
                label: "Driller instruction",
                value: r
                  ? `${dipInstruction(r.dipChange)} · ${azimuthInstruction(r.aziChange)}`
                  : DASH,
              },
            ]}
          />
        </Section>

        <Section
          index={6}
          title="DLS and recovery feasibility"
          formula={`required DLS = dogleg_to_target / remaining × 30   (°/30 m)`}
        >
          <p>
            Dogleg severity (DLS) is the directional change required per 30 m. The required DLS to
            target is compared against the configured maximum-DLS assumption to judge whether a
            smooth recovery is realistic. The point of no return estimates where available methods
            may no longer recover the hole.
          </p>
          <Values
            rows={[
              {
                label: "DLS required to target",
                value: r && Number.isFinite(r.dlsRequired)
                  ? `${round(r.dlsRequired, 2)}°/30 m`
                  : DASH,
              },
              { label: "Max DLS assumption", value: r ? `${round(r.maxDls, 2)}°/30 m` : DASH },
              {
                label: "Inside assumption?",
                value: r
                  ? r.dlsRequired <= r.maxDls
                    ? "Yes"
                    : "No — review"
                  : DASH,
              },
              {
                label: "Point of no return (est.)",
                value:
                  steering && steering.pointOfNoReturnMd
                    ? `${round(steering.pointOfNoReturnMd, 0)} m`
                    : "Not reached in remaining hole",
              },
            ]}
          />
        </Section>

        <Section
          index={7}
          title="Planned vs actual interval behaviour"
          formula={`lift/drop = change in dip across interval
swing     = change in azimuth across interval
Δ         = actual − planned`}
        >
          <p>
            For each interval the planned lift/drop and swing are compared with the actual lift/drop
            and swing. This reveals whether the hole is behaving as expected before it ever misses
            target. The latest interval is summarised below.
          </p>
          {interval ? (
            <Values
              rows={[
                { label: "Planned lift/drop", value: liftDropLabel(interval.plannedLiftDrop) },
                { label: "Actual lift/drop", value: liftDropLabel(interval.actualLiftDrop) },
                { label: "Lift/drop Δ", value: liftDropLabel(interval.liftDropDelta) },
                { label: "Planned swing", value: swingLabel(interval.plannedSwing) },
                { label: "Actual swing", value: swingLabel(interval.actualSwing) },
                { label: "Swing Δ", value: swingLabel(interval.swingDelta) },
              ]}
            />
          ) : (
            <p className="targetlock-math-note">Need at least two surveys for an interval comparison.</p>
          )}
        </Section>

        <Section
          index={8}
          title="Assumptions and limitations"
          formula={`feasibility = f(ground, rig, rods, hole size, tool,
              survey quality, contractor, approval)`}
        >
          <p>
            TargetLock IQ is decision support, not guaranteed steering control. It projects and
            compares geometry; it cannot promise that any tool will achieve a given dogleg in a
            given formation.
          </p>
          <p className="targetlock-math-note">
            Recovery feasibility depends on ground conditions, rig, rods, hole size, tool
            capability, survey quality, contractor, and geologist/supervisor approval. The
            capability profiles used here are configurable assumptions — set them in
            Setup&nbsp;/&nbsp;assumptions to match site reality.
          </p>
        </Section>
      </div>
    </article>
  );
}
