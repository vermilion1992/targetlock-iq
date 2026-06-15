# TargetLock IQ — Phase 6 Execution Gate

Phase 6 closes the plan-to-drill lifecycle with auditable execution evidence. This document describes the lifecycle, manual test checklist, gate criteria, and known limitations.

## Phase 6 lifecycle

| Phase | Capability | Where |
|-------|------------|-------|
| 6A | Plan approval & lock for execution | Planner Review → Approve → Mark active |
| 6B | Actual surveys vs locked plan | TargetLock dashboard — banner, strip, Validation tab |
| 6C | Completion & revision control | Mark completed; create revision in Planner |
| 6D | Execution evidence pack & pilot gate | Advanced Validation tab; Planner Review audit panel |

### Evidence trail (6D)

For active and completed planner holes, TargetLock derives:

- Approved plan snapshot (`approvalSnapshot`)
- Locked execution plan (`lockedPlan`)
- Actual survey log (`actualRecords`)
- Actual-vs-locked-plan status
- Decision history (`history`)
- Completion snapshot (when completed)
- Revision lineage (when revisions exist)

Exports:

- Execution TXT / PDF report
- Actual survey CSV
- Audit manifest JSON
- Locked plan CSV and actual-vs-plan summary CSV (library helpers)

## Manual test checklist

### Prerequisites

- `npm run dev` or production build running
- Browser with local storage (Chrome/Edge recommended)

### Plan → execution flow

1. Open `/targetlock/planner`.
2. Select or create a planned hole; complete draft and publish.
3. Approve the plan (or use an existing approved sample).
4. Mark active and open in TargetLock (handoff checklist).
5. Confirm execution banner visible on `/targetlock`.
6. Add at least one actual survey (beyond collar).
7. Confirm actual-vs-plan strip or Validation panel updates.
8. Switch to **Advanced → Validation**.
9. Confirm **Execution audit** and **Execution package** panels.
10. Export execution TXT, PDF, actual survey CSV, and audit manifest JSON.
11. Return to Planner Review tab for the same hole.
12. Confirm **Execution audit** summary and export actions.
13. (Optional) Mark plan completed; confirm completion snapshot in audit.
14. (Optional) Create revision; confirm lineage in audit report.

### Non-planner holes

1. Load a built-in scenario hole (not created in Planner).
2. Confirm no execution audit or package panels appear.
3. Confirm handover TXT/PDF still work as before.

## Automated smoke

```bash
npm run build && npm start
npm run smoke:execution-gate
```

Seeds a smoke planner hole in `localStorage`, exercises survey add, export buttons, and Planner audit panel.

## Pass / fail gate

**Pass** when all of the following hold:

- Active/completed planner holes show execution audit summary.
- Execution evidence exports complete without error.
- TXT/PDF reports include the execution evidence disclaimer.
- Audit manifest preserves locked plan and approval hashes.
- Non-planner holes behave unchanged.
- `npm run lint` and `npm run test` pass.

**Fail** if:

- Locked plan missing on active hole.
- Actual-vs-plan panel shows `no-locked-plan` after activation.
- Export buttons missing for supported holes.
- Audit events out of chronological order.
- Console errors during smoke run.

## Known limitations

- Evidence is **local browser data only** — no cloud audit trail.
- No electronic signatures or multi-user approval records.
- Not a certified regulatory or survey deliverable.
- No automatic upload to HUB-IQ / SURVEY-IQ.
- No zip bundle — exports are individual files.
- Smoke test seeds synthetic data; field validation still required.

## What TargetLock should not be used for yet

- Certified survey sign-off or regulatory submission
- Authoritative desurvey replacement for contractor databases
- Rig toolface / motor control commands
- Multi-user production workspace without site process
- Live drilling decisions without geologist / supervisor approval

**Disclaimer on all execution exports:**

> Execution evidence generated from local TargetLock data. Verify against official survey database and site records.
