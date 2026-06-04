# TargetLock IQ — Pitch pack

Proposal and demo materials for TargetLock IQ **v2 RC1** (Next.js prototype in `packages/starterkit`, route `/targetlock`).

**Status:** RC1 pilot-ready — automated gate passed; focus on field feedback and evidence.

| Document | Purpose |
|----------|---------|
| [final-pilot-gate.md](./final-pilot-gate.md) | **Final automated pilot gate** — build, smoke, exports, verdict |
| [current-status.md](./current-status.md) | Shipped vs partial vs gaps (living snapshot) |
| [deck.md](./deck.md) | **11-slide source deck** (v1.2) |
| [demo-runbook.md](./demo-runbook.md) | **5-minute live demo script** (Guide Center) |
| [pilot-testing-kit/guide-center.md](./pilot-testing-kit/guide-center.md) | **In-app walkthroughs** (quick · standard · branch) |
| [pilot-testing-kit/known-limitations.md](./pilot-testing-kit/known-limitations.md) | RC1 known limitations for pilots |
| [release-candidate-checklist.md](./release-candidate-checklist.md) | RC1 manual + automated pilot gate checklist |
| [rc1-general-audit.md](./rc1-general-audit.md) | **RC1 general audit** — pilot readiness report |
| [sidebar-action-audit.md](./sidebar-action-audit.md) | Sidebar action contract audit |
| [non-sidebar-action-audit.md](./non-sidebar-action-audit.md) | Workspace / modal action audit |
| [usability-test-runbook.md](./usability-test-runbook.md) | **20-minute first-user review** — watch one user, capture must-fix vs nice-to-improve vs future |
| [field-feedback-form.md](./field-feedback-form.md) | Driller/geologist review leave-behind form |
| [validation-plan.md](./validation-plan.md) | Math vs reference desurvey tools + historical holes |
| [field-validation-checklist.md](./field-validation-checklist.md) | **Pre-field validation checklist** — conventions, desurvey, assumptions, sign-off |
| [test-scenarios.md](./test-scenarios.md) | **Built-in test scenario library** — 7 synthetic holes for demos and user testing |
| [internal-testing-checklist.md](./internal-testing-checklist.md) | **v1.3 internal pilot gate** — structured pass/fail checklist before wider testing |
| [executive-summary.md](./executive-summary.md) | One-page overview for decision-makers |
| [pilot-proposal.md](./pilot-proposal.md) | Scoped pilot with success criteria |
| [screenshot-checklist.md](./screenshot-checklist.md) | Capture list for deck and leave-behind |
| [steering-feasibility.md](./steering-feasibility.md) | Recovery logic and assumptions |
| [feature-roadmap.md](./feature-roadmap.md) | v1 → commercial product phases |
| [branch-program.md](./branch-program.md) | **v2 Branch Program** — mother/daughter holes, kickoff, targets (Phase 1 read-only) |
| [commercial-model-options.md](./commercial-model-options.md) | Licensing and pricing structures |
| [risk-and-validation-plan.md](./risk-and-validation-plan.md) | Broader operational and commercial risks |
| [deployment-railway.md](./deployment-railway.md) | **Railway test deploy** — monorepo settings, public URL, localStorage note |
| [hub-iq-import.md](./hub-iq-import.md) | HUB-IQ / SURVEY-IQ CSV columns and templates |
| [deck-outline.md](./deck-outline.md) | Slide structure summary (maps to screenshots) |
| [demo-script.md](./demo-script.md) | Legacy v1.1 demo script (see demo-runbook) |

**Artifacts**

| Folder | Purpose |
|--------|---------|
| [screenshots/](./screenshots/) | Deck captures — see [screenshots/README.md](./screenshots/README.md) |
| [samples/](./samples/) | Example TXT/PDF handovers with recovery sections |

**Commands** (from `packages/starterkit`):

```bash
npm run dev                  # Live demo
npm run test                 # 213 tests (37 files)
npm run lint                 # tsc --noEmit
npm run build                # Production standalone build
npm start                    # Production server (0.0.0.0:8080)
npm run smoke:pilot          # Playwright RC1 smoke (server must be running)
npm run generate:samples     # Regenerate handover TXT/PDF
npm run capture:screenshots  # Partial screenshot automation
```

**Live demo:** http://localhost:3000/targetlock (dev) or http://localhost:8080/targetlock (after `npm start`)

**Reference demo (static):** `targetlock-iq-demo/` at repository root.
