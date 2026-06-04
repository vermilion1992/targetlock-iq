# TargetLock IQ v2 RC1 — Release candidate checklist

**Version under test:** TargetLock IQ v2 RC1  
**App route:** `/targetlock` (`packages/starterkit`)  
**Purpose:** Gate pilot handout — confirm workflows, persistence, exports, and recovery before external testers.

**Related:** [final-pilot-gate.md](./final-pilot-gate.md) (automated gate report), [rc1-general-audit.md](./rc1-general-audit.md) (RC1 audit report), [internal-testing-checklist.md](./internal-testing-checklist.md) (v1.3 detail), [branch-program.md](./branch-program.md), [test-scenarios.md](./test-scenarios.md), [deployment-railway.md](./deployment-railway.md)

---

## Automated gate (required before manual pass)

```bash
cd packages/starterkit
npm run test
npm run lint
npm run build
npm start   # optional: npm run smoke:pilot (separate terminal)
```

| Step | Done |
|------|------|
| All tests pass (213+) | ☐ |
| TypeScript clean (`npm run lint`) | ☐ |
| Production build succeeds | ☐ |
| Automated gate doc current ([final-pilot-gate.md](./final-pilot-gate.md)) | ☐ |

---

## 1. Core hole workflow

| Step | Expected | Done |
|------|----------|------|
| Fresh load shows sample or saved library | No infinite spinner | ☐ |
| Load sample hole | Plan + actual populate | ☐ |
| Add manual survey | KPIs and action plan update | ☐ |
| Import plan CSV | Mother/active hole plan updates | ☐ |
| Import actual CSV | Correct hole when branch program exists (picker) | ☐ |
| Browser refresh | Same holes, surveys, targets persist | ☐ |
| Export TXT handover | Downloads; scenario name if loaded | ☐ |
| Export PDF handover | Downloads; matches on-screen KPIs | ☐ |

---

## 2. Branch program workflow

| Step | Expected | Done |
|------|----------|------|
| Scenario lab → Branch program preset | Mother + daughters in library | ☐ |
| Start branch program on mother | Targets/daughters sections appear | ☐ |
| Add / edit / remove target | Persists after refresh | ☐ |
| Kickoff planner ranks MDs | Mother + sibling separation columns | ☐ |
| Save daughter from kickoff | Daughter hole in library; branch table row | ☐ |
| Set active daughter | Simple strip shows parent, kickoff, target | ☐ |
| Approve daughter | Snapshot stored; history entry | ☐ |
| Change recovery assumptions | Stale approval banner | ☐ |
| Export branch plan PDF | Parent/kickoff line in header | ☐ |
| Daughter chart overlay | Muted mother + siblings when on daughter | ☐ |

---

## 3. Hole package backup (JSON)

| Step | Expected | Done |
|------|----------|------|
| Advanced → Setup → Export full hole package | JSON downloads | ☐ |
| Import package on clean profile | All holes, branch program, approvals restored | ☐ |
| Import confirms overwrite | User must confirm | ☐ |

---

## 4. Recovery and resilience

| Step | Expected | Done |
|------|----------|------|
| Corrupt storage (devtools: invalid JSON in library key) | Warning screen; no hang | ☐ |
| Load sample from corrupt screen | App usable | ☐ |
| Reset all local data | Clears storage; sample loads | ☐ |
| Error boundary (optional: force render error in dev) | Reload / reset / sample actions | ☐ |
| Version label visible | `TargetLock IQ v2 RC1` in sidebar | ☐ |

---

## 5. Copy and advisory tone (spot check)

| Check | Done |
|-------|------|
| Action plan avoids imperative rig commands | ☐ |
| Branch / toolface disclaimers present | ☐ |
| Exports state decision support / site validation | ☐ |
| See [copy-audit-rc1.md](./copy-audit-rc1.md) | ☐ |

---

## 6. Math validation (reference)

| Check | Done |
|-------|------|
| Golden tests pass (`math-validation.test.ts`) | ☐ |
| Manual spot-check vs spreadsheet where noted in [math-validation/README.md](./math-validation/README.md) | ☐ |

---

## 7. Pilot deployment notes

| Item | Notes | Done |
|------|-------|------|
| Public Railway URL | Data stays in each tester’s browser only | ☐ |
| No in-app auth in RC1 | Do not treat URL as access control | ☐ |
| Testers export JSON backup before risky experiments | ☐ |
| Disclaimer | Not for live drilling decisions without site validation | ☐ |

---

## Known limitations (RC1)

- Data is per browser / device (`localStorage`); not shared between users.
- No live HUB-IQ / SURVEY-IQ API — CSV import only.
- Branch kickoff always from **actual** mother surveys, not plan-only.
- Toolface and branch plans are **planning estimates** — not field instructions.
- No private deploy or password gate in this RC build.

---

## Sign-off

| Role | Name | Date | Pass |
|------|------|------|------|
| Engineering | | | ☐ |
| Product / pilot lead | | | ☐ |
