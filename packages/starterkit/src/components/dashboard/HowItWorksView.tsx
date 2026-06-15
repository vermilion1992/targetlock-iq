"use client";

import { ReferenceDocSection } from "@/components/dashboard/ReferenceDocSection";
import { MathReferencePanel } from "@/components/dashboard/MathReferencePanel";
import type { Recommendation } from "@/lib/drilling/types";
import type { SteeringFeasibility } from "@/lib/drilling/steering-types";

type Props = {
  recommendation: Recommendation | null;
  steering: SteeringFeasibility | null;
  onClose: () => void;
};

const ROLES: { label: string; detail: string }[] = [
  {
    label: "Drillers",
    detail:
      "A plain next-survey aim (lift/drop and swing) without reading raw survey files or doing trig at the rig.",
  },
  {
    label: "Geologists",
    detail:
      "Target risk, projected miss, and trajectory context to judge whether the hole still hits the orebody.",
  },
  {
    label: "Supervisors",
    detail:
      "Decision history, sign-off, and handover reports — a defensible record of what was decided and when.",
  },
  {
    label: "Directional contractors",
    detail:
      "Structured plan-vs-actual context for feasibility and correction review before committing a tool.",
  },
];

const CONVENTIONS: { term: string; definition: string }[] = [
  {
    term: "Dip",
    definition:
      "Inclination of the hole, negative pointing down: −90° is vertical, 0° is horizontal. Inclination from vertical is 90° + dip.",
  },
  {
    term: "Azimuth",
    definition:
      "Direction in degrees clockwise from north (0–360°). Every azimuth carries its north reference — grid, true, or magnetic — and is converted through true north before any trajectory math.",
  },
  {
    term: "MD (measured depth)",
    definition:
      "Distance along the hole from the collar, in metres — not vertical depth. Every survey station is indexed by MD.",
  },
  {
    term: "E / N / D frame",
    definition:
      "Positions are east, north, down in metres relative to the collar. Down is positive with increasing depth. All geometry runs in this frame.",
  },
  {
    term: "Offset from plan",
    definition:
      "Straight-line 3D distance between the actual hole and the planned trajectory at the latest survey depth.",
  },
  {
    term: "Projected miss",
    definition:
      "Estimated 3D distance from target if the hole keeps its current direction, with no correction, to target depth.",
  },
  {
    term: "DLS (dogleg severity)",
    definition:
      "Rate of change of hole direction, normalised to degrees per 30 m. Required DLS to target is compared against the configured method limit.",
  },
  {
    term: "Recovery / point of no return",
    definition:
      "Whether a smooth correction to target is still realistic under the capability assumptions, and the depth past which it likely is not.",
  },
];

