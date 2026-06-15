# TargetLock Hole Planner — Institutional Workflow

Planning support only. Not certified anti-collision. Verify all coordinates and exports before field use.

## Workbench areas

1. **Command Center** — program selector, readiness score, status counts, needs-attention list, primary actions.
2. **Program** — relationship tree, coordinate metadata, program summary.
3. **Map** — spatial planning board with mother/daughter links and QA clearance highlights.
4. **QA** — clearance, drillability, program QA settings.
5. **Create** — guided wizard: program identity → plan type → collar/kickoff → target → constraints → generate → review & save.
6. **Review** — single decision page: readiness, QA, approval, handoff, execution state, revisions.
7. **Package** — program and hole exports (CSV, manifest, PDF/TXT).

## Typical workflow

1. Open `/targetlock/planner` → Command Center.
2. Load **RC2 Institutional Demo Program** or create/import a program.
3. Run **QA** — resolve or acknowledge warnings.
4. **Review** → approve plans with name/role.
5. **Package** → export program package for contractor/geologist review.
6. **Review** → activate approved plan → opens `/targetlock` execution dashboard.
7. Record actual surveys on dashboard; export execution evidence from Validation tab.

### Branch program tab (execution)

When a program is planner-managed, the dashboard **Branch program** tab is read-only for targets, daughters, and branch approvals. Use it during drilling for kickoff ranking from actual mother surveys, program maps, and switching the active daughter leg. Ad-hoc branch programs (Scenario lab, no planner metadata) keep the full dashboard branch workflow.

## Status model

| Status | Meaning |
|--------|---------|
| draft | In progress |
| planned | Published, awaiting approval |
| approved | Signed off, ready to activate |
| active | Locked execution in progress |
| completed | Drilling finished |
| stale | Approval out of date (display overlay) |
| blocked | QA hard errors (display overlay) |

Protected plans (approved/active/completed) require **Create revision** to edit.

## Local storage

All data persists in browser localStorage unless deployed with a backend later.
