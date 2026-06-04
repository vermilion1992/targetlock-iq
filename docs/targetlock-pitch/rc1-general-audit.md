# TargetLock IQ v2 RC1 — General audit report

**Audit date:** 2026-06-04  
**Scope:** Institutional RC1 readiness — code, workflows, copy, guides, branch program, exports, deployment  
**App:** `packages/starterkit` → `/targetlock`  
**Constraint:** Bug, confusion, and safety fixes only — no new major features.

---

## Executive summary

**Pilot-ready: Yes**, with standard pilot guardrails.

TargetLock IQ v2 RC1 is suitable for controlled pilot testing with drillers, geologists, and supervisors who understand the product is **decision support only**. Core hole workflows, multi-hole library, Guide Center walkthroughs, Scenario Lab, branch program Phase 2, and export paths are implemented and covered by automated tests.

No **pilot blockers** were found during this audit. Remaining items are documented limitations (browser storage, no HUB-IQ API, advisory steering/branch outputs) and a small v2.1 backlog.

---

## What was checked

| Section | Areas |
|---------|--------|
| 1. Codebase inventory | App shell, drilling math, storage, reports, guide, scenario lab, branch, charts, deploy |
| 2. Verification | `npm run test`, `npm run lint`, `npm run build` |
| 3. Core workflows | Load, import, manual survey, exports, package JSON, reset, persistence, modes |
| 4. Sidebar | Hole data, library, target setup, destructive confirms — see [sidebar-action-audit.md](./sidebar-action-audit.md) |
| 5. Workspace | KPIs, action plan, charts, Advanced tabs, modals — see [non-sidebar-action-audit.md](./non-sidebar-action-audit.md) |
| 6. Guide Center | Quick (6), Standard (20), Branch (12) — highlights, demo restore, tab open |
| 7. Scenario Lab | Built-in, custom, branch presets; invalid CSV |
| 8. Branch program | Kickoff from actual mother, import routing, approval/stale, PDF |
| 9. Domain language | Advisory tone; action display labels |
| 10. Tooltips | DLS, corridor, survey profile, branch kickoff/separation/toolface, package/reset |
| 11. Reports | TXT/PDF handover, branch PDF, JSON package |
| 12. Deployment | Railway `0.0.0.0` / `PORT`, `/` → `/targetlock`, standalone build |
| 13. Accessibility | Modal Escape, aria labels, focus, mobile guide panel scroll |

---

## Codebase structure (short map)

| Area | Primary paths |
|------|----------------|
| App shell | `src/app/targetlock/page.tsx`, `TargetLockApp.tsx`, `targetlock.css` |
| Project state | `src/hooks/use-targetlock-project.ts` |
| Drilling math | `lib/drilling/compute.ts`, `desurvey.ts`, `recommendation.ts`, `steering-feasibility.ts`, `qa.ts` |
| Storage | `storage.ts`, `storage-health.ts`, `hole-library.ts` |
| Hole package | `hole-package.ts` |
| Reports | `report.ts`, `report-pdf.ts`, `report-data.ts`, `branch-report-*.ts` |
| Branch | `branch-program.ts`, `branch-program-library.ts`, `BranchProgramPanel.tsx` |
| Guide | `guide-flows.ts`, `use-guide-mode.ts`, `GuideCenterModal.tsx`, `GuideTour.tsx` |
| Scenario Lab | `test-scenarios.ts`, `branch-program-scenarios.ts`, `ScenarioLabModal.tsx` |
| Charts | `TrajectoryCanvas.tsx`, `Trajectory3D.tsx`, `chart-branch-overlay.ts` |
| Deploy | `next.config.mjs`, `scripts/start-railway.mjs` |

---

## Issues found and fixed

| Severity | File / area | Change |
|----------|-------------|--------|
| **Blocker** | `guide-flows.ts` | Added missing `stepCount: 12` on branch flow metadata (fixed `tsc` / build failure) |
| Medium | `ActionPlanPanel.tsx` | Display **Correction advisable** instead of **Correct now** on rig-floor hero; softened guidance tip |
| Medium | `KickoffPlannerPanel.tsx` | InfoTips on kickoff planner, DLS, mother/sibling separation columns |
| Medium | `BranchApprovalPanel.tsx` | InfoTip on stale approval when assumptions/plan change |
| Medium | `ToolfaceEstimateCard.tsx` | InfoTip — planning estimate only |
| Medium | `SurveyToolProfilePanel.tsx` | InfoTips on azimuth/dip uncertainty fields |
| Low | `TargetLockApp.tsx` | Hole package backup InfoTip; `aria-label` on reset buttons; branch empty-state guide highlight |
| Low | `targetlock.css` | Mobile scroll for guide tour panel; single-column Guide Center cards |
| Low | `guide-flows.test.ts` | Assert `GUIDE_FLOWS[].stepCount` matches step arrays |

**Already resolved before this audit**

- Orphan `pitch-scenario` tour module removed (Guide Center replaces it).
- Guide Center: non-destructive steps, library snapshot restore on exit/restart, demo load confirm.
- Copy pass per [`copy-audit-rc1.md`](./copy-audit-rc1.md) on recommendation actions.

---

## Verification results

Commands run from `packages/starterkit` after fixes:

| Command | Result |
|---------|--------|
| `npm run test` | **Pass** — 156 tests (29 files) |
| `npm run lint` (`tsc --noEmit`) | **Pass** |
| `npm run build` | **Pass** — Next.js 16 standalone |

---

## Remaining known limitations

See [`pilot-testing-kit/known-limitations.md`](./pilot-testing-kit/known-limitations.md).

Highlights:

- Browser `localStorage` only — no multi-user sync.
- Steering feasibility and branch kickoff/toolface remain **advisory**; site sign-off required.
- Internal status key `Correct now` still used in math/tests; UI shows **Correction advisable**.
- No live HUB-IQ integration in RC1.
- Public pilot URL has no authentication.

---

## Pilot blockers

**None identified** in this audit.

---

## Recommended v2.1 backlog (non-blocking)

| Item | Rationale |
|------|-----------|
| Rename internal `Correct now` steering action everywhere | Align code/tests with display label |
| Guided screenshot automation for all 11 deck shots | Reduce manual capture drift |
| HUB-IQ direct import | Roadmap item |
| Role-based access for hosted pilot | Security |
| Offline/sync packaging | Field connectivity |

---

## Manual checks still recommended before external pilot

Use [`release-candidate-checklist.md`](./release-candidate-checklist.md) and [`pilot-testing-kit/15-minute-hands-on.md`](./pilot-testing-kit/15-minute-hands-on.md):

1. One full **Standard hole workflow** guide run on a real or sample hole.
2. One **Branch** guide run with `branch-p2-kickoff-compare` demo.
3. Export PDF + branch PDF open correctly on reviewer machine.
4. Browser refresh after branch daughter save.

---

## Related docs

- [Guide Center index](./pilot-testing-kit/guide-center.md)
- [Demo runbook](./demo-runbook.md)
- [Copy audit RC1](./copy-audit-rc1.md)
- [Deployment Railway](./deployment-railway.md)
