# TargetLock IQ — Pitch pack

Proposal and demo materials for TargetLock IQ **v1.2** (Next.js prototype in `packages/starterkit`, route `/targetlock`).

**Status:** Feature-complete for pilot demo — focus on evidence, feedback, and presentation.

| Document | Purpose |
|----------|---------|
| [current-status.md](./current-status.md) | Shipped vs partial vs gaps (living snapshot) |
| [deck.md](./deck.md) | **11-slide source deck** (v1.2) |
| [demo-runbook.md](./demo-runbook.md) | **5-minute live demo script** (Guide tour) |
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
npm run test                 # 79 tests
npm run generate:samples     # Regenerate handover TXT/PDF
npm run capture:screenshots  # Partial screenshot automation
```

**Live demo:** http://localhost:3000/targetlock  

**Suggested v1.2 commit:**

```powershell
git add docs/targetlock-pitch packages/starterkit
git commit -m "TargetLock IQ v1.2: steering feasibility and recovery assumptions"
```

**Reference demo (static):** `targetlock-iq-demo/` at repository root.
