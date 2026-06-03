# TargetLock IQ — Pitch deck (source)

**Format:** 11 slides · copy into PowerPoint or Google Slides  
**Audience:** Exploration drilling managers, operations superintendents, IMDEX stakeholders  
**Version:** v1.2 pilot-ready  
**App:** http://localhost:3000/targetlock · Sample hole **DDH-0247**  
**Assets:** [screenshots/](./screenshots/) · [samples/](./samples/) · [demo-runbook.md](./demo-runbook.md)

---

## Slide 1 — Title

**TargetLock IQ**  
Survey-to-decision at the rig

- Diamond drilling trajectory **decision support**  
- v1.2 · local-first · browser-based  
- Decision support only — site procedures and geologist/supervisor approval apply  

**Visual:** `screenshots/01-simple-dashboard.png`

**Speaker note:** Open with the rig-floor question: “The survey is in — what do we drill next, and can we still recover to target?”

---

## Slide 2 — The problem

**Every survey is a decision point. Too often, the decision is late.**

- Plan vs actual comparison happens off the rig — spreadsheet, email, or waiting for geology  
- **Projected miss at target** is discussed after extra metres are drilled  
- Recovery options (natural correction, motor, wedge) are debated inconsistently  
- Shift change loses context — what was recommended vs what was done  

**Visual:** Plan/section charts diverging, or `06-pitch-correction-step.png`

**Speaker note:** Tie to exploration cost: metres, rig time, and intercept risk on deep holes.

---

## Slide 3 — The solution

**One screen: plan, actual, projected miss, next aim — and recovery guidance**

| Input | Output |
|-------|--------|
| Planned trajectory + actual surveys | Offset from plan at current MD |
| Target (MD, collar-relative E/N/D) | Projected target miss if uncorrected |
| Max DLS + survey interval | Next-interval **dip** and **azimuth** aim |
| Planned vs actual interval behaviour | **Recovery guidance** — action, method, escalation |

Minimum curvature desurvey · QA/QC flags · TXT/PDF shift handover

**Visual:** `01-simple-dashboard.png` with Recovery guidance panel visible

**Speaker note:** Not a desurvey replacement — decision support validated against site tools where required.

---

## Slide 4 — Projected miss (why it matters)

**Show intercept risk before TD**

- **Projected miss** — distance to target if the hole continues on current trend  
- **Miss vector** (E / N / D) — direction of the error  
- **Offset from plan** — deviation from planned trajectory at current MD  
- Status: On track · Watch · Correction needed · Target risk  

**Visual:** `02-simple-projected-miss.png` or pitch step *Projected target miss*

**Speaker note:** This is the conversation that used to happen hours later — now at the survey station.

---

## Slide 5 — Driller aim (next interval)

**What to hold for the next 30 m (or site interval)**

- Recommended **aim dip** and **aim azimuth**  
- Dogleg limit respected — correction options over 15 / 30 / 60 m and to target  
- Clear instructions: e.g. **Lift 0.8°** · **Swing right 2.1°**  

**Visual:** `03-recommendation-aim.png` or crop from correction walkthrough step

**Speaker note:** Same language every survey — reduces miscommunication on night shift.

---

## Slide 6 — Action plan (Simple mode) ★ hero

**One panel answers “what do I do next?” — without engineering overload**

| Field | Example |
|-------|---------|
| Current action | Correct now |
| Best method | “Parameter correction may be sufficient if ground and rig allow.” |
| Driller instruction | Drop 1.1°, swing left 2.0° |
| Aim / DLS / miss | Aim dip/azi · DLS required vs limit · projected miss |
| Escalate by | Review by 405 m if the next survey does not improve |

- Tentative wording — not “use motor now”  
- Confidence: High / Medium / Low  

**Visual:** `09-action-plan.png` (Guide step *Recovery guidance*)

**Speaker note:** Smart underneath, calm on top. The driller gets a clear next move; the “why” lives in Advanced.

---

## Slide 7 — Why & how realistic (Advanced tabs)

**Advanced is grouped, not a wall: Trajectory · Steering feasibility · QA/QC · Decisions · Setup**

- **Steering feasibility** verdict summary: can natural/parameter recover? motor/Navi or DeviDrill review? wedge/branch? point of no return  
- **Show details** for planned-vs-actual interval tables, rejoin DLS, method assumptions  
- **Setup / assumptions** holds **Recovery capability assumptions** — editable per hole, reset to defaults  

