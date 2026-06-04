# TargetLock IQ — Internal testing checklist (v1.3)

**For v2 RC1 pilot gate, use:** [release-candidate-checklist.md](./release-candidate-checklist.md) (branch workflow, JSON package, recovery UX).

**Purpose:** Structured internal testing before showing TargetLock IQ to a wider pilot audience.  
**App route:** http://localhost:3000/targetlock (`packages/starterkit`)  
**Version under test:** v1.3 — Scenario lab, plan corridor tolerance, survey tool profile, plus existing trajectory/recovery engine (classification math unchanged; corridor and survey layers are **advisory**).

**Related docs:**

| Doc | Use |
|-----|-----|
| [test-scenarios.md](./test-scenarios.md) | Built-in preset matrix and Scenario lab custom builder reference |
| [validation-plan.md](./validation-plan.md) | Math vs reference tools (post–internal UI pass) |
| [field-validation-checklist.md](./field-validation-checklist.md) | Pre-field conventions and desurvey (before real holes) |
| [steering-feasibility.md](./steering-feasibility.md) | Recovery assumptions and method feasibility |

**Automated gate (before manual pass):**

```bash
cd packages/starterkit
npm run test
npm run lint
npm run build
```

---

## Pre-test setup

| Step | Action | Done |
|------|--------|------|
| 1 | Run `npm run dev` and open `/targetlock` | ☐ |
| 2 | Use a **fresh browser profile** or clear site data once to test migration; then keep one profile for the rest of the run | ☐ |
| 3 | Switch to **Advanced** mode (URL `?mode=advanced` or mode toggle) — plan corridor editor and survey tool profile live here; **Scenario lab** is available in all modes | ☐ |
| 4 | Note browser + OS (e.g. Chrome / Edge, Windows) in session notes | ☐ |
| 5 | Confirm `npm run test` passes on your branch | ☐ |

**Session metadata**

| Field | Value |
|-------|--------|
| Tester name | |
| Date | |
| Branch / commit | |
| Browser | |

---

## 1. Built-in preset verification

**Path:** Top bar → **Scenario lab** → **Built-in scenarios** → **Load scenario** on each card.

Each load replaces the **active hole** (plan, actual, target, name, site). Scenario name appears on TXT/PDF exports when active.

| # | Preset | Expected status (KPI / Action plan) | Expected action / steering (summary) | Pass | Notes |
|---|--------|-------------------------------------|----------------------------------------|------|-------|
| 1 | TEST · On plan | **On track** | Continue drilling; resurvey at interval | ☐ | |
| 2 | TEST · Gradual drift | **Watch** | Monitor; shorten interval if drift continues | ☐ | |
| 3 | TEST · Recoverable correction | **Correction needed** | Correct now; DLS required ≤ max DLS (~3°/30 m) | ☐ | |
| 4 | TEST · Motor / Navi review | **Steering recommended** | Escalate for steering review | ☐ | |
| 5 | TEST · Wedge / branch review | **Target at risk** | Wedge or branch review (Steering tab) | ☐ | |
| 6 | TEST · QA survey jump | Status may vary | QA/QC: **DLS** and/or **Trend** not OK on latest interval | ☐ | |
| 7 | TEST · Invalid CSV import | **No hole loaded** | Status: *No valid surveys found…*; data unchanged | ☐ | |

**Spot-check panels (pick 2–3 presets):**

| Check | Pass | Notes |
|-------|------|-------|
| Advanced → **Steering feasibility** matches action plan recovery action | ☐ | |
| Advanced → **QA/QC** flags align with scenario (e.g. wedge = Recover/Target risk) | ☐ | |
| **Math reference** values match KPI strip (miss, offset, DLS) | ☐ | |

---

## 2. Custom Scenario lab verification

**Path:** Top bar → **Scenario lab** → **Custom scenario** → **Generate scenario**.

Use defaults unless noted (start dip −60°, azimuth 125°, target MD 600, interval 30, planned lift/swing 0.3°/interval).

### Case A — On plan

| Setting | Value |
|---------|--------|
| Hole name | `IT · On plan` |
| Drift pattern | **On plan** |
| Drift magnitude | (n/a) |
| Expected outcome label | `On track demo` |

| Check | Pass | Notes |
|-------|------|-------|
| Status **On track** (or clearly healthy; not Target at risk) | ☐ | |
| Projected miss inside target tolerance | ☐ | |
| Export shows **Scenario lab · …** scenario line | ☐ | |

### Case B — Recoverable drift

| Setting | Value |
|---------|--------|
| Hole name | `IT · Recoverable` |
| Drift pattern | **Gradual lift** (or **Increasing drift**) |
| Drift magnitude | `0.5`–`0.7` °/interval |
| Deviate from default tail behaviour | Accept defaults |

| Check | Pass | Notes |
|-------|------|-------|
| Status **Watch** or **Correction needed** (not Target at risk) | ☐ | |
| Steering: natural/parameter or motor path still plausible | ☐ | |
| Action plan gives a clear next step (not only “give up”) | ☐ | |

