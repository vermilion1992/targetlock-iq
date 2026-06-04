# TargetLock IQ — Feature roadmap

Roadmap from **v1 / v1.1 prototype** (shipped) to **commercial field product**. Timing is indicative; sequence adjusts after pilot feedback.

**Legend:** ✅ Done · 🔄 In progress / pilot · 📋 Planned · 🔮 Future

**Current snapshot:** [current-status.md](./current-status.md)

---

## v1 — Prototype ✅

| Capability | Status |
|------------|--------|
| Minimum curvature desurvey | ✅ |
| Plan vs actual offset at current MD | ✅ |
| Projected target miss (no-correction) | ✅ |
| Next-interval aim (DLS-limited) | ✅ |
| Steepen/flatten, turn left/right wording | ✅ |
| Simple / Advanced modes | ✅ |
| Plan, section, deviation charts (2D) | ✅ |
| CSV import (planned + actual) | ✅ |
| Manual survey entry + undo | ✅ |
| QA/QC flags | ✅ |
| Correction options (15/30/60 m, to target) | ✅ |
| Decision history | ✅ |
| Single-hole localStorage persistence | ✅ |
| TXT + PDF shift handover | ✅ |
| Pitch walkthrough (8 steps) | ✅ |
| Unit tests (drilling math + reports) | ✅ |
| `/` → `/targetlock` redirect | ✅ |

---

## v1.2 — Steering feasibility ✅ (shipped)

| Item | Status | Notes |
|------|--------|-------|
| Planned vs actual **lift/drop & swing** per interval | ✅ | Advanced table |
| **Recovery guidance** panel (Simple) | ✅ | Current action, best method, next aim, escalation |
| **Steering feasibility** panel (Advanced) | ✅ | Rejoin DLS, methods, point-of-no-return estimate |
| Configurable **capability profiles** | ✅ | Defaults in `capability-profiles.ts` |
| Handover TXT/PDF **recovery section** | ✅ | With feasibility disclaimer |
| Guide Center (quick · standard · branch walkthroughs) | ✅ | Non-destructive steps; optional demo load; tab/highlight navigation |
| Docs | ✅ | [steering-feasibility.md](./steering-feasibility.md) |

---

## v1.1 — Pilot hardening ✅ (shipped)

| Item | Status | Notes |
|------|--------|-------|
| HUB-IQ / SURVEY-IQ **CSV template pack** | ✅ | `public/templates/` + sidebar download links |
| **CSV column aliases** (HUB-IQ style) | ✅ | `measured_depth_m`, `inclination_deg`, etc. |
| **Hole name + site/project** metadata | ✅ | Advanced sidebar; on TXT/PDF reports |
| **Supervisor decision panel** | ✅ | Continue, correct naturally, shorten interval, steer, stop hole |
| **Shorten survey interval** action | ✅ | Halves `nextInterval` (min 10 m) when selected |
| **3D trajectory preview** | ✅ | Advanced mode; canvas, drag-to-rotate (not Three.js) |
| Handover includes **history + metadata** | ✅ | Recent decisions in TXT/PDF |
| Import guide | ✅ | [hub-iq-import.md](./hub-iq-import.md) |
| Pitch doc alignment | ✅ | This file + [current-status.md](./current-status.md) |

### v1.1 — Still open during pilot 🔄

| Item | Status | Notes |
|------|--------|-------|
| **Multi-hole library** | ✅ | Advanced panel; `targetlock-iq-library-v1` |
| Print-friendly PDF tweaks from site feedback | 📋 | Baseline PDF exists |
| Real pitch **screenshots** + **sample exports** in repo | ✅ | `screenshots/01–08`; `npm run capture:screenshots` |
| Bug fixes from pilot log | 🔄 | Ongoing |

---

## v2 — Branch Program (institutional module) 🔄

**Mother hole, daughter holes, targets, and kickoff control.** Full spec: [branch-program.md](./branch-program.md).

### Phase 1 — Foundation (shipped in prototype)

| Item | Status | Notes |
|------|--------|-------|
| Branch Program vision doc | ✅ | [branch-program.md](./branch-program.md) |
| Kickoff from **actual** mother survey | ✅ | `branch-program.ts` |
| DLS mother→daughter, kickoff ranking, C2C separation | ✅ | Unit tests |
| Scenario Lab — 5 branch demos | ✅ | `branch-program-scenarios.ts` |
| Advanced **Branch program** tab (read-only) | ✅ | Program map, branch table, kickoff comparison |
| Simple mode branch summary strip | ✅ | Mother context, target, on-track, directional review flag |

