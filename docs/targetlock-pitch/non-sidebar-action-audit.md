# TargetLock IQ — Non-Sidebar Action Contract Audit

**Route:** `/targetlock` · **App:** `packages/starterkit`  
**Audit date:** 2026-06-05  
**Scope:** Workspace, top bar, modals, Advanced tabs, charts, and branch program (not the operational sidebar rail). Sidebar-opened modals are documented where they affect workspace state.

**Automated coverage:** `workspace-action-contract.test.ts`, `guide-mode.test.ts`, `guide-flows.test.ts`, `approval.test.ts`, `test-scenarios.test.ts`, `synthetic-hole-builder.test.ts`, `branch-program-library.test.ts`, `branch-report-data.test.ts`, `validation.test.ts`, `chart-hit.test.ts`, `capability-assumptions.test.ts`, `survey-tool-profile.test.ts`, `hole-package.test.ts`

**Verification:** Run `npm run test`, `npm run lint`, `npm run build` from repo root after changes; record counts in footer below.

---

## Summary

| Result | Detail |
|--------|--------|
| Pilot-ready | **Yes** — non-sidebar destructive actions confirm, workspace feedback visible, misleading demo controls removed |
| Blockers fixed | Scenario loads confirm; guide exit/restart confirm when demo loaded; clear history confirms; CSV actual template download; invalid-import card no longer offers fake load; branch PDF gated when plan incomplete |
| Residual risk | Browser `window.confirm`; kickoff planner field edits session-only until daughter save; validation reference CSV not persisted; `window.confirm` on import-target cancel only when undo snapshot exists |

---

## Action inventory

| Area | Action / control | Expected result | Disabled / confirm | Feedback | Tested | Notes |
|------|------------------|-----------------|---------------------|----------|--------|-------|
| **Top bar** | Guide | Opens Guide Center; shows step progress when active | Always enabled | Guide banner + top bar label | Auto | `guide-mode.test.ts` |
| Top bar | Scenario lab | Opens Scenario Lab modal | Always enabled | Workspace + sidebar status after load | Auto | Confirm on load |
| Top bar | Simple / Advanced | Toggles display mode only; data preserved | Always enabled | Tab visibility | Manual | Guide may set mode per step |
| Top bar | Simulated badge | Shows when `activeScenario` set | Display only | Tooltip = scenario name | Manual | Cleared on real import |
| Top bar | Status badge | Shows classification or “No data” | Display only | `aria-live` | Auto | `recommendation.test.ts` |
| Top bar | Workspace status | Shows latest `dataMessage` in main column | When message set | `role="status"` polite | Manual | Mirrors sidebar hole-data message |
| **Guide Center** | Open / close / Escape | Center opens/closes; backdrop safe | No confirm on close | N/A | Manual | |
| Guide Center | Select flow + Start guide | Backs up snapshot; applies step 0 UI | Start disabled without flow | Guide banner | Auto | No survey mutation |
| Guide Center | Restart / Exit guide | Restores pre-tour snapshot | Confirm if `demoLoaded` | Banner clears | Auto | `workspace-action-contract` copy |
| **Guide tour** | Previous | Step back | Disabled at step 0 | Tour panel | Manual | |
| Guide tour | Next / Finish | Advances or exits on last step | Confirm exit if demo loaded | N/A | Manual | |
| Guide tour | Restart / Exit | Same as Center | Confirm if demo loaded | N/A | Auto | |
| Guide tour | Open relevant tab | Sets Advanced tab from step | Enabled per step | Tab switch | Auto | `guide-flows.test.ts` |
| Guide tour | Load demo | Loads built-in or branch scenario | Confirm before load | Workspace status | Manual | Sets `demoLoaded` |
| **Scenario Lab** | Open / close / Escape | Modal toggles; backdrop safe | No confirm on close | N/A | Manual | |
| Scenario Lab | Load built-in | Replaces active hole test data | Confirm | Workspace + sidebar status | Auto | `canLoadBuiltInScenario` |
| Scenario Lab | Invalid-import card | Explains CSV test pack path | No load button | Footer download hint | Auto | Does not call loader |
| Scenario Lab | Load branch preset | Mother + branch program | Confirm | Status + opens Branch tab | Auto | |
| Scenario Lab | Custom preview | Shows station counts | Always enabled | Inline preview text | Auto | `validateSyntheticHoleParams` |
| Scenario Lab | Generate custom | Synthetic hole load | Confirm + valid params | Disabled if invalid | Auto | |
| Scenario Lab | Download CSV test pack | Zip download | Always enabled | Browser download | Manual | |
| **CSV assistant** | Open from sidebar | Plan or actual import wizard | N/A | In-modal validation | Auto | `csv-import-assistant.test.ts` |
| CSV assistant | Download template | Correct plan vs survey CSV | Always enabled | Download | Auto | Fixed `simpleSurvey` for actual |
| CSV assistant | Import stations | Writes to hole after acks | `canImport` gate | In-modal + status | Auto | Sidebar undo after import |
| **Import target picker** | Select leg | Finishes import to daughter/mother | No second confirm | Status message | Manual | Opened from branch CSV flow |
| Import target picker | Cancel | Aborts pending import | Confirm if undo snapshot | Footer note + status | Auto | Clears `importUndo` |
| **Trajectory** | 2D canvases | Hover tooltips on stations | N/A | Tooltip | Auto | `chart-hit.test.ts` |
| Trajectory | 3D zoom / presets / reset | Local view state | Always enabled | N/A | Manual | Not persisted |
| Trajectory | Surveys table | Lists actual stations | Read-only | Empty tbody if none | Manual | |
| **Steering** | Show / hide details | Expands interval table | N/A | Helper if no steering | Manual | |
| **QA/QC** | Show all / fewer | Expands flag list | N/A | Empty-state copy | Auto | `qa.test.ts` |
| **Decisions** | Continue … Stop hole | One history entry each | Disabled without recommendation | History panel | Auto | `approval.test.ts` |
| Decisions | Notes | Appended to history detail when non-empty | With decision buttons | History | Auto | Empty notes omitted |
| Decisions | Shorten interval | Halves `nextInterval` only | Disabled without reco | Target field updates | Auto | |
| Decisions | Clear history | Empties decision log for hole | Confirm | Workspace status | Auto | Surveys unchanged |
| **Validation** | Sign-off / clear | Records validator; stale on edit | Name min 2 chars | Pill + history | Auto | `validation.test.ts` |
| Validation | Reference CSV compare | Session comparison | File input | Inline message | Manual | Not persisted |
| **Setup** | Reset assumptions | Defaults for hole | Confirm; disabled if default | Workspace status | Manual | |
| Setup | Assumption ranges | Normalized on change | Always enabled | Stale sign-off | Auto | `capability-assumptions.test.ts` |
| Setup | Survey tool profile | Normalized profile | Always enabled | Assessment in sidebar | Auto | `survey-tool-profile.test.ts` |
| Setup | Export / import package | JSON backup | Import confirm | Status + history | Auto | `hole-package.test.ts` |
| **Branch program** | Start program | Creates mother program | Mother role only | Persisted library | Auto | `branch-program-library.test.ts` |
| Branch | Add / remove target | Target library updates | Sanitized coords | Persisted | Auto | `sanitizeBranchCoord*` |
| Branch | Kickoff planner + save draft | Daughter from actual mother | Save needs target + MD | Workspace status | Auto | `kickoffStationFromMother` |
| Branch | Set active daughter | Switches viewing leg | Always enabled | List highlight | Manual | |
| Branch | Approval / status | Snapshot + stale detection | Approve needs kickoff | Stale banner | Auto | `branch-report-data.test.ts` |
| Branch | Export branch PDF | Downloads PDF | Disabled until plan + kickoff | Helper when disabled | Auto | `branchExportReadiness` |
| Branch | Program map charts | Mother/daughter overlay | N/A | Legend | Manual | |
| **Charts (simple)** | KPI / action plan | Read-only from recommendation | N/A | Empty helpers | Auto | |
| **Modals** | Guide / Scenario / CSV | Escape where safe | Destructive loads confirm | Per modal | Manual | |
| **Accessibility** | Top bar + modals | Focusable controls | `aria-label` on key actions | Live regions | Manual | See checklist below |

