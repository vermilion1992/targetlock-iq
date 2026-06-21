# TargetLock IQ — Math validation pack

**Purpose:** Document exact checks and acceptable tolerances so pilot stakeholders can trust outputs are tested — not assumed.

**Contents:**

- [desurvey-vectors.md](./desurvey-vectors.md) — hand-checkable desurvey vectors.
- [desurvey-benchmarks.md](./desurvey-benchmarks.md) — analytically exact golden cases: straight hole, circular build arc, horizontal turn, radius-of-curvature exact cases, and method-convergence tolerance scaling.
- [dls-kickoff-branch.md](./dls-kickoff-branch.md) — DLS, kickoff interpolation, and branch geometry checks.
- [survey-uncertainty.md](./survey-uncertainty.md) — simplified positional-uncertainty model and its limits.
- [frame-and-rl-convention.md](./frame-and-rl-convention.md) — hole-local vs program map frame, the RL-0 datum, true-RL grid displays, and north-reference handling.
- [geomag-and-grids.md](./geomag-and-grids.md) — WMM2025 declination (validated against all 100 official NOAA test values) and MGA/UTM grid conversions + convergence (validated against published Geoscience Australia / Landgate control values).
- [adversarial-property-tests.md](./adversarial-property-tests.md) — "try to break it" fuzz/property-based suite, the defects it found and fixed, the end-to-end safety invariants, and the approximations pinned against regression.

**Automated regression:** `npm run test` includes `math-validation.test.ts`, `desurvey-benchmark.test.ts`, `geomag.test.ts`, and `grid-crs.test.ts` golden cases aligned with this folder, plus the property-based `*-adversarial.test.ts`, `geometry-properties.test.ts`, and `compute-integration.test.ts` suites (`fast-check`).

**Sign-off:** Engineering runs automated tests; geology/directional reviewer spot-checks vectors in [desurvey-vectors.md](./desurvey-vectors.md) and [dls-kickoff-branch.md](./dls-kickoff-branch.md) before field reliance.

**Passing validation does not remove** supervisor approval or contractor sign-off for operational decisions.