### Case C — Unrecoverable drift

| Setting | Value |
|---------|--------|
| Hole name | `IT · Unrecoverable` |
| Drift pattern | **Increasing drift** |
| Drift magnitude | `0.8`–`1.2` °/interval (increase if still recoverable) |

| Check | Pass | Notes |
|-------|------|-------|
| Status **Target at risk** or **Steering recommended** with wedge/branch language | ☐ | |
| Projected miss clearly outside tolerance | ☐ | |
| Simple mode stays readable (no alarm spam) | ☐ | |

---

## 3. Target tolerance checks

Start from **TEST · Recoverable correction** or Scenario lab recoverable case.

| Step | Action | Expected | Pass | Notes |
|------|--------|----------|------|-------|
| 1 | Note current status, projected miss, tolerance (Target setup) | Baseline recorded | ☐ | |
| 2 | **Increase** tolerance (e.g. 6 m → 12 m) | Status may improve (e.g. Correction → Watch or On track) | ☐ | |
| 3 | **Decrease** tolerance (e.g. 6 m → 2 m) | Status may worsen (Watch / Correction / Risk) | ☐ | |
| 4 | QA/QC **Target** flag message updates with miss vs tolerance | ☐ | |
| 5 | Classification changes feel **directionally correct** to a directional driller | ☐ | |

---

## 4. Plan corridor checks

**Path:** Advanced → **Target setup** → **Plan corridor tolerance** (below target fields).

Load **TEST · Gradual drift** or Scenario lab Case B.

| Step | Action | Expected | Pass | Notes |
|------|--------|----------|------|-------|
| 1 | Read corridor status: latest interval inside/outside | Matches visual drift story | ☐ | |
| 2 | Read plan offset vs allowed corridor (widening with depth if configured) | Offset and allowed limit shown | ☐ | |
| 3 | **Tighten** allowed dip/azi deviation (e.g. 0.3° → 0.1°) | More likely **outside** planned corridor | ☐ | |
| 4 | **Loosen** position offset (e.g. 3 m → 15 m) | Corridor position check eases | ☐ | |
| 5 | Advanced → **QA/QC**: **Corridor** watch/risk when outside corridor but target recoverable | ☐ | |
| 6 | Simple mode: advisory lines only when outside corridor or survey caution (not always visible) | ☐ | |
| 7 | Advanced → **Steering**: inline plan corridor summary present | ☐ | |
| 8 | Import planned CSV with `dip_tolerance` / `azi_tolerance` columns (template or custom) | Corridor allowed dev seeds from CSV | ☐ | |

**Two-check mental model (confirm with tester):**

| Question | Can answer separately? | Pass |
|----------|------------------------|------|
| Still inside **planned path corridor**? | ☐ | |
| Can still hit **final target**? | ☐ | |

---

## 5. Survey tool profile checks

**Path:** Advanced → **Setup / assumptions** → **Survey tool profile**.

Use **TEST · On plan** or Case A; then a case with miss near tolerance (gradual drift / recoverable).

| Step | Action | Expected | Pass | Notes |
|------|--------|----------|------|-------|
| 1 | Default **REFLEX EZ-TRAC** (±0.35° az, ±0.25° dip) | Panel shows preset values | ☐ | |
| 2 | Switch to **IMDEX OMNIx42** | Azimuth uncertainty updates to ±0.4° | ☐ | |
| 3 | Switch to **DeviGyro** | Tighter defaults; depth note visible | ☐ | |
| 4 | **Custom** — edit name and uncertainties | Fields editable | ☐ | |
| 5 | On healthy hole: confidence **normal**; no noisy Simple advisory | ☐ | |
| 6 | On near-tolerance hole: **caution** or **repeat survey recommended** note in panel | ☐ | |
| 7 | Simple mode: one calm sentence only when not normal | ☐ | |
| 8 | North reference + magnetic risk visible; changes note wording if applicable | ☐ | |

---

## 6. Persistence checks

| # | Action | Expected | Pass | Notes |
|---|--------|----------|------|-------|
| 1 | Load a preset; set custom tolerance, corridor, survey preset; refresh browser | Same hole, same settings | ☐ | |
| 2 | **New test hole** (library); configure unique target/corridor/tool; switch away and back | Settings retained per hole | ☐ | |
| 3 | **Duplicate** hole; confirm copy is independent | ☐ | |
| 4 | **Reset active hole** (confirm dialog) | **Documented behaviour:** replaces library with a **single** sample hole (DDH-0247); other holes removed. Pass if UI warning matches and testers accept for v1.3; fail if product must keep library. | ☐ | |

Storage key: `targetlock-iq-library-v1` (browser localStorage).

---

## 7. Report export checks

| Case | Hole | Pass | Notes |
|------|------|------|-------|
| **Normal** | TEST · On plan or Scenario lab on-plan | ☐ | |
| **Risk** | TEST · Wedge / branch or Scenario lab unrecoverable | ☐ | |

