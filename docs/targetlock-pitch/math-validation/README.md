# TargetLock IQ — Math validation pack

**Purpose:** Document exact checks and acceptable tolerances so pilot stakeholders can trust outputs are tested — not assumed.

**Contents:**

- [desurvey-vectors.md](./desurvey-vectors.md) — hand-checkable desurvey vectors.
- [desurvey-benchmarks.md](./desurvey-benchmarks.md) — analytically exact golden cases: straight hole, circular build arc, horizontal turn, radius-of-curvature exact cases, and method-convergence tolerance scaling.
- [dls-kickoff-branch.md](./dls-kickoff-branch.md) — DLS, kickoff interpolation, and branch geometry checks.
- [survey-uncertainty.md](./survey-uncertainty.md) — simplified positional-uncertainty model and its limits.
- [frame-and-rl-convention.md](./frame-and-rl-convention.md) — hole-local vs program map frame, the RL-0 datum, true-RL grid displays, and north-reference handling.
- [geomag-and-grids.md](./geomag-and-grids.md) — WMM2025 declination (validated against all 100 official NOAA test values) and MGA/UTM grid conversions + convergence (validated against published Geoscience Australia / Landgate control values).

**Automated regression:** `npm run test` includes `math-validation.test.ts`, `desurvey-benchmark.test.ts`, `geomag.test.ts`, and `grid-crs.test.ts` golden cases aligned with this folder.

**Sign-off:** Engineering runs automated tests; geology/directional reviewer spot-checks vectors in [desurvey-vectors.md](./desurvey-vectors.md) and [dls-kickoff-branch.md](./dls-kickoff-branch.md) before field reliance.

**Passing validation does not remove** supervisor approval or contractor sign-off for operational decisions.