export function HowItWorksView({ recommendation, steering, onClose }: Props) {
  return (
    <div className="targetlock-howitworks-view">
      <div className="targetlock-howitworks-head">
        <div>
          <p className="targetlock-topbar-eyebrow">Reference</p>
          <h2>How TargetLock IQ works</h2>
          <p className="targetlock-howitworks-sub">
            What the dashboard computes from your surveys, the math behind every number, and why
            the output can be trusted. Reference only — opening this page never changes a
            calculation.
          </p>
        </div>
        <button type="button" className="targetlock-btn" onClick={onClose}>
          ← Back to dashboard
        </button>
      </div>

      <article className="targetlock-panel targetlock-ref-panel">
        <div className="targetlock-panel-title">
          <h2>Purpose &amp; workflow</h2>
          <span className="targetlock-mini-tag targetlock-ref-tag">Reference</span>
        </div>
        <div className="targetlock-ref-lead">
          <span className="targetlock-ref-lead-kicker">What this is</span>
          <p>
            TargetLock IQ is the rig-side execution dashboard. It takes a hole plan and the actual
            surveys drilled so far, rebuilds the real hole position, compares it against the plan,
            projects where the hole lands if nothing changes, and recommends the next-interval
            steering aim. It is decision support — it organises geometry, feasibility, and tolerance
            so people can decide faster and more defensibly. It does not steer the tool, certify a
            survey, or replace site sign-off.
          </p>
        </div>

        <div className="targetlock-ref-role-grid">
          {ROLES.map((role) => (
            <div key={role.label} className="targetlock-ref-role-card">
              <span className="targetlock-ref-role-label">{role.label}</span>
              {role.detail}
            </div>
          ))}
        </div>

        <div className="targetlock-ref-sections">
          <ReferenceDocSection badge="01" title="Load the plan and surveys" variant="highlight">
            <p>
              Work starts from two inputs: the planned trajectory and the actual surveys measured in
              the hole. Either can be typed in, imported from CSV, pulled from a planner package, or
              loaded as a demo scenario. Survey tool, plan corridor, and target tolerance are set in
              Setup so the rest of the dashboard reflects the tool actually running and the tolerance
              the geologist accepts.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="02" title="Rebuild the real hole position" variant="field">
            <p>
              Each survey&apos;s dip and azimuth become a 3D direction vector, and the
              minimum-curvature method joins consecutive stations into a smooth path to compute the
              current east/north/down position. This is the same desurvey engine the planner uses, so
              a plan and its drilled hole are always in one frame.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="03" title="Compare to plan and project the miss">
            <p>
              The actual position is compared to the planned position at the same depth to give the
              offset from plan. The current direction is then extended to target depth to project the
              miss — split into east/west, north/south, and high/low — so a developing drift is
              visible long before target depth.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="04" title="Steering feasibility and recovery">
            <p>
              From the current position the dashboard solves the required dip and azimuth to hit the
              target and the dogleg severity that implies, then checks it against the configured
              capability assumptions. It reports whether a smooth recovery is realistic and estimates
              the point of no return. Capability profiles are assumptions you set — not a universal
              bend rating.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="05" title="The QA / QC gate">
            <p>
              QA/QC flags interval gaps, excessive dogleg, plan offset, recovery risk, target risk,
              and reference-system mismatches. Near-vertical and high-angle geometry raises advisories
              because steering assumptions weaken there. Flags are surfaced so a survey is validated
              before anyone acts on the recommendation.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection
            badge="06"
            title="Decisions, sign-off, and handover"
            variant="integration"
          >
            <p>
              Decisions and supervisor approvals are recorded with their context, and handover PDFs
              and TXT reports capture plan-vs-actual, recommendation, and assumptions for the next
              shift. When the hole came from a locked planner plan, actuals are compared back against
              that exact approved geometry — closing the loop from design to drilled hole.
            </p>
          </ReferenceDocSection>
        </div>

        <div className="targetlock-ref-sections">
          <ReferenceDocSection badge="A" title="What TargetLock provides">
            <ul className="targetlock-ref-list">
              <li>Hole plan vs actual survey comparison and current position</li>
              <li>Projected target miss and offset from plan</li>
              <li>Simple action plan for the next survey interval</li>
              <li>Steering feasibility and recovery capability context</li>
              <li>QA/QC warnings on interval, reference, and target risk</li>
              <li>Plan corridor and target tolerance checks</li>
              <li>Survey-tool uncertainty context (assumption-based)</li>
              <li>Decision history, supervisor sign-off, and handover reports</li>
              <li>Branch / daughter hole planning support</li>
            </ul>
          </ReferenceDocSection>

          <ReferenceDocSection badge="B" title="What it does not replace" variant="caution">
            <ul className="targetlock-ref-list">
              <li>Certified survey deliverables and independent QC systems</li>
              <li>Site geological validation and orebody interpretation</li>
              <li>Geologist and supervisor judgement on target and risk acceptance</li>
              <li>Directional contractor design and tool-selection approval</li>
              <li>Formal company sign-off, procedures, and regulatory obligations</li>
            </ul>
          </ReferenceDocSection>

          <ReferenceDocSection badge="C" title="Operating principle" variant="highlight">
            <blockquote className="targetlock-ref-principle">
              Smart underneath, calm on top.
            </blockquote>
            <p className="targetlock-ref-muted">
              Rigorous geometry and feasibility sit behind the interface; the working view stays
              concise enough to use on a rig between surveys.
            </p>
          </ReferenceDocSection>
        </div>
      </article>

      <article className="targetlock-panel targetlock-ref-panel">
        <div className="targetlock-panel-title">
          <h2>Conventions &amp; definitions</h2>
          <span className="targetlock-mini-tag">Glossary</span>
        </div>
        <p className="targetlock-panel-copy">
          Every formula below uses these conventions. They match the hole planner exactly, so a plan
          and the hole drilled against it are always measured the same way.
        </p>
        <div className="targetlock-ref-role-grid">
          {CONVENTIONS.map((c) => (
            <div key={c.term} className="targetlock-ref-role-card">
              <span className="targetlock-ref-role-label">{c.term}</span>
              {c.definition}
            </div>
          ))}
        </div>
      </article>

      <MathReferencePanel recommendation={recommendation} steering={steering} />

      <article className="targetlock-panel targetlock-validation-panel">
        <div className="targetlock-panel-title">
          <h2>Why the numbers can be trusted</h2>
          <span className="targetlock-mini-tag">Evidence</span>
        </div>
        <p className="targetlock-panel-copy">
          Trust here is a property of how the dashboard is built: exact geometry where exactness is
          possible, published methods where it is not, transparent assumptions, and a traceable
          decision record around the result.
        </p>
        <div className="targetlock-ref-sections">
          <ReferenceDocSection
            badge="01"
            title="Benchmarked against exact geometry"
            variant="highlight"
          >
            <p>
              The desurvey engine is tested against analytically exact golden cases — a straight
              inclined hole, a constant-build circular arc, and a horizontal constant-rate turn —
              where the true answer is derived in closed form. Minimum curvature matches the exact
              circle to within 10⁻⁷ m at both 50 m and 100 m station spacing; on a circular arc it is
              not an approximation at all.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="02" title="Cross-checked desurvey methods">
            <p>
              Minimum curvature, balanced tangential, and radius of curvature are run against the
              same build-and-turn path in the test suite and agree within centimetres at tight
              station spacing, shrinking exactly as theory predicts. The Validation tab exposes the
              same cross-check so a bottom-hole position can be reconciled against a contractor or
              mine database that uses a different convention.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="03" title="Deterministic and inspectable">
            <p>
              Every output is a pure function of the inputs on screen — no fitting, no hidden state,
              no model drift. The same surveys, plan, and assumptions always produce the same result,
              and every formula in the math reference above is the one the code runs. If a number
              looks wrong, it can be recomputed by hand from this page.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="04" title="Reference-system rigor" variant="field">
            <p>
              Plan, survey, and display north can differ. Every azimuth is converted through true
              north using grid convergence and magnetic declination before any trajectory math, and
              mixed-reference or missing-parameter situations raise warnings in Setup and Validation
              rather than failing silently.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="05" title="Transparent assumptions">
            <p>
              Recovery feasibility and uncertainty depend on ground, rig, rods, hole size, tool
              capability, survey quality, and approval. Those capability and survey-tool profiles are
              editable in Setup, and the values that fed every number are shown live in the math
              reference — nothing is baked in behind the scenes.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="06" title="Known limitations" variant="caution">
            <p>
              TargetLock IQ is decision support, not guaranteed steering control. It does not compute
              gravity or magnetic toolface, motor yield, or directional-tool control settings. The
              uncertainty model is ISCWSA-inspired and simplified, not a certified ISCWSA/OWSG
              implementation. Near-vertical holes should be reviewed by the directional driller,
              supervisor, and site survey/geology team. Always verify coordinates, declination, and
              clearance independently before drilling.
            </p>
          </ReferenceDocSection>
        </div>
        <p className="targetlock-panel-footnote">
          Decision support only. TargetLock IQ informs the decision — it does not replace survey
          contractors, geology sign-off, or site procedures.
        </p>
      </article>

      <div className="targetlock-howitworks-foot">
        <button type="button" className="targetlock-btn" onClick={onClose}>
          ← Back to dashboard
        </button>
      </div>
    </div>
  );
}
