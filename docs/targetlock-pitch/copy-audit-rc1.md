# Copy audit — v2 RC1

Light pass on high-risk user-facing strings. Status **labels** unchanged (e.g. “Correction needed”) so Scenario Lab expectations stay stable; **action sentences** softened to advisory tone.

## Changes made

| Location | Before (tone) | After (tone) |
|----------|-----------------|--------------|
| `recommendation.ts` — On track action | “Continue drilling.” | “Continue per plan and resurvey…” |
| `recommendation.ts` — Watch action | Imperative aim | “For discussion: aim near…” + consider shorter interval |
| `recommendation.ts` — Correction action | “Correct now.” | “A correction is advisable…” + confirm with site procedures |
| `action-plan-copy.ts` + `ActionPlanPanel` | “Driller instruction” / “Aim dip” | “Next interval aim”, recovery loop, DLS feasibility escalation |
| `report.ts` / `report-pdf.ts` | “Recommended next interval” / “Driller guidance” | “Next interval aim” + station note + recovery loop in handover |
| `steering-feasibility.ts` | “Apply the recommended aim…” | “Aim over the next {n} m…” |

## Reviewed — no change required

| Location | Notes |
|----------|-------|
| Classification labels | On track / Watch / Steering recommended / Target at risk — industry-standard bands |
| `branch-toolface.ts` `TOOLFACE_DISCLAIMER` | Planning-only; contractor confirmation |
| `BranchProgramPanel` disclaimer | Planning estimate; geologist + DD contractor |
| Branch PDF disclaimer | Not field instruction |
| `KickoffPlannerPanel` | “Save as daughter plan (draft)” — not operational order |
| Hole package copy | Decision support; validate before field use |

## Reviewed — deferred

| Item | Reason |
|------|--------|
| Steering feasibility “Correct now” action label | Tied to test scenarios and steering-types; change in v2.1 if needed |
| Pitch / guide copy | Guide Center uses advisory walkthrough copy; rig hero uses **Correction advisable** display label |

## Rule for future copy

- Prefer: *consider*, *review*, *escalate*, *for discussion*, *planning estimate*.
- Avoid: *use motor now*, *drill this toolface*, *you must correct*.