### Phase 2 — Full branch planning ✅

| Item | Status | Notes |
|------|--------|-------|
| Persist branch program in hole library | ✅ | Mother `branchProgram`, daughter lineage |
| Editable targets + kickoff planner | ✅ | Rank with mother/sibling separation |
| Active daughter + survey import routing | ✅ | Import modal; daughter-aware simple strip |
| Approval gate + stale detection | ✅ | Snapshot on daughter ref |
| Toolface planning estimate | ✅ | Planner + PDF; planning disclaimer |
| Branch Planning Report PDF | ✅ | Export from Branch program tab |
| Scenario Lab Phase 2 presets (5) | ✅ | `branch-p2-*` demos |
| Anti-collision advanced (ellipse, separation factor) | 📋 | Phase 3 |
| Scenario Lab custom branch builder | 📋 | Beyond presets |

---

## v2 — Field product (post-pilot) 📋

| Item | Priority | Notes |
|------|----------|-------|
| **Multi-hole enhancements** | Medium | Sort/filter, import hole package, cloud sync |
| **Live HUB-IQ / SURVEY-IQ import** | High | API or file drop; not CSV-only |
| **Full approval sign-off** | High | Name/role, formal approve/reject beyond decision log |
| **Survey metadata** | Medium | Tool, operator, quality, timestamp |
| **IndexedDB / offline sync** | Medium | Rig connectivity gaps |
| **Repeat survey comparison** | Medium | QC for magnetic / re-survey |
| **User roles** (read-only vs editor) | Medium | Light governance without full IT |
| **Hosted deployment** | Medium | Site URL or cloud tenant |

*Removed from v2 (already in v1.1):* lightweight supervisor decisions, CSV templates, 3D canvas preview, hole/site metadata on reports.

---

## v2.5 — 3D enhancements 📋

| Item | Status |
|------|--------|
| Interactive 3D trajectory (canvas, drag rotate) | ✅ v1.1 |
| Full Three.js / rig model integration | 📋 |
| Toolface / envelope solids / export frame | 📋 v3 overlap |

---

## v3 — Differentiation (6–12 months) 📋

| Item | Priority | Notes |
|------|----------|-------|
| **3D trajectory enhancements** | High | Toolface, envelope solids, export frame |
| **Steering modes** | High | DeviDrill, motor, wedge capability integration (mother–daughter genealogy in [Branch Program](./branch-program.md)) |
| **Toolface / dogleg capability** | Medium | Match recommendation to tooling |
| **Target envelope editing** | Medium | Geologist tuning with audit |
| **Integration: Seequent / acQuire / Micromine** | Medium | Export intercept context |
| **Lithology / parameters overlay** | Low | Context for “why” drift occurred |

---

## v4 — Scale and ecosystem 🔮

| Item | Notes |
|------|-------|
| Multi-rig dashboard | Company-wide trajectory risk |
| Analytics: hit rate, metres saved | Portfolio metrics |
| Model-assisted trend detection | Beyond rule-based QA |
| Enterprise SSO / audit | Major miner IT requirements |
| Certified validation package | Third-party desurvey benchmark |

---

## Explicit non-goals (near term)

- Autonomous rig control from TargetLock recommendations  
- Replacing certified mine grid / CRS management in v2  
- Full mine planning or resource estimation  
- Live HUB-IQ integration before multi-hole pilot validation (recommended sequence)

---

## Dependencies

| Roadmap item | Depends on |
|--------------|------------|
| Live HUB-IQ import | API access, data model agreement |
| Full approval sign-off | Role definitions per client |
| Multi-hole library | Stable hole ID + library storage model |
| Enterprise SSO | Hosting model decision ([commercial-model-options.md](./commercial-model-options.md)) |

---

## Recommended build sequence (2026)

1. ✅ v1.1 doc alignment + pitch artifacts + multi-hole library  
2. 🔄 Pilot PDF polish from site feedback  
3. Pilot feedback → PDF polish  
4. **Live HUB-IQ / SURVEY-IQ** (v2)  
5. Full sign-off + offline + roles + hosting  

Update this document after pilot close-out.
