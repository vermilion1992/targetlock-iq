# TargetLock IQ RC2 — Action Checklist

**Audit:** [targetlock-iq-rc2-full-audit.md](./targetlock-iq-rc2-full-audit.md)  
**Date:** 2026-06-07  
**Use:** Tick items before external pilot exposure. Do not skip P0/P1 for operations-manager or paid pilots.

---

## P0 — Before anyone external tests

- [ ] **DOC-P0-1** Update [known-limitations.md](../targetlock-pitch/pilot-testing-kit/known-limitations.md) — add RC2: reference system, near-vertical advisories, confidence downgrade, decision-support limits.
- [ ] **DOC-P0-2** Update [current-status.md](../targetlock-pitch/current-status.md) — **260 tests**, **9 built-in scenarios**, RC2 shipped items.
- [ ] **DOC-P0-3** Update [README.md](../targetlock-pitch/README.md) index — scenario count 9; link to this RC2 audit.
- [ ] **OPS-P0-1** Confirm production build passes in connected environment (`npm run build` — Google Fonts must resolve).
- [ ] **OPS-P0-2** Pilot brief states: **decision support only**; reference system must be confirmed with site survey procedures before use.
- [ ] **OPS-P0-3** Share [test-scenarios.md](../targetlock-pitch/test-scenarios.md) scenarios **#8 Reference system** and **#9 Near-vertical** with every tester.

---

## P1 — Before drilling-company pilot

### Reports & trust

- [ ] **RPT-P1-1** Fix report header `Confidence` to use RC2 reported steering confidence when hole-mode downgrade applies ([BUG-1](../targetlock-pitch/../targetlock-audit/targetlock-iq-rc2-full-audit.md#bugs-found) — `report-data.ts` L185).
- [ ] **RPT-P1-2** Extend `HANDOVER_DISCLAIMER` — add “not a certified survey deliverable” and “not toolface/motor control software”.
- [ ] **RPT-P1-3** Regenerate [DDH-0247-handover-md390.txt/pdf](../targetlock-pitch/samples/) with `referenceSystem`, `referenceWarnings`, `holeModeAssessment` passed to export.

### Reference system

- [ ] **REF-P1-1** Add inline sign help on Mine grid rotation and Magnetic declination fields (`ReferenceSystemPanel.tsx`).
- [ ] **REF-P1-2** Fix `surveyToolProfile.northReference` ↔ `referenceSystem.surveyReference` desync — sync both ways or single control ([BUG-2]).
- [ ] **REF-P1-3** Show reference **warnings** in Simple mode (action plan banner or KPI strip) when severity = `warning`.

### Testing & smoke

- [ ] **TST-P1-1** Extend `scripts/pilot-gate-smoke.mjs` — load scenario #8 or open Setup → Reference system; assert RC2 text in export or panel.
- [ ] **TST-P1-2** Re-run full gate: `npm run test` (260), `npm run lint`, `npm run build`, `npm run smoke:pilot`; record in pilot gate doc.

### Documentation

- [ ] **DOC-P1-1** Update [validation-plan.md](../targetlock-pitch/validation-plan.md) and [final-pilot-gate.md](../targetlock-pitch/final-pilot-gate.md) test counts.
- [ ] **DOC-P1-2** Update [release-candidate-checklist.md](../targetlock-pitch/release-candidate-checklist.md) for RC2 checks.
- [ ] **DOC-P1-3** Clarify version naming: RC1 app label vs RC2 feature batch (Method & Purpose, report section).

---

## P2 — Before paid pilot

- [ ] **UI-P2-1** Chart/tooltip azimuth: align with `outputReference` or label as internal true north ([BUG-3]).
- [ ] **UI-P2-2** Unify or document near-vertical thresholds: 85° hole mode vs 80° branch toolface ([BUG-5]).
- [ ] **DOC-P2-1** Add Reference system step to [guide-center.md](../targetlock-pitch/pilot-testing-kit/guide-center.md) and `guide-flows.ts` standard workflow.
- [ ] **DOC-P2-2** Archive or supersede [rc1-general-audit.md](../targetlock-pitch/rc1-general-audit.md) links — point to this RC2 audit.
- [ ] **TST-P2-1** Add hole-package test asserting `referenceSystem` round-trip persistence.
- [ ] **VAL-P2-1** Complete at least one reference desurvey CSV comparison per [field-validation-checklist.md](../targetlock-pitch/field-validation-checklist.md) with site or synthetic trusted E/N/D.

---

## P3 — Future improvements

- [ ] **FEAT-P3-1** Optional mine-grid collar coordinate fields on reports.
- [ ] **FEAT-P3-2** HUB-IQ / SURVEY-IQ live integration.
- [ ] **FEAT-P3-3** Locked multi-role approval workflow.
- [ ] **FEAT-P3-4** Offline PWA / IndexedDB (Roadmap panel).
- [ ] **FEAT-P3-5** Self-hosted fonts for air-gapped builds.
- [ ] **FEAT-P3-6** Full Playwright institutional regression config.
- [ ] **FEAT-P3-7** Enable `next lint` in CI alongside `tsc`.

---

## Quick verification script (pilot lead)

Run from `packages/starterkit`:

```bash
npm run lint
npm run test
npm run build
npm start
# separate terminal:
npm run smoke:pilot
```

Manual (15 min):

1. Load **TEST · Reference system** — confirm mixed-ref warning in Setup + Validation; export TXT — RC2 section lists plan/survey/output refs.
2. Load **TEST · Near-vertical** — confirm advisory in Action plan; confidence tag downgraded; RC2 section shows downgrade reason.
3. Toggle Simple mode — confirm hole mode advisory visible; confirm whether reference warning is visible (gap until REF-P1-3).
4. Export PDF — compare aim dip/azimuth to on-screen action plan.

---

## Sign-off (pilot gate)

| Role | Name | Date | P0 complete | P1 complete |
|------|------|------|-------------|-------------|
| Technical lead | | | ☐ | ☐ |
| Product / ops | | | ☐ | ☐ |
| Directional advisor (optional) | | | ☐ | ☐ |

**Do not proceed to paid pilot until P1 is complete and field validation evidence exists.**
