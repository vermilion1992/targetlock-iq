"use client";

import { useMemo, type ReactNode } from "react";
import type { HoleLibrary } from "@/lib/drilling/hole-library";
import { derivePlannerPrograms } from "@/lib/drilling/planner-program";
import { ReferenceDocSection } from "@/components/dashboard/ReferenceDocSection";
import { AdvancedTabHero } from "@/components/dashboard/AdvancedTabHero";
import { PlannerSubPanel } from "./ui/PlannerSubPanel";

type Props = {
  library?: HoleLibrary | null;
};

function MathSection({
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

const CONVENTIONS: { term: string; definition: string }[] = [
  {
    term: "Dip",
    definition:
      "Inclination of the hole, negative pointing down: −90° is vertical, 0° is horizontal. Inclination from vertical is 90° + dip.",
  },
  {
    term: "Azimuth",
    definition:
      "Direction in degrees clockwise from north (0–360°). Every azimuth is tagged with its north reference: grid, true, or magnetic.",
  },
  {
    term: "MD (measured depth)",
    definition:
      "Distance along the hole from the collar, in metres — not vertical depth. Survey stations are indexed by MD.",
  },
  {
    term: "E / N / D frame",
    definition:
      "Positions are east, north, down in metres, relative to the collar (or the project origin for grid output). Down is positive.",
  },
  {
    term: "DLS (dogleg severity)",
    definition:
      "Rate of change of hole direction, normalised to degrees per 30 m. The planner checks every planned interval against the program limit.",
  },
  {
    term: "Separation factor (SF)",
    definition:
      "Closest distance between two holes divided by the sum of their positional uncertainty radii. SF below 1 means the envelopes may overlap.",
  },
];

export function PlannerMethodologyView({ library }: Props) {
  const stats = useMemo(() => {
    if (!library) return null;
    const programs = derivePlannerPrograms(library);
    const plannedHoles = library.holes.filter((h) => h.plannerMeta).length;
    const approvedHoles = library.holes.filter(
      (h) => h.plannerMeta?.approvalSnapshot
    ).length;
    return { programs: programs.length, plannedHoles, approvedHoles };
  }, [library]);

  return (
    <div className="planner-methodology-view">
      <AdvancedTabHero
        eyebrow="Reference"
        title="How the hole planner works"
        copy="What this tool computes from your collars and targets, the math behind every number, and why the output can be trusted. Reference only — opening this page never changes a calculation."
      />

      <PlannerSubPanel
        className="targetlock-ref-panel"
        kicker="Reference"
        title="Purpose & workflow"
        meta={<span className="targetlock-mini-tag targetlock-ref-tag">Reference</span>}
      >
        <div className="targetlock-ref-lead">
          <span className="targetlock-ref-lead-kicker">What this is</span>
          <p>
            The hole planner is the planning-office companion to the TargetLock execution
            dashboard. It turns a collar, a target, and drilling constraints into a planned
            survey path — station by station — then checks the whole program for coordinate
            completeness, hole-to-hole clearance, and drillability before anything reaches a
            rig. Every number on screen is produced by the formulas documented below; nothing
            is estimated, fitted, or hidden. Plans only leave the planner once they pass
            review and carry a named approval.
          </p>
        </div>

        <div className="targetlock-ref-role-grid">
          <div className="targetlock-ref-role-card">
            <span className="targetlock-ref-role-label">Planning geologist</span>
            Designs holes against targets, manages the coordinate register, and owns the
            program until approval.
          </div>
          <div className="targetlock-ref-role-card">
            <span className="targetlock-ref-role-label">Drilling supervisor / engineer</span>
            Reviews QA results, approves plans, and receives the exported package and
            execution lock at the rig.
          </div>
        </div>

        <div className="targetlock-ref-sections">
          <ReferenceDocSection badge="01" title="Design" variant="highlight">
            <p>
              Create captures the program and hole identity, the project coordinate system,
              collar, target, and path constraints. From these the planner generates a
              straight leg aimed at the target, or a curved path built at a constant dogleg
              rate when the start heading cannot point straight at it. Survey stations are
              written every 30 m so the plan reads like a survey sheet.
            </p>
            <p>
              Daughter holes branch from a surveyed mother hole: the planner desurveys the
              mother&apos;s actual path, interpolates position and attitude at the chosen
              kickoff depth, and starts the daughter design from there — so the branch point
              is physically consistent with what was actually drilled.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="02" title="Coordinates and north references">
            <p>
              Coordinates are entered once, in Create, and reviewed program-wide in the
              Coordinates register: collars, targets, and daughter kickoffs with a
              completeness status per hole. The project coordinate system records the grid
              (EPSG code), origin, magnetic declination, and grid convergence, so every
              azimuth can be expressed against grid, true, or magnetic north without
              ambiguity. GPS-only collars are flagged honestly — planning on uncorrected GPS
              positions is allowed but always labelled.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="03" title="Visualise">
            <p>
              The Map shows the program in plan view (local grid or satellite imagery) with
              traces, targets, kickoff markers, and clearance-risk highlights. The 3D scene
              orbits the same data with uncertainty envelopes and an optional section plane,
              and accepts display-only geology wireframes (OBJ/DXF). Both views read the same
              model as QA — what you see highlighted on the map is exactly what the clearance
              check flagged.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="04" title="The QA gate">
            <p>
              QA runs the same checks for every plan in the program: minimum 3D clearance
              between every pair of planned paths, separation factor against positional
              uncertainty, dogleg severity against the configured limit, target miss distance
              against tolerance, and structural drillability checks (monotonic MDs, valid
              dips, resolved kickoffs, defined targets). Thresholds are editable per program
              and saved with it. Anything below threshold is a blocker, not a suggestion —
              approval is refused while hard errors exist.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="05" title="Review, approval, and revisions" variant="field">
            <p>
              Review is the decision page: readiness score, QA badge, approval state, and
              execution lock in one place, answering one question — can this plan be used?
              Approval is a named, dated sign-off that snapshots the plan: the planner hashes
              the station list and target, the QA thresholds, and the coordinate system at
              the moment of approval. If any of the three changes afterwards, the approval is
              automatically marked stale and the change is listed. Approved plans cannot be
              edited in place — changes require a tracked revision (R2, R3…) that keeps the
              full lineage.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="06" title="Package and execution handoff" variant="integration">
            <p>
              Package exports the signed-off program: contractor CSVs (collars, targets,
              planned surveys, daughters, coordinate system), planning PDFs and TXT reports,
              trajectory DXF, and a manifest. Marking an approved plan active locks it and
              opens it in the TargetLock execution dashboard, where actual surveys are
              compared back against this exact plan — closing the loop from design to
              drilled hole.
            </p>
          </ReferenceDocSection>
        </div>
      </PlannerSubPanel>

      <PlannerSubPanel
        className="targetlock-ref-panel"
        kicker="Glossary"
        title="Conventions & definitions"
        meta={<span className="targetlock-mini-tag">Glossary</span>}
      >
        <p className="targetlock-panel-copy">
          Every formula below uses these conventions. They match the TargetLock execution
          dashboard exactly, so a plan and its drilled hole are always in the same frame.
        </p>
        <div className="targetlock-ref-role-grid">
          {CONVENTIONS.map((c) => (
            <div key={c.term} className="targetlock-ref-role-card">
              <span className="targetlock-ref-role-label">{c.term}</span>
              {c.definition}
            </div>
          ))}
        </div>
      </PlannerSubPanel>

      <PlannerSubPanel
        className="targetlock-math-panel"
        kicker="Reference"
        title="The math"
        meta={<span className="targetlock-mini-tag">Reference</span>}
      >
        <p className="targetlock-panel-copy">
          Plain-English explanation of each computation, with the exact formula the code
          runs. Sections 1–4 cover how a plan is generated, 5–7 how its geometry is measured,
          and 8–10 how risk and references are handled.
        </p>

        <div className="targetlock-math-sections">
          <MathSection
            index={1}
            title="Direction vector from dip and azimuth"
            defaultOpen
            formula={`East  = cos(dip) × sin(azimuth)
North = cos(dip) × cos(azimuth)
Down  = −sin(dip)`}
          >
            <p>
              Every station&apos;s dip and azimuth become a 3D unit vector. All trajectory,
              intercept, and clearance math runs on these vectors, so the planner and the
              TargetLock execution dashboard share one geometric convention. The reverse
              conversion (vector back to dip and azimuth) is used whenever the planner
              derives a heading, such as aiming at a target.
            </p>
          </MathSection>

          <MathSection
            index={2}
            title="Straight plan generation"
            formula={`heading = unit vector from start position to target (E, N, D)
leg length = |target − start|        (or explicit target MD)
stations every 30 m at constant dip/azimuth from heading`}
          >
            <p>
              For a straight design, the planner computes the one heading that points from
              the start position at the target, converts it back to dip and azimuth, and
              writes a survey station every 30 m until the target depth. A straight line
              needs no approximation — any desurvey method reproduces it exactly, which also
              makes it the cheapest design to verify by hand.
            </p>
          </MathSection>

          <MathSection
            index={3}
            title="Curved path design (constant build rate)"
            formula={`R = (180/π) × 30 / DLS          circular-arc radius, m
path = arc at constant DLS °/30 m from start heading
       until the heading points at the target, then straight`}
          >
            <p>
              When the start heading cannot aim straight at the target, the planner builds a
              circular arc at a constant dogleg rate — the lowest rate that still reaches the
              target, never above the configured maximum DLS — then holds the final heading
              to the target. The plan notes record the build rate used and the resulting
              total depth, and the generated stations are re-checked afterwards: any interval
              above the DLS limit becomes a warning on the plan.
            </p>
          </MathSection>

          <MathSection
            index={4}
            title="Daughter kickoff from the mother path"
            formula={`mother stations = minimum-curvature desurvey of mother actuals
kickoff = interpolate(mother stations, kickoff MD)
          → position (E, N, D) + attitude (dip, azimuth)
kickoff dogleg = angle(mother direction, daughter direction)
                 normalised to °/30 m`}
          >
            <p>
              A daughter plan never invents its branch point. The mother hole&apos;s actual
              surveys are desurveyed, the station at the chosen kickoff MD is interpolated,
              and the daughter inherits that exact position and attitude. The angle between
              the mother&apos;s direction and the daughter&apos;s first heading is reported as a
              kickoff dogleg so an impossible wedge angle is visible immediately. If the
              mother has no actual surveys, the kickoff is a hard blocker.
            </p>
          </MathSection>

          <MathSection
            index={5}
            title="Minimum curvature between stations"
            formula={`Δθ = angle between station tangents t₁, t₂
RF = (2/Δθ) × tan(Δθ/2)              ratio factor (→1 as Δθ→0)
Δposition = (MD₂ − MD₁)/2 × RF × (t₁ + t₂)`}
          >
            <p>
              Positions along planned and actual paths come from the industry-standard
              minimum curvature method: each interval is treated as a circular arc fitted to
              the two station directions. On a true circular arc this is mathematically exact
              at any station spacing — the displacement reduces to the exact chord — which is
              what the benchmark tests assert. This is the same desurvey engine TargetLock
              uses during execution.
            </p>
          </MathSection>

          <MathSection
            index={6}
            title="Dogleg severity per interval"
            formula={`cos(Δθ) = t₁ · t₂                 dot product of tangents
DLS = Δθ × 30 / (MD₂ − MD₁)          °/30 m
warn if DLS > program max DLS`}
          >
            <p>
              The angle between consecutive station directions, normalised to a 30 m
              interval, is the dogleg severity. Every planned interval is checked against the
              program&apos;s maximum; the peak DLS and any offending intervals are listed on
              the plan. This is what keeps a generated path within what the chosen drilling
              method can physically steer.
            </p>
          </MathSection>

          <MathSection
            index={7}
            title="Target intercept and miss distance"
            formula={`end = position of final planned station (E, N, D)
miss = |end − target|                 3D distance, m
warn if miss > target tolerance      (default 6 m)`}
          >
            <p>
              After generation, the planner desurveys its own plan and measures the straight
              3D distance from the final station to the target. If that miss distance exceeds
              the target&apos;s tolerance radius, the plan carries a warning — for example
              when a DLS cap or an explicit target MD prevents the path from reaching the
              target exactly. The same check runs again at review time so a stale plan
              cannot hide a miss.
            </p>
          </MathSection>

          <MathSection
            index={8}
            title="Positional uncertainty envelope"
            formula={`per interval, accumulate variance from the tool error model:
  along-hole:  depth error  (proportional + constant)
  highside:    inclination sensor error × interval
  lateral:     (azimuth sensor + declination error) × sin(I) × interval
radius = sigma factor × √variance     (2σ ≈ 95% confidence)`}
          >
            <p>
              Survey instruments are not perfect, so every desurveyed position carries a
              growing uncertainty. The planner propagates variance station by station from a
              survey-tool error model (magnetic multishot by default; gyro and camera/single-
              shot classes are available) split into along-hole, highside, and lateral
              components, then reports a conservative radius at 2-sigma. These are the
              envelopes drawn in the 3D scene and used by the separation factor.
            </p>
          </MathSection>

          <MathSection
            index={9}
            title="Clearance and separation factor"
            formula={`distance = min 3D distance between the two planned paths
SF = distance / (radiusA + radiusB)   at the closest-approach MDs
SF < 2 → risk    SF < 5 → watch       (defaults, editable per program)
absolute thresholds also apply per relationship type`}
          >
            <p>
              Every pair of planned holes in the program is compared station-by-station for
              closest approach, including mother–daughter and planned-versus-actual pairs.
              The separation factor divides the centre-to-centre distance at that point by
              the combined uncertainty radii from section 8 — below 1, the envelopes may
              overlap. Severity uses both the separation factor and absolute distance
              thresholds, which differ by relationship: a daughter is expected to hug its
              mother near the kickoff, so those pairs are judged by different limits than two
              independent holes.
            </p>
          </MathSection>

          <MathSection
            index={10}
            title="Declination and grid convergence"
            formula={`azimuth_true     = azimuth_grid + grid convergence
azimuth_magnetic = azimuth_true − magnetic declination
declination from World Magnetic Model (WMM2025) at site lat/lon/date`}
          >
            <p>
              Collars and targets are entered in the project grid, but compasses read
              magnetic north. On publish, the planner bridges grid, true, and magnetic
              azimuths using the program&apos;s grid convergence and a World Magnetic Model
              declination computed for the site coordinates and date — both can also be
              entered manually and are stored with the program. Every exported azimuth is
              tagged with its north reference so the rig sheet is unambiguous.
            </p>
          </MathSection>
        </div>
      </PlannerSubPanel>

      <PlannerSubPanel
        className="targetlock-validation-panel"
        kicker="Evidence"
        title="Why the numbers can be trusted"
        meta={<span className="targetlock-mini-tag">Evidence</span>}
      >
        <p className="targetlock-panel-copy">
          Trust here is not a claim — it is a property of how the planner is built: exact
          geometry where exactness is possible, published methods where it is not, and
          tamper-evident sign-off around the result.
        </p>
        <div className="targetlock-ref-sections">
          <ReferenceDocSection badge="A" title="Benchmarked against exact geometry" variant="highlight">
            <p>
              The desurvey engine is tested against analytically exact golden cases where the
              true answer is derived in closed form, not quoted from a table: a straight
              inclined hole (dip −60°, azimuth 30°, 600 m), a constant-build circular arc
              (vertical to 60° inclination at 3°/30 m), and a horizontal constant-rate turn
              (azimuth 0° to 90° over 300 m). Minimum curvature matches the exact circle to
              10⁻⁷ m at both 50 m and 100 m station spacing — on circular arcs it is not an
              approximation at all.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="B" title="Cross-checked desurvey methods">
            <p>
              Three independent desurvey methods — minimum curvature, balanced tangential,
              and radius of curvature — are run against the same smooth build-and-turn path
              in the test suite. At 5 m stations their bottom-hole positions agree within
              0.05 m, and disagreement shrinks with station spacing exactly as theory
              predicts. A systematic error in any one method would break this agreement
              immediately.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="C" title="Deterministic and inspectable">
            <p>
              Every output is a pure function of the inputs on screen — no fitting, no hidden
              state, no model drift. The same collar, target, and constraints always produce
              the same plan, and every formula above is the one the code runs. If a number
              looks wrong, it can be recomputed by hand from this page.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="D" title="Tamper-evident approval" variant="field">
            <p>
              Approval is not a checkbox. When a plan is approved, the planner stores hashes
              of the station list and target, the QA thresholds, and the coordinate system,
              along with who approved it, their role, the date, and any warnings
              acknowledged at that moment. Any later change to plan, thresholds, or
              coordinates flips the approval to stale and names what changed — a quietly
              edited plan cannot keep its sign-off.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="E" title="Automated test coverage">
            <p>
              The drilling library ships with unit tests covering desurvey benchmarks,
              desurvey method agreement, coordinate-system and grid/CRS handling, geomagnetic
              declination, planner clearance, approval and revision flows, plan locking,
              execution audit, and import/export round-trips. The QA gates exercised in this
              UI are the same functions exercised by those tests.
            </p>
          </ReferenceDocSection>

          <ReferenceDocSection badge="F" title="Known limitations" variant="caution">
            <p>
              Clearance checking is approximate planning QA, not a certified anti-collision
              service: it uses a simplified tool-error model rather than a full ISCWSA error
              chain. Geology overlays are display-only. Plans live in browser local storage
              until exported — the official survey database remains the source of truth.
              Always verify coordinates, declination, and clearance independently before
              drilling.
            </p>
          </ReferenceDocSection>
        </div>
        {stats ? (
          <dl className="targetlock-validation-values planner-methodology-stats">
            <div>
              <dt>Programs in library</dt>
              <dd>{stats.programs}</dd>
            </div>
            <div>
              <dt>Planned holes</dt>
              <dd>{stats.plannedHoles}</dd>
            </div>
            <div>
              <dt>Approved plans</dt>
              <dd>{stats.approvedHoles}</dd>
            </div>
          </dl>
        ) : null}
        <p className="targetlock-panel-footnote">
          Planning support only. The planner informs the decision — it does not replace
          survey contractors, geology sign-off, or site procedures.
        </p>
      </PlannerSubPanel>
    </div>
  );
}