**For each export (TXT and PDF):**

| Field / section | Matches on-screen? | Pass |
|-----------------|-------------------|------|
| Hole name, site, MD, dip/azi | ☐ | |
| Status, confidence, projected miss, aim | ☐ | |
| Recovery guidance (if steering present) | ☐ | |
| QA/QC flags | ☐ | |
| **Plan corridor** summary (if corridor configured) | ☐ | |
| **Survey tool profile** + uncertainty note | ☐ | |
| Test scenario / Scenario lab line in export | ☐ | |
| Disclaimer present | ☐ | |

---

## 8. Pilot gate (10-minute smoke)

Run in order; tick when done.

| # | Step | Pass |
|---|------|------|
| 1 | Load each built-in preset (table §1) | ☐ |
| 2 | Confirm expected status/action matches docs | ☐ |
| 3 | Generate 3 Scenario lab custom holes: on-plan, recoverable, unrecoverable (§2) | ☐ |
| 4 | Change target tolerance — action changes sensibly (§3) | ☐ |
| 5 | Change survey tool profile — confidence/advisory changes (§5) | ☐ |
| 6 | Change plan corridor limits — QA/corridor flags change (§4) | ☐ |
| 7 | Export PDF: one normal + one risk case (§7) | ☐ |
| 8 | Refresh browser — active hole persists (§6) | ☐ |
| 9 | Switch holes — per-hole target/corridor/tool retained (§6) | ☐ |
| 10 | Reset active hole — behaviour understood; no surprise data loss (§6) | ☐ |

---

## Pass / fail notes template

**Overall session result:** ☐ Pass for wider pilot  ☐ Pass with caveats  ☐ Block — fix before pilot

### Must-fix (blocks pilot)

| ID | Area | What happened | Expected | Owner |
|----|------|---------------|----------|-------|
| MF-1 | | | | |

### Should-fix (v1.3.x / before external users)

| ID | Area | What happened | Suggested change | Owner |
|----|------|---------------|------------------|-------|
| SF-1 | | | | |

### Nice-to-improve (backlog)

| ID | Area | Idea |
|----|------|------|
| NI-1 | | |

### Wording / workflow feedback (primary risk for v1.3)

| Topic | Tester quote / observation | Agree? |
|-------|---------------------------|--------|
| Action plan language | | |
| Watch vs Correction thresholds | | |
| Corridor vs target messaging | | |
| Survey uncertainty tone | | |
| Advanced vs Simple discoverability | | |

---

## Known limitations (v1.3)

Do **not** fail internal testing for these unless product intent changed — log as backlog instead.

| Limitation | Impact |
|------------|--------|
| No live HUB-IQ / SURVEY-IQ API | CSV import only |
| Survey uncertainty is a **simple scalar band**, not ISCWSA error ellipses | Advisory only |
| Plan corridor does not change core **classification** thresholds | Corridor is overlay + QA |
| `dip_tolerance` / `azi_tolerance` on CSV seed corridor; not full planned-path geometry editor | |
| Scenario lab overwrites **active hole** only (no “save scenario to library” button) | |
| **Reset active hole** resets entire library to one sample hole | See §6 |
| No multi-user roles, sign-off locks, or hosted deployment | Pilot prototype |
| Desurvey not certified against client reference in this checklist | Use [validation-plan.md](./validation-plan.md) separately |

---

## What feedback should trigger changes before wider pilot

Use this to decide **v1.3.x patch** vs **v1.4** scope. Internal testing should mainly surface **wording, tolerances, and workflow** — not missing core math.

| Feedback type | Examples | Likely response |
|---------------|----------|-----------------|
| **Blocker — wrong or misleading** | Status contradicts obvious hole geometry; export ≠ screen; data loss without warning; corridor/survey flags always wrong | Fix in **v1.3.x** before external users |
| **Threshold / tolerance disagreement** | Watch too early/late; corridor defaults unrealistic; survey caution too noisy or too quiet | Tune defaults + copy in **v1.3.x**; document site overrides |
| **Wording / UX** | “Correction needed” unclear; corridor vs target confusion | Copy in **v1.3.x** |
| **Workflow gap** | Need per-hole reset; save Scenario lab runs to library; scenario pass/fail indicator in UI | **v1.4** unless trivial |
| **Math / desurvey** | E/N/D mismatch vs reference software | [validation-plan.md](./validation-plan.md) — not a UI-only fix |
| **Integration** | Live survey feed, metadata, roles | **v1.4+** per [feature-roadmap.md](./feature-roadmap.md) |

**Exit criteria for “structured internal testing complete”:**

- All §1 presets verified or exceptions documented  
- §2 Scenario lab custom cases behave directionally as intended  
- §3–§5 sensitivity checks show advisory layers respond to user input  
- §6–§7 persistence and exports acceptable  
- No open **must-fix** items  
- Wording feedback captured in template above for geologist/driller review round  

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Tester | | | |
| Product / sponsor | | | |
