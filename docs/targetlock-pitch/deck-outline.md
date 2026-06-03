# TargetLock IQ — Deck outline (11 slides)

Professional pitch deck structure for exploration drilling audiences. Full copy: [deck.md](./deck.md). Captures: [screenshots/README.md](./screenshots/README.md).

**Presenter flow:** [demo-runbook.md](./demo-runbook.md) (10-step **Guide** tour in the app).

---

| Slide | Title | Message | Screenshot(s) | Guide step |
|-------|-------|---------|---------------|------------|
| 1 | Title | TargetLock IQ — survey-to-decision at the rig | `01-simple-dashboard.png` | — |
| 2 | Problem | Survey arrives; decision is delayed | Charts diverging / `06-pitch-correction-step.png` | Context |
| 3 | Solution | Plan, miss, aim, recovery — one screen | `01-simple-dashboard.png` | Steps 1–2 |
| 4 | Projected miss | Intercept risk before TD | `02-simple-projected-miss.png` | Step 4 |
| 5 | Driller aim | Next-interval dip/azi | `03-recommendation-aim.png` | Step 5 |
| 6 | Recovery guidance | What to do next (Simple) | `09-recovery-guidance.png` | Step 6 ★ |
| 7 | Steering feasibility | Why + assumptions (Advanced) | `10-steering-feasibility.png`, `11-capability-assumptions.png` | Step 7 |
| 8 | Governance | QA, supervisor, hole library, history | `02-advanced`, `04-supervisor`, `03-hole-library` | Step 7–8 |
| 9 | Technical view | 2D charts + 3D preview | `05-trajectory-3d.png` | Advanced |
| 10 | Handover | TXT/PDF with recovery sections | `07-export`, `08-pdf-handover-preview` | Step 9 |
| 11 | Pilot / next steps | 4–8 week pilot, v1.2 shipped | Text from [pilot-proposal.md](./pilot-proposal.md) | — |

---

## Build checklist

- [ ] Required shots per [screenshots/README.md](./screenshots/README.md)
- [ ] Sample TXT + PDF in `samples/` (regenerate: `npm run generate:samples`)
- [ ] Disclaimer on final slide
- [ ] Field feedback form ready for post-demo ([field-feedback-form.md](./field-feedback-form.md))
- [ ] Validation plan assigned before site pilot ([validation-plan.md](./validation-plan.md))

---

## Related

| Document | Use |
|----------|-----|
| [demo-runbook.md](./demo-runbook.md) | 5-minute live script |
| [validation-plan.md](./validation-plan.md) | Math / desurvey checks |
| [field-feedback-form.md](./field-feedback-form.md) | Driller/geologist review |
