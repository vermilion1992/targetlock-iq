# TargetLock IQ — Validation plan (math & historical holes)

**Version:** v1.2  
**Focus:** Verify calculation outputs against trusted desurvey tools and real (anonymized) hole data before pilot sign-off.  
**Scope:** This document complements [risk-and-validation-plan.md](./risk-and-validation-plan.md) (broader operational and commercial risks).

---

## 1. Objective

Demonstrate that TargetLock IQ outputs are **consistent enough for decision support** when compared to site-standard desurvey and directional software — not that the app replaces certified survey deliverables.

**Passing validation does not remove** geologist/supervisor approval or site SOP requirements.

---

## 2. What to validate

| Layer | Outputs | Priority |
|-------|---------|----------|
| Desurvey | E, N, D (collar-relative), station MD | **High** |
| Geometry | Dogleg, DLS (°/30 m), interpolation at MD | **High** |
| Recommendation | Aim dip/azi, DLS required, miss vector, projected miss | **High** |
| Classification | On track / Watch / Correction / Risk | Medium |
| Steering feasibility | Interval lift/drop & swing; rejoin DLS; method feasibility | Medium |
| Plan corridor | Per-interval behaviour vs plan; position offset vs widening corridor; separate from target miss | Medium |
| Survey tool profile | Uncertainty note when miss is close to tolerance; profile on reports | Medium |
| Reports | TXT/PDF fields match on-screen values | Medium |

Automated regression: `npm run test` in `packages/starterkit` (79 tests at v1.2 release).

---

## 3. Reference tools (pick what the site uses)

Record which tool is **authority** for the comparison:

| Tool / method | Typical use |
|---------------|-------------|
| Deswik / Leapfrog drilling module | Desurvey + plan comparison |
| Compass (Schlumberger) | Industry test vectors |
| Site spreadsheet (documented) | Legacy comparison only if version-controlled |
| HUB-IQ / SURVEY-IQ export | End-to-end CSV round-trip |

**Document:** Software version, coordinate convention, dip/azimuth sign convention, and collar origin.

---

## 4. Test cases

### 4.1 Synthetic vectors (minimum)

Run before any site data:

| Case | Input | Check |
|------|-------|-------|
| Straight hole | Constant dip/azi, 30 m stations | DLS ≈ 0; E/N/D monotonic |
| Single dogleg | Known 3° turn over 30 m | DLS matches hand calc |
| High azimuth wrap | 359° → 1° change | Shortest-angle swing correct |
| Plan interpolation | Mid-interval MD | Smooth dip/azi on plan path |

**Source:** Unit tests in `geometry.test.ts`, `desurvey.test.ts`, `recommendation.test.ts`.

**Plan corridor vs target (two checks):**

| Check | Question |
|-------|----------|
| Corridor | Is the latest interval inside planned lift/drop and swing tolerance, and is 3D offset from plan within the corridor (with depth widening)? |
| Target | If the hole continues on the current vector, is projected miss still inside the target envelope? |

A hole can be **outside the planned corridor** but **still recoverable** to target — both should be visible in Advanced (Target setup / Steering) and in Simple only when action is affected.

**Source:** `plan-corridor.test.ts`, `survey-tool-profile.test.ts`, `synthetic-hole-builder.test.ts`.

### 4.2 Industry / published hole (anonymized)

| Step | Action |
|------|--------|
| 1 | Obtain plan + actual survey CSV (≥ 8 stations, one drift case) |
| 2 | Import into TargetLock IQ; set target from plan or site spec |
| 3 | Export station E/N/D at each survey MD |
| 4 | Run same surveys in reference tool with **identical collar and conventions** |
| 5 | Compare station-by-station |

**Pass criteria (agree with site geology before pilot):**

| Metric | Suggested tolerance |
|--------|---------------------|
| E, N, D at survey MD | ≤ 0.1 m per station vs reference |
| DLS (latest interval) | ≤ 0.05°/30 m vs reference |
| Projected miss magnitude | ≤ 0.5 m vs reference *or* expert agrees direction is same |

