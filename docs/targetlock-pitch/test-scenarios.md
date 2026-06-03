# TargetLock IQ — Built-in test scenarios

Synthetic holes for **repeatable demos and user testing** without confidential drill data.

**Load in app:** Top bar → **Scenario lab** → **Built-in scenarios** tab → **Load scenario** on a card.

Each scenario replaces the **active hole** data (plan, actual, target, hole name, site label). The scenario name is stamped on TXT/PDF exports when active.

---

## Scenario lab — custom synthetic holes

**Top bar → Scenario lab → Custom scenario tab** → configure fields → **Generate scenario**.

Use this to build holes without confidential data when the seven presets are not enough.

| Field | Purpose |
|-------|---------|
| Hole name | Label for the active hole and exports |
| Start dip / azimuth | Collar direction |
| Target MD | Plan length and target depth |
| Survey interval | Station spacing (m) |
| Planned lift/drop & swing per interval | Planned path curvature |
| Actual drift pattern | On plan, gradual lift/drop, swing left/right, increasing drift, sudden jump |
| Drift magnitude | Degrees per interval for drift patterns |
| Survey noise | Optional small random perturbation on actual surveys |
| Expected outcome | Label only (shown in status message; not used in math) |

**Output:** Generates planned and actual surveys, loads into the active hole, tags `Scenario lab · {hole name}` on exports. The seven **Built-in presets** below are unchanged.

**Code:** `packages/starterkit/src/lib/drilling/synthetic-hole-builder.ts`

---

## Scenario matrix

| # | Scenario | What it proves | Expected status | Action plan / steering | Panels to inspect |
|---|----------|----------------|-----------------|------------------------|-------------------|
| 1 | **On plan** | App does not over-warn on a healthy hole | On track | Continue drilling | Action plan, KPIs, QA/QC (all OK) |
| 2 | **Gradual drift** | Early warning before correction is required | Watch | Monitor closely; shorten interval if drift continues | Action plan, KPIs, Steering feasibility (Watch) |
| 3 | **Recoverable correction** | Off-plan but recoverable within configured DLS | Correction needed | Correct now | Action plan, Steering (Correct now), Correction options |
| 4 | **Motor / Navi review** | Drift beyond smooth correction; higher-DLS tooling may apply | Steering recommended | Escalate for steering review | Steering feasibility, Math reference (required DLS) |
| 5 | **Wedge / branch review** | Beyond smooth recovery — decision point, not a guarantee | Target at risk | Wedge or branch review | Steering feasibility, Action plan, QA/QC (Recover / Target) |
| 6 | **QA survey jump** | Suspicious single-interval jump flags QA before trusting correction | (varies) | Investigate survey before acting | QA/QC (DLS risk + Trend), Trajectory chart |
| 7 | **Invalid CSV import** | Import validation and clear error messaging | Import rejected | No hole loaded | Hole data status line only |

---

## Scenario details

### 1. On plan
- **Hole:** `TEST · On plan` / Synthetic test suite
- **Data:** Actual tracks planned trajectory to 540 m
- **Expected:** `On track` — projected miss inside tolerance, high confidence
- **Inspect:** Simple mode Action plan (green), KPI strip, QA/QC summary

### 2. Gradual drift
- **Hole:** `TEST · Gradual drift`
- **Data:** Tracks plan to 330 m, then gradual lift and swing right to 450 m
- **Expected:** `Watch` — miss just outside tolerance, DLS still within limit
- **Inspect:** Action plan watch state, projected miss KPI, Steering feasibility verdict

### 3. Recoverable correction
- **Hole:** `TEST · Recoverable correction`
- **Data:** Constant drift from collar to 300 m
- **Expected:** `Correction needed` — required DLS ≤ configured max (3°/30 m)
- **Inspect:** Action plan “correct now”, method feasibility within natural/parameter range

### 4. Motor / Navi review
- **Hole:** `TEST · Motor / Navi review`
- **Data:** Stronger drift to 330 m
- **Expected:** `Steering recommended` — required DLS above configured max but within motor/Navi assumptions
- **Inspect:** Steering feasibility tab, Recovery capability assumptions

### 5. Wedge / branch review
- **Hole:** `TEST · Wedge / branch review`
- **Data:** Severe drift to 360 m
- **Expected:** `Target at risk` + steering action **Wedge or branch review**
- **Inspect:** Action plan escalation, QA Recover/Target flags, Steering methods grid

### 6. QA survey jump
- **Hole:** `TEST · QA survey jump`
- **Data:** Near-on-plan path with a sudden dip/azimuth jump at 210 m
- **Expected:** QA/QC **DLS** and/or **Trend** watch/risk flags on the latest interval
- **Inspect:** Advanced → QA/QC (expand all checks), Trajectory chart for kink

### 7. Invalid CSV import
- **Not a hole load** — demonstrates import rejection
- **Data:** Malformed CSV (`depth;inclination;bearing` — no MD/dip/azimuth)
- **Expected:** Status message: *No valid surveys found. Expected columns: MD, dip, azimuth…*
- **Inspect:** Hole data panel status line; active hole data unchanged

---

## Suggested demo flow (10 minutes)

1. **On plan** — show the app stays calm when the hole is healthy.
2. **Gradual drift** — show early warning without panic.
3. **Recoverable correction** — show a clear “what to do next” action plan.
4. **Motor / Navi review** — open Advanced → Steering feasibility for the “why”.
5. **Wedge / branch review** — show the escalation path.
6. **QA survey jump** — show survey QA/QC catches bad data.
7. **Invalid CSV** — show import guardrails.
8. Export PDF from any hole scenario — confirm **Test scenario** line appears in the report header.

---

## Maintenance

Scenario data and expected outcomes are locked in code:

- `packages/starterkit/src/lib/drilling/test-scenarios.ts`
- `packages/starterkit/src/lib/drilling/__tests__/test-scenarios.test.ts`

If you change drift parameters, re-run `npm run test` and update this document.
