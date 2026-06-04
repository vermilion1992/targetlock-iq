# Desurvey validation vectors

**Method:** Minimum curvature (`buildStations` in `packages/starterkit/src/lib/drilling/desurvey.ts`)

**Tolerance vs reference tool:** E/N/D within **0.1 m** per station for straight and single-dogleg cases unless site convention differs.

## Vector 1 — Straight hole

| MD (m) | Dip (°) | Azimuth (°) |
|--------|---------|-------------|
| 0 | -60 | 90 |
| 30 | -60 | 90 |
| 60 | -60 | 90 |

**Expected (automated):**

- Interior DLS ≈ 0°/30 m
- Down (D) increases monotonically with MD

**Vitest:** `math-validation.test.ts` → `straight hole`

## Vector 2 — Reference comparison (manual)

Export the same surveys from TargetLock and from site-standard software (Compass, Deswik, or controlled spreadsheet). Record collar origin and dip/azimuth sign convention in the session notes.

**Pass:** Station E/N/D match within agreed tolerance for at least one anonymized production hole.
