# TargetLock IQ — Validation checklist before field use

TargetLock IQ is **decision support**, not an operational steering authority. The biggest
risk is *false confidence* — a believable but wrong correction caused by a convention,
desurvey, or assumption mismatch. Work through this checklist with a geologist/supervisor and
a directional drilling contractor before the app influences a real steering decision.

Most of these checks have an in-app home in **Advanced mode → Validation** tab.

---

## 1. Coordinate & survey conventions (do this first)

Confirm the client/site data matches what the app assumes (shown in the Validation tab):

- [ ] **Dip sign** — negative downward (0° horizontal, −90° vertical down). Watch for files that use *inclination* instead.
- [ ] **Azimuth reference** — degrees clockwise from north, 0–360°, and the **same reference** (magnetic / true / grid) as the plan.
- [ ] **East / North axes** — East = +X, North = +Y.
- [ ] **Down / TVD** — positive with increasing depth below collar.
- [ ] **Coordinates** — collar-relative offsets (E/N/D from collar), not mine grid coordinates.
- [ ] **Units** — metres and degrees throughout.

> If any one of these is wrong, every correction the app gives can be wrong while still looking reasonable.

## 2. Plan import sanity check

Open **Validation → Plan import sanity check** and confirm:

- [ ] Station count and MD range match the plan you expect.
- [ ] Start and end dip/azimuth look correct.
- [ ] Station spacing is regular (no missing/duplicated stations).
- [ ] Target MD, offset (E/N/D), and tolerance match the approved target.
- [ ] No warnings shown (positive dips, azimuth out of range, non-monotonic MD).

## 3. Reference desurvey comparison

Validate the app's minimum-curvature desurvey against trusted software:

- [ ] Export station coordinates from **Seequent / Micromine / acQuire / IMDEX–HUB-IQ** or a client spreadsheet.
- [ ] Upload as `MD, East, North, Down` CSV in **Validation → Reference desurvey comparison**.
- [ ] Compare against the same surveys (Actual or Plan).
- [ ] Mean and max 3D difference are within acceptable tolerance (rounding only — typically < a few cm).
- [ ] Differences do **not** grow with depth (growth signals a method/convention mismatch).

## 4. Survey import & QA/QC

- [ ] Real survey CSVs import without errors and the survey count is correct.
- [ ] QA/QC flags (interval, dogleg, offset from plan, target risk) behave sensibly on a known hole.
- [ ] Understand that survey **uncertainty** is not yet modelled (see [ISCWSA error model](https://www.iscwsa.net/articles/definition-of-the-iscwsa-error-model-revision-43/)). Treat the path as a single best estimate.

## 5. Target tolerance logic

- [ ] Tolerance is interpreted as a 3D envelope around the target — confirm this matches the client's intercept criteria.
- [ ] On-track / watch / risk thresholds match site expectations on a known hole.

## 6. DLS & recovery assumptions (with a directional contractor)

- [ ] Review per-method DLS ranges in **Setup / assumptions** with a directional drilling contractor.
- [ ] Agree the wedge/branch review threshold.
- [ ] Understand DLS alone is not a universal safe/unsafe limit — doglegs also drive tool running, torque, drag, wear, fatigue, and casing/core-barrel issues ([SLB](https://glossary.slb.com/terms/d/dogleg), [Coring Magazine](https://coringmagazine.com/article/technical-note-dogleg-severity/)).
- [ ] Treat all steering feasibility as **"review" / "may recover"**, never **"will recover"**.

## 7. Sign-off

- [ ] A named reviewer signs off the assumptions in **Validation → Assumption sign-off**.
- [ ] Confirm the exported report shows the **Validation status** section (status, reviewer, conventions).
- [ ] Re-validate whenever assumptions are edited — the app marks a changed sign-off as **stale**.

## 8. Historical replay (recommended)

- [ ] Replay one or more completed holes where the outcome is known.
- [ ] Confirm the app would have flagged drift early enough to act.

---

## Trust gate

Treat TargetLock IQ as an **operational steering authority only after**:

- desurvey output validated against trusted software,
- real survey imports validated,
- coordinate conventions confirmed,
- target tolerance logic confirmed,
- DLS / recovery assumptions reviewed with a directional drilling contractor and signed off,
- at least one historical hole replayed successfully.

Until then, it is a **decision-support prototype and pilot discussion tool**.
