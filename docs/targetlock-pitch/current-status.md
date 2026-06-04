# TargetLock IQ — Current status

**As of:** v1.2 pilot-ready — **feature freeze + testing-readiness + validation hardening**  
**App:** `packages/starterkit` → http://localhost:3000/targetlock  
**Tests:** `npm run test` (152+ tests — drilling, steering, reports, branch program, RC1 package/storage, math validation)

**RC1 pilot readiness:** Version label, hole package JSON export/import, corrupt-storage recovery, error boundary, release checklist — see [release-candidate-checklist.md](./release-candidate-checklist.md) and [pilot-testing-kit/](./pilot-testing-kit/).

---

## Shipped (v1 + v1.1)

| Area | What works |
|------|------------|
| **Trajectory math** | Min-curve desurvey, offset from plan, projected miss, DLS-limited next aim, correction options |
| **Steering feasibility** | Planned vs actual lift/drop & swing; **Action plan** (Simple); condensed steering summary + **Recovery capability assumptions** under Advanced tabs (per hole) |
| **UI** | Simple = **Action plan** + KPIs + basic charts; Advanced = grouped tabs (Trajectory · Steering feasibility · QA/QC · Decisions · **Math reference** · **Method & Purpose** · **Validation** · Setup/assumptions); **Guide Center** (quick · standard 20-step · branch 12-step walkthroughs — non-destructive, optional demo load) |
| **Transparency** | **Math reference** tab explains survey direction, desurvey, offset from plan, projected miss, required aim, DLS/feasibility, interval behaviour, and assumptions with live values |
| **Method & Purpose** | Advanced reference tab: why TargetLock IQ exists, what it provides, who it helps, what it does not replace (decision support only) |
| **Validation** | **Validation** tab: plan import sanity check, reference desurvey comparison (upload trusted E/N/D, compare station-by-station), coordinate/survey convention notes, and **assumption sign-off** (reviewer + timestamp; flags **stale** if assumptions change). Unvalidated warning in Setup; **Validation status** section in TXT/PDF reports |
| **Test scenarios** | **7 built-in synthetic holes** + **10 branch program demos** (Phase 1 + Phase 2) — load from **Scenario lab** (Built-in / Custom / **Branch programs**); scenario name on exports. See [test-scenarios.md](./test-scenarios.md) |
| **Branch program Phase 2** | Persisted mother/daughter library, editable targets, kickoff planner, approvals, import routing, Branch Planning PDF, toolface estimate — Advanced **Branch program** tab |
| **Branch Program (v2 Phase 1)** | Read-only Advanced tab: program map, branch table, kickoff ranking; kickoff from actual mother survey; separation warnings. See [branch-program.md](./branch-program.md) |
| **Sidebar polish** | Field-friendly labels: Hole details, Hole data (hole plan / survey results uploads), Target setup, Add survey, Fill from action plan, Reset active hole, New test/blank hole |
| **Charts** | 2D plan, section, deviation; **3D preview** (Advanced, canvas) |
| **Data in** | CSV import; HUB-IQ **templates** + **column aliases**; load sample; manual survey + undo |
| **Metadata** | Editable **hole name** and **site/project** (Advanced); on handover exports |
| **Governance** | **Supervisor decision** panel (5 actions); **shorten interval** updates spacing; decision history |
| **Exports** | TXT + PDF handover with status, aim, QA, correction table, **recent history**, disclaimer |
| **Persistence** | **Multi-hole library** in `localStorage` (`targetlock-iq-library-v1`); legacy single-hole key migrates on load |
| **Hole library** | New (sample/blank), duplicate, switch, delete (confirm); rename via hole name field |
| **Quality** | 130 unit tests; `tsc --noEmit`; production build |
| **Readiness polish** | Tooltip coverage on KPIs, action plan (best method, escalation), steering interval/rejoin, wedge threshold, exports; consistent terminology (**Offset from plan**, DLS as °/30 m); CSV import validation messages; reset-hole confirmation |

---

## Partially complete

| Area | Done | Not done |
|------|------|----------|
| **Approval workflow** | Log decisions; **assumption sign-off** (reviewer + timestamp, stale detection); export in history & report | Locked approve/reject state; multi-role sign-off |
| **Validation evidence** | In-app sanity check, reference desurvey comparison, convention notes, sign-off; [pre-field checklist](./field-validation-checklist.md) | Survey uncertainty (ISCWSA) envelope; validated against client reference data and historical holes |
| **HUB-IQ** | CSV templates + docs + aliases | Live API/sync from HUB-IQ / SURVEY-IQ |
| **3D** | Interactive canvas preview | Three.js, toolface, solids |
| **Pitch pack** | Markdown docs + checklist + **deck.md** | 8 PNG screenshots in `screenshots/` (regenerate via `npm run capture:screenshots`) |
| **Pilot artifacts** | Sample generation script / README | All checklist PNGs captured |

---

## Not done (field product gaps)

- Live HUB-IQ / SURVEY-IQ integration  
- Full approval sign-off workflow  
- IndexedDB / offline sync  
- Survey metadata (tool, operator, timestamps)  
- Repeat survey comparison  
- User roles and hosted deployment  
- ESLint via `next lint` (using `tsc --noEmit` instead)  
- Certified desurvey validation package  

---

## Recommended next build slice

**After v1.1 checkpoint**

1. Capture deck **screenshots** per [screenshot-checklist.md](./screenshot-checklist.md)  
2. Pilot feedback → PDF layout polish  
3. **Live HUB-IQ / SURVEY-IQ** integration (defer until multi-hole pilot use is validated)  
4. Full approval sign-off (name/role, locked state)

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [feature-roadmap.md](./feature-roadmap.md) | Phased roadmap |
| [steering-feasibility.md](./steering-feasibility.md) | Recovery logic and assumptions |
| [hub-iq-import.md](./hub-iq-import.md) | CSV columns and templates |
| [screenshot-checklist.md](./screenshot-checklist.md) | Deck captures |
| [demo-script.md](./demo-script.md) | Live demo script |

---

*Decision support only. Site procedures and geologist/supervisor approval apply before operational use.*
