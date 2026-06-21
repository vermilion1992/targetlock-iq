# Adversarial & property-based test suite

**Purpose:** Document the "try to break it" test layer added for institutional
field readiness. These tests fuzz the drilling math and steering-rule engine
with thousands of randomized inputs (via [`fast-check`](https://github.com/dubzzz/fast-check))
and pin every edge-case behaviour with an explicit assertion.

Run with the rest of the suite: `npm run test` (package `starterkit`).

## Test files

| Area | File | What it stresses |
| --- | --- | --- |
| Geometry kernel | `geometry-properties.test.ts` | dip/azimuth ↔ vector round-trips, `normalizeAngle`/`shortestAngle` invariants, dogleg symmetry/bounds, closed-form minimum-curvature chord, slerp endpoints and near-180° stability |
| Desurvey | `desurvey-adversarial.test.ts` | duplicate / non-monotonic / zero MD, single-record holes, 10 km deep hole, `interpolateAtMd` / `positionOnPlanAtMd` branch coverage |
| Recommendation | `recommendation-classification.test.ts` | full `classify` decision-tree boundary table, `dlsRequired` closed form, aim clamping, non-finite instruction handling |
| North reference | `reference-system-adversarial.test.ts` | azimuth round-trips + 0/360 wrap, magnetic pipeline, `outputReference` display conversion, invalid-input hardening |
| Coordinate system | `coordinate-system-adversarial.test.ts` | grid ↔ collar-relative round-trips, RL/depth sign, collar/kickoff frame offsets, MD-offset closed form |
| Grid / CRS | `grid-crs-adversarial.test.ts` | global lat/lon round-trips, UTM/MGA zone boundaries, off-zone projection, polar convergence |
| Uncertainty | `uncertainty-adversarial.test.ts` | closed-form variance, sigma scaling, random-vs-systematic accumulation, target/separation boundaries |
| Plan corridor | `plan-corridor-adversarial.test.ts` | widening-offset formula, median derivation, interval/position tolerance boundaries |
| End-to-end | `compute-integration.test.ts` | `computeHole` fuzz: never throws, finite outputs, **safety invariants** below, determinism |
| Well-path design | `well-path-design-properties.test.ts` | `designWellPath` closure on target, optimal/within-budget DLS, planar trajectory, monotonic MD, feasibility monotonic in max DLS, near-collinear / near-vertical / target-behind degeneracies, `requiredDoglegRate` closed form |
| Branch program | `branch-program-properties.test.ts` | kickoff continuity with the actual mother path, heading aims straight at the branch target, `doglegMotherToDaughter` closed form, method-suitability / feasibility boundaries, daughter heading blend, separation closest-approach |
| Straight plan | `planner-straight-properties.test.ts` | `buildStraightPlan` exact closure & explicit-MD honouring, collinearity, `checkPlanDlsWarnings` boundaries |
| Planner integration | `planner-generation-integration.test.ts` | `generatePlannerPlan` over all path designs: never throws, finite + monotonic MD, deterministic, solved designs close on target, infeasible designs reported not emitted |

## Defects found and fixed

1. **Reversed trajectory on malformed MD (`desurvey.ts`).**
   `buildStations` / `buildStationsWithMethod` computed each leg length as
   `record.md − previous.md`. A decreasing or duplicate MD therefore produced a
   negative leg and integrated the path *backwards*. Fixed by clamping the leg
   length to zero (`Math.max(0, …)`): a non-advancing survey now contributes no
   displacement instead of corrupting the position. Upstream CSV import still
   surfaces the underlying data problem to the user.

2. **Wrong interpolation factor at duplicate stations (`interpolateAtMd`).**
   The span guard `b.md − a.md || 1` substituted `1` for a zero span, yielding a
   meaningless interpolation parameter `t`. Fixed to snap to the lower station
   (`span > EPS ? clamp(...) : 0`), which is finite and deterministic for
   duplicate/zero-span survey stations.

3. **Catastrophic cancellation in the curve solver (`well-path-design.ts`).**
   `solveArcTangent` computed the tangent length as `√(dist² − radius²)`. For a
   target almost on the start axis the required turn radius is enormous, so this
   subtracted two huge near-equal numbers and lost all precision — the planner
   could emit a path that missed the target by **tens of metres**. Rewritten to
   the algebraically-equivalent `x² + y² − 2·y·radius`, which never forms
   `radius²`.

4. **Ill-conditioned near-collinear arc.** Even without cancellation, the
   arc-angle solve degenerates when the required bend is a tiny fraction of a
   degree (target a hair off the start axis): the curve collapses toward straight
   and misses by the full lateral offset (~0.5 m). Near-axis targets are now
   routed to a straight leg **aimed directly at the target** (exact closure),
   using a relative cutoff (`y < 5e-3·|x|`).

5. **Plan ended short of the target (`emitRecords`, `emitStraightToTarget`,
   `buildStraightPlan`).** A coarse 0.5 m guard dropped the terminal station when
   the last regular survey landed within 0.5 m of it, leaving the generated plan
   up to 0.5 m short of the target (and ignoring an explicit target MD). Now the
   exact terminal station is always landed (snap-or-insert), so plans close to
   the centimetre.

6. **Smeared kickoff→build transition (build-and-hold).** `emitRecords` pinned
   the arc end and target but not the kickoff boundary, so minimum-curvature
   smeared the straight→arc corner and build-and-hold closure drifted to ~0.2 m.
   All direction discontinuities (kickoff, arc end, target) are now pinned;
   closure dropped to a few centimetres.

7. **DLS spike from a micron-spaced pin.** Guarding the start station against
   being snapped away (a tiny-kickoff hazard) could insert a survey station
   microns from the origin; the desurveyed dogleg-severity over that near-zero
   interval exploded (~19°/30 m). `ensureStation` now skips when a coincident
   station already exists (`< 1e-3 m`), eliminating the spurious spike.

After these fixes the planner closes on its target within **~7 cm across 30k
fuzzed geometries** (worst case; typically sub-centimetre), with the trajectory
provably planar to floating-point precision.

All fixes are covered by dedicated `FIX:` test cases and the full drilling suite
(720+ tests) remains green.

## Test-only exports

To assert internal decision logic directly (rather than only through wide
integration paths), the following were exported:

- `classify` in `recommendation.ts` — enables the exact boundary truth table.
- `gateMatches`, `conditionMatches`, `actionFromRule`, `actionRank` in
  `steering-settings.ts` (added in the earlier steering-rules work).

These are pure functions with no side effects; exporting them does not change
runtime behaviour.

## Safety invariants pinned end-to-end

Verified over 1,500+ randomized `computeHole` runs each:

- **Never-soften:** the steering `currentAction` rank is always ≥ the geometric
  classification's action rank. A rule can escalate, never downgrade, the
  severity implied by the geometry.
- **Gear honouring:** any steering method flagged `feasible` is always available
  in the configured gear set (`isGearMethodAvailable`).
- **Determinism:** identical inputs always yield identical action, class, and
  matched rule id.
- **Finiteness / range:** `aimAzimuth ∈ [0, 360)`; miss, plan offset and aim
  angles are finite for every generated hole.

## Approximations and known limits (intentionally pinned)

These are accepted behaviours, asserted so they cannot regress silently:

- **Minimum-curvature chord near a 180° dogleg.** The chord magnitude matches
  the closed form `L·sinc(θ/2)` to 1e-6 relative for realistic doglegs
  (θ < ~160°). The `(2/θ)·tan(θ/2)` factor loses precision as `cos(θ/2) → 0`;
  adjacent real survey stations never reverse by ~180°, so this tail is excluded.
- **`shortestAngle(0, 180) = −180`.** A half-turn is reported with a negative
  sign (boundary convention), not `+180`.
- **`slerpDirection` of exactly opposite vectors** returns a finite unit vector
  (a stable but geometrically arbitrary perpendicular), rather than throwing or
  returning NaN.
- **`bestMethodId` for an On-track hole** can remain `"natural"` even when
  natural gear is disabled. This is a display default; the per-method
  `feasible` flags remain the safety-critical, gear-honouring output.
- **Off-zone grid projections are accepted, not rejected.** Projecting a point
  far from a grid's central meridian returns a finite (out-of-band) easting.
  The API does not guard against a wrong-zone EPSG. **No point scale factor is
  applied** — returned distances are planar grid distances, not ellipsoidal
  ground distances.
- **Uncertainty model is ISCWSA-*inspired*, not certified.** Random sensor terms
  accumulate in quadrature; the declination/north-reference term accumulates
  linearly (systematic). Finer survey spacing reduces the random lateral term
  but not the systematic one — a deliberate, pinned property.
- **Near-vertical (dip → ±90°) survey representation.** Trajectories are emitted
  as dip/azimuth stations, where azimuth is undefined at vertical. Within ~2° of
  vertical, planner closure and in-plane properties degrade; this is an inherent
  limit of the survey representation, so those property assertions are taken
  clear of the singularity (the planner still returns finite, non-NaN stations).
- **Near-collinear targets are planned straight.** A target within `5e-3·|x|` of
  the start axis is routed to an exact straight leg rather than a near-infinite
  radius arc. The reported design DLS is `0`, while the small aim-bend desurveys
  to ≤ ~0.86°/30 m at 10 m sampling — a benign reporting gap, not a path error.
- **Planner closure is centimetre-level, not exact.** Minimum-curvature
  reconstruction of the emitted stations, plus the ≤0.5 m transition-snap,
  leaves a residual target miss of a few cm (≤ ~7 cm worst case observed). This
  is far inside any field target tolerance and is asserted with margin.
