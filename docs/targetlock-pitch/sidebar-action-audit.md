# TargetLock IQ — Sidebar Action Contract Audit

**Route:** `/targetlock` · **App:** `packages/starterkit`  
**Audit date:** 2026-06-05  
**Scope:** Operational sidebar only (setup, data, input). Workspace actions are out of scope.

**Automated coverage:** `sidebar-input-validation.test.ts`, `sidebar-import-undo.test.ts`, `hole-library-reset.test.ts`, `csv-import-assistant.test.ts`, `hole-library.test.ts`, `compute.test.ts`, `recommendation.test.ts`

**Verification (2026-06-05):** `npm run test` — 184 passed · `npm run lint` — pass · `npm run build` — pass

---

## Summary

| Result | Detail |
|--------|--------|
| Pilot-ready | **Yes** — sidebar actions match labels, destructive flows confirm, invalid input blocked, reset-active-hole preserves multi-hole library |
| Blocker fixed | Reset active hole previously cleared entire library; now scoped via `resetActiveHoleInLibrary` |
| Residual risk | Browser `window.confirm` dialogs; branch leg import picker (workspace) has no second confirm |

---

## Action inventory

| Section | Action | Expected behavior | Disabled / confirm | Feedback | Tested | Notes |
|---------|--------|-------------------|-------------------|----------|--------|-------|
| Advanced — Hole details | Hole ID / name input | Updates active hole name; persists on refresh | Always enabled | Persists silently | Manual | No per-keystroke history |
| Advanced — Hole details | Site / project input | Updates site label on active hole; exports/reports | Always enabled | Persists silently | Manual | |
| Advanced — Hole library | Select saved hole | Switches active hole; loads its surveys/target/history | N/A | `dataMessage` + history | Auto | `hole-library.test.ts` |
| Advanced — Hole library | New test hole | Saves current hole; adds sample plan/surveys; activates new hole | No confirm | `dataMessage` + history | Auto | |
| Advanced — Hole library | New blank hole | Saves current; adds empty hole; activates | No confirm | `dataMessage` + history | Auto | |
| Advanced — Hole library | Duplicate | Copies active hole (history cleared on copy) | No confirm | `dataMessage` + history | Auto | `hole-library.test.ts` |
| Advanced — Hole library | Delete | Removes active hole; switches if needed | Disabled if 1 hole; confirm hole name | `dataMessage` + history | Auto | |
| Hole data | Upload Hole plan | Opens CSV assistant for plan | Always enabled | Modal validation | Auto | `csv-import-assistant.test.ts` |
| Hole data | Upload Survey results | Opens CSV assistant for actuals | Always enabled | Modal validation | Auto | |
| Hole data | Download CSV test pack | Downloads zip of sample CSVs | Always enabled | Browser download | Manual | |
| Hole data | CSV format help | Expand/collapse templates list | Keyboard via `<details>` | N/A | Manual | |
| Hole data | Template links | Static download of CSV templates | N/A | Browser download | Manual | |
| Hole data | Load sample hole | Replaces active hole plan + actuals with demo | Confirm overwrite | `dataMessage` + history | Manual | |
| Hole data | Export TXT | Handover text report | Disabled without recommendation | `dataMessage` + history | Auto | `compute.test.ts` gate |
| Hole data | Export PDF | Handover PDF | Disabled without recommendation | `dataMessage` or error | Manual | |
| Hole data | Reset active hole | Clears surveys/target/corridor/history for **this hole only** | Confirm; library preserved | `dataMessage` + history | Auto | `hole-library-reset.test.ts` |
| Hole data | Reset all local data | Clears all holes + branch programs in browser | Double confirm | `dataMessage` | Manual | |
| Hole data | Undo import | Restores pre-import plan/actual/corridor | Shown after import; confirm | `dataMessage` + history | Auto | `sidebar-import-undo.test.ts` |
| Add survey | MD / Dip / Azimuth | Manual entry fields | Add disabled until valid | `manualMessage` | Auto | `sidebar-input-validation.test.ts` |
| Add survey | Fill from action plan | Copies aim from recommendation | Disabled without recommendation | `manualMessage` | Manual | |
| Add survey | Add survey | Append or replace survey at MD | Disabled until valid; confirm on replace | `manualMessage` + history | Auto | |
| Add survey | Undo last survey | Removes latest actual (keeps collar) | Disabled if ≤1 survey | `manualMessage` + history | Manual | |
| Advanced — Target setup | Target MD / E / N / D | Updates target; sanitized (no NaN) | Always enabled | Persists silently | Auto | `sanitizeTargetField` |
| Advanced — Target setup | Tolerance / Max DLS / Next interval | Clamped > 0 | Always enabled | Persists silently | Auto | |
| Advanced — Target setup | Use planned target | Sets E/N/D from plan at target MD | Disabled if no plan station | History on success | Auto | `hasPlanTargetAtMd` |
| Advanced — Target setup | Plan corridor fields | Corridor tolerances; sanitized | Always enabled | Persists silently | Auto | `sanitizePlanCorridorField` |

---

## Manual refresh checklist

After code changes, verify in one browser profile:

1. Rename hole + site → refresh → values restored on active hole.
2. Two holes → reset active → sibling hole still listed.
3. Import plan → undo import → prior surveys restored.
4. Invalid MD/dip/azi → Add survey stays disabled.
5. Export TXT/PDF disabled until sample loaded.

---

## Related docs

- [rc1-general-audit.md](./rc1-general-audit.md) — RC1 readiness (see sidebar row)
- [release-candidate-checklist.md](./release-candidate-checklist.md) — Pilot gate
- [internal-testing-checklist.md](./internal-testing-checklist.md) — Full app pass