**Visual:** `10-steering-feasibility.png` · `11-capability-assumptions.png`

**Speaker note:** Same hole, technical detail on demand. Assumptions are site-specific — ground, rig, tools, contractor. Reports include the active assumption summary.

---

## Slide 8 — Governance & multi-hole

**Same product — rig floor and office**

- **Survey QA/QC** — interval, DLS, plan offset, recovery, target risk  
- **Supervisor decision** — continue, correct naturally, shorten interval, steer, stop hole  
- **Hole library** — multiple holes on one device (program / daughter holes)  
- **Decision history** — surveys, recommendations, supervisor actions, exports  

**Visual:** `02-advanced-dashboard.png` · `04-supervisor-decision.png` · `03-hole-library.png`

**Speaker note:** Advanced mode is the same hole — more panels for review, not a different SKU.

---

## Slide 9 — Technical confidence

**2D and 3D trajectory views**

- Plan view and vertical section — plan vs actual  
- Deviation from plan chart  
- **3D trajectory preview** — drag to rotate (Advanced)  

**Visual:** `05-trajectory-3d.png`

**Speaker note:** 3D is preview for spatial context; certified desurvey remains the site authority.

---

## Slide 10 — Shift handover

**TXT and PDF for crew change — including recovery basis**

- Status, MD, dip/azi, projected miss, aim, QA flags, correction table  
- **Recovery guidance** section  
- **Recovery capability assumptions** (this hole)  
- Hole name and site/project on report  
- Recent decision history included  

**Sample files:** [samples/DDH-0247-handover-md390.pdf](./samples/DDH-0247-handover-md390.pdf) · [.txt](./samples/DDH-0247-handover-md390.txt)

**Visual:** `07-export-handover-buttons.png` · `08-pdf-handover-preview.png`

**Speaker note:** Export at MD ~390 m on sample data for consistent deck narrative.

---

## Slide 11 — Pilot & next steps

**Proposed: 4–8 week site pilot (1–2 deep exploration holes)**

| Objective | Indicative success |
|-----------|-------------------|
| Survey-to-decision time | ≥ 30% reduction on routine stations |
| Handover discipline | Export on trial surveys |
| User acceptance | ≥ 3/4 roles “would use again” |
| Recovery wording | Driller/geologist sign-off on guidance phrasing |

**v1.2 shipped:** Steering feasibility · recovery guidance · capability assumptions · multi-hole library · HUB-IQ CSV templates · supervisor log · 79 automated tests  

**After pilot:** Live HUB-IQ/SURVEY-IQ · formal sign-off · offline sync · hosted deployment  

**Visual:** Text + QR or URL to demo · contact / pilot champion  

**Disclaimer (footer on all slides):**  
*TargetLock IQ provides decision support only. Steering feasibility depends on site conditions, tool capability, drilling contractor, and geologist/supervisor approval. Verify all recommendations against site procedures, independent desurvey where required, and operational sign-off.*

---

## Appendix — Asset index

| File | Use |
|------|-----|
| `01-simple-dashboard.png` | Slides 1, 3 |
| `02-simple-projected-miss.png` | Slide 4 |
| `03-recommendation-aim.png` | Slide 5 |
| `09-action-plan.png` | Slide 6 |
| `10-steering-feasibility.png` | Slide 7 (Steering tab) |
| `11-capability-assumptions.png` | Slide 7 (Setup tab) |
| `02-advanced-dashboard.png` | Slides 8, 9 |
| `03-hole-library.png` | Slide 8 |
| `04-supervisor-decision.png` | Slide 8 |
| `05-trajectory-3d.png` | Slide 9 |
| `06-pitch-correction-step.png` | Slides 2, 5 (fallback) |
| `07-export-handover-buttons.png` | Slide 10 |
| `08-pdf-handover-preview.png` | Slide 10 |

**Regenerate screenshots:** `npm run dev` in `packages/starterkit`, then `npm run capture:screenshots`. See [screenshots/README.md](./screenshots/README.md).

**Related:** [demo-runbook.md](./demo-runbook.md) · [validation-plan.md](./validation-plan.md) · [field-feedback-form.md](./field-feedback-form.md) · [executive-summary.md](./executive-summary.md) · [pilot-proposal.md](./pilot-proposal.md)