---

## Cross-flow (sidebar opens, workspace effect)

| Action | Notes |
|--------|-------|
| Upload plan / survey → CSV assistant | Documented in [sidebar-action-audit.md](./sidebar-action-audit.md); import undo in sidebar |
| Branch multi-leg import → target picker | Workspace modal; cancel confirm when undo exists |

---

## Remaining manual browser checks before pilot

1. Load built-in scenario → confirm dialog → workspace status shows expected outcome text.
2. Guide → load demo → Exit → confirm → prior hole restored; banner accurate.
3. Decisions → Clear history → confirm → surveys still present.
4. Scenario Lab → Custom → empty hole name → Generate disabled with error.
5. Branch program → export PDF disabled until daughter draft saved.
6. CSV assistant (survey) → Download template → file matches survey columns.
7. Import target picker → Cancel with pending undo → confirm → message shown.
8. Tab through top bar, Scenario Lab footer, Guide tour controls (keyboard).
9. Narrow viewport: Guide tour panel scroll; 3D chart controls reachable.
10. Plan-only / actual-only / both / no data chart tooltips (no console errors).
11. Simple vs Advanced: KPIs and branch strip visibility.
12. Reset assumptions (Setup) → confirm → Validation tab shows unvalidated.

---

## Related docs

- [sidebar-action-audit.md](./sidebar-action-audit.md) — Sidebar rail contract
- [rc1-general-audit.md](./rc1-general-audit.md) — RC1 readiness (workspace row links here)
- [release-candidate-checklist.md](./release-candidate-checklist.md) — Pilot gate

---

## Verification footer

_Update after `npm run test`, `npm run lint`, `npm run build`:_

| Command | Result |
|---------|--------|
| `npm run test` | 195 passed (34 files) · 2026-06-05 |
| `npm run lint` | pass (`tsc --noEmit`) · 2026-06-05 |
| `npm run build` | pass (Next.js 16) · 2026-06-05 |