### 4.3 Historical “known outcome” hole (optional, high value)

Use a completed hole where final intercept outcome is known:

| Check | Question |
|-------|----------|
| Mid-hole drift | Did projected miss at MD X match post-mortem discussion? |
| Recovery | Would recovery guidance have suggested the method actually used? |
| Escalation | Would escalation depth have preceded wedge/motor decision? |

Qualitative pass: geologist/supervisor agrees the app **would have helped the conversation**, not that it would have been perfect.

### 4.4 Steering feasibility spot checks

| Check | Method |
|-------|--------|
| Planned vs actual interval | Pick one interval; verify lift/drop and swing match manual calc from survey rows |
| Rejoin DLS at 30 m | Compare to reference tool dogleg to plan at current MD + 30 m |
| Assumption change | Raise motor/Navi max DLS; confirm method feasibility table updates |
| Report assumptions | Export PDF; confirm assumption summary matches Advanced editor |

---

## 5. CSV / HUB-IQ round-trip

Per [hub-iq-import.md](./hub-iq-import.md):

| Test | Pass |
|------|------|
| Download plan template → fill → import | Stations load; charts render |
| Download actual template → import | Recommendation updates |
| Alias headers (if used) | Parse without manual edit |
| Azimuth convention documented | No silent 360°/true grid mix-up |

---

## 6. Manual survey entry scenario (demo realism)

Before showing external stakeholders:

1. Load sample plan only (or blank actual).  
2. Enter 3–5 surveys manually at realistic intervals.  
3. Confirm status transitions: on track → watch → correction.  
4. Confirm recovery guidance updates each station.  
5. Export PDF; verify MD and wording match screen.

**Time box:** 20 minutes. **Owner:** Presenter or site champion.

---

## 7. Validation record template

Copy for each hole compared:

```text
Validation record — TargetLock IQ v1.2
Date:
Validator (name, role):
Reference tool (name, version):
Hole ID (anonymized):
Collar E/N/D/Z:
Dip convention: negative down / other
Azimuth: clockwise from north / other

Station comparison (worst delta):
  MD ___ m: ΔE= ___ ΔN= ___ ΔD= ___

DLS latest interval: App ___ / Ref ___
Projected miss: App ___ m / Ref ___ m
Recovery action at final survey: ___
Geologist comment:

Result: ☐ Pass  ☐ Pass with notes  ☐ Fail — do not pilot until resolved
Notes:
Signature:
```

Store completed records with the pilot pack (not in public repo if client data).

---

## 8. Roles & timeline

| Phase | Duration | Activity |
|-------|----------|----------|
| 0 | Complete | Automated tests green; internal sample walkthrough |
| 1 | 1–2 days | Synthetic + one anonymized hole vs reference tool |
| 2 | Before external demo | Manual survey scenario + PDF check |
| 3 | Pilot week 1 | Site geology reviews first live import |
| 4 | Pilot week 4 | Close-out memo: pass/fail vs criteria above |

---

## 9. Stop / go (calculation-specific)

**Stop pilot promotion if:**

- Any station E/N/D delta &gt; agreed tolerance without documented convention difference  
- DLS or projected miss wrong **direction** (sign error) on reference case  
- Recovery guidance contradicts obvious site policy on reference hole  

**Go if:**

- Deltas within tolerance or explained (e.g. interpolation method)  
- Expert reviewer signs validation record  
- [field-feedback-form.md](./field-feedback-form.md) shows no blocking wording/trust issues  

---

## 10. Automated test command

From `packages/starterkit`:

```bash
npm run test
npm run lint
npm run build
```

Re-run after any drilling library change before updating pitch samples (`npm run generate:samples`).

---

*This plan validates decision-support calculations. It does not certify survey compliance, JORC/NI 43-101 reporting, or replace downhole survey contractor deliverables.*
