# TargetLock IQ — Pilot proposal

**Version:** v1.1 prototype  
**Duration:** 4–8 weeks (adjust per site roster)  
**Deployment:** Browser app on rig tablet or office PC (`/targetlock`); no server required for pilot  

---

## 1. Objectives

1. Reduce **survey-to-decision time** from survey receipt to agreed next-interval aim.  
2. Improve visibility of **projected target miss** before it becomes intercept risk.  
3. Standardize **rig-floor communication** (dip/azi aim, steepen/flatten, turn left/right).  
4. Produce **shift handover artifacts** (TXT/PDF) accepted by supervisors and geology.  
5. Validate fit with **IMDEX field data workflow** (CSV import now; integration path for v2).  

## 2. Scope

### In scope

| Item | Detail |
|------|--------|
| Holes | 1–2 deep diamond holes (e.g. mother + daughter branch program), planned trajectory + actual surveys per leg |
| Users | 2 drillers, 1 geologist, 1 drilling supervisor (minimum) |
| Modes | Simple (rig) + Advanced (office review) |
| Outputs | Decision history, TXT/PDF handover per significant survey |
| Training | 1 hour rig-floor + 1 hour office; demo script provided |
| Governance | Supervisor decision panel + decision history + TXT/PDF handover |
| Import | HUB-IQ-style CSV templates ([hub-iq-import.md](./hub-iq-import.md)) |

### Out of scope (pilot)

- Production sign-off as sole desurvey authority  
- Real-time rig equipment control  
- Multi-mine enterprise rollout  
- Certified compliance with specific JORC/NI 43-101 reporting (supporting evidence only)  

## 3. Site requirements

- Planned hole CSV (MD, dip, azimuth; tolerance columns optional)  
- Actual survey CSV from camera or export (MD, dip, azimuth)  
- Agreed **target definition** (MD and collar-relative E/N/D offset)  
- **Max DLS** and **survey interval** conventions documented  
- Tablet or PC with modern browser; offline not required for v1 (local persistence only)  

## 4. Roles and responsibilities

| Party | Responsibility |
|-------|----------------|
| **Site drilling** | Enter surveys, follow or reject recommendations per procedure |
| **Site geology** | Approve target, review Advanced QA flags, sign off handover |
| **IMDEX / vendor** | App support, bug fixes, weekly check-in, pilot report |
| **Site IT** | Optional: host static build on internal URL; no database for v1 |

## 5. Success metrics

| Metric | Baseline | Pilot target (indicative) |
|--------|----------|---------------------------|
| Survey-to-decision time | Current process (timed) | ≥ 30% reduction on routine stations |
| Unplanned trajectory reviews | Count per hole | Fewer late “emergency” reviews |
| Handover completeness | Ad hoc notes | 100% of trial surveys with exported handover |
| User acceptance | N/A | ≥ 3/4 roles rate “would use again” |
| Projected miss awareness | Qualitative | Supervisors confirm miss shown before TD on trial hole |

Metrics are **indicative**; site and hole difficulty will adjust targets.

## 6. Pilot schedule (example: 6 weeks)

| Week | Activity |
|------|----------|
| 1 | Setup, CSV templates, target lock, driller training |
| 2–4 | Live use every survey; decision history + exports |
| 5 | Geologist/supervisor review session; capture screenshots |
| 6 | Retrospective, v2 priority workshop, written pilot report |

## 7. Deliverables

1. Configured hole package(s) and sample exports (TXT/PDF) in `docs/targetlock-pitch/samples/`  
2. Pilot usage log (surveys processed, exports generated)  
3. **Pilot close-out report**: metrics, quotes, issues, v2 recommendations  
4. Screenshot set per [screenshot-checklist.md](./screenshot-checklist.md)  

## 8. Support model (pilot)

- Email/chat response within one business day  
- Critical calculation discrepancy: 48-hour review against independent desurvey  
- Weekly 30-minute sync with site champion  

## 9. Path after pilot

- **Go:** v2 funded for HUB-IQ import, multi-hole library, approval workflow (see [feature-roadmap.md](./feature-roadmap.md))  
- **Hold:** continue v1 on selected rigs with CSV-only  
- **No-go:** document reasons; retain math engine for internal R&D  

## 10. Approvals

| Name | Role | Signature | Date |
|------|------|-----------|------|
| | Site superintendent | | |
| | Lead geologist | | |
| | Drilling supervisor | | |
| | IMDEX sponsor | | |

---

*See [risk-and-validation-plan.md](./risk-and-validation-plan.md) for validation requirements before expanding beyond pilot.*
