# TargetLock IQ — Demo runbook (5 minutes)

**Audience:** Drilling superintendent, exploration manager, geologist, IMDEX stakeholder  
**Version:** v1.2  
**Format:** Live browser demo at `/targetlock` using the in-app **Guide** (10-step tour)  
**Backup:** Static demo `targetlock-iq-demo/index.html` if Next app unavailable  

---

## Before you start

| Check | Action |
|-------|--------|
| App running | `npm run dev` in `packages/starterkit` |
| URL | http://localhost:3000/targetlock |
| Browser | Zoom 100%; close unrelated tabs |
| Tour | Click **Guide** → **Start tour** (or **Guide** again if restarting) |
| Data | Tour loads sample data only — banner: *not saved to your hole* |
| Export | Confirm PDF download is not blocked |
| Backup | Have [samples/DDH-0247-handover-md390.pdf](./samples/DDH-0247-handover-md390.pdf) open if live export fails |

Optional: open **Guide → Overview** first for executive audiences (45 seconds).

---

## Minute 0:00–0:30 — Frame the problem

**Say:**

> “Every survey is a decision point. Today that decision is often delayed — spreadsheet, email, or waiting for the geologist. TargetLock IQ closes the loop at the rig: plan versus actual, projected miss at target, recovery guidance, and what to aim for on the next interval.”

**Show:** Guide overview modal → **Start tour**, or **Guide** directly.

**Step:** *Welcome* (step 1)

---

## Minute 0:30–0:50 — Scenario Lab (Step 2)

**Step:** *Scenario Lab*

**Say:**

> “Before we interpret a live hole, Scenario lab loads synthetic cases for training, validation, and demos — no real survey files. Built-in scenarios cover on-plan, drift, correction, Motor/Navi and wedge review, QA jumps, and bad imports; Custom builds a test hole from dip, azimuth, target, drift, and noise. Loaded runs show a simulated badge; exports record the scenario name. Use this to learn the UI — not as a substitute for validation with real client or historical data.”

**Point to:** Top-bar **Scenario lab** button (highlighted). Optional: open it after the tour.

---

## Minute 0:50–1:25 — On plan (Steps 3–4)

**Steps:** *On plan at collar* → *Surveys start drifting*

**Say:**

> “Early in the hole we’re on plan — status on track, small plan offset. As drilling continues, azimuth and dip drift; plan offset grows but the hole may still be recoverable.”

**Point to:** Status badge, KPI row, overlapping then diverging charts.

**Mode:** Simple only.

---

## Minute 1:25–2:05 — Miss and correction (Steps 5–6)

**Steps:** *Projected target miss* → *Driller-friendly correction*

**Say:**

> “If we keep drilling without correction, we project a miss at target depth. The app recommends next-interval dip and azimuth, limited by max dogleg — lift or drop, swing left or right.”

**Point to:** **Projected miss** KPI, **Next interval aim** panel, instruction chips.

---

## Minute 2:05–2:50 — Recovery guidance (Step 7) ★ v1.2 highlight

**Step:** *Recovery guidance*

**Say:**

> “This is the shift from trajectory calculator to decision support. Recovery guidance answers: what’s the current action, what recovery method might work, what to aim for next, and when to escalate — without telling the driller to ‘use a motor now.’ Wording stays tentative because ground, rig, and tools vary.”

**Point to:** Recovery guidance panel — **Current action**, **Best method**, **Escalate by**.

**Do not:** Read every Advanced panel yet.

---

## Minute 2:50–3:35 — Geologist / supervisor (Step 8)

**Step:** *QA/QC flags target risk* (switches to **Advanced** automatically)

**Say:**

> “Advanced mode is for the geologist or supervisor: interval checks, DLS, steering feasibility, method assumptions, and supervisor sign-off. Same hole — more governance.”

**Point to:** **Steering feasibility** panel, **Recovery capability assumptions**, **Survey QA/QC**, **Supervisor decision**.

**Optional:** Scroll **3D trajectory** — “preview only, not rig control.”

---

## Minute 3:35–4:20 — Survey in, handover out (Steps 9–10)

**Step:** *Add the next survey*

**Say:**

> “When the survey comes off the camera, enter MD, dip, and azimuth — or preload from aim. Decision history records what was recommended and what was done.”

**Do:** **Use aim** → **Add survey** (if time permits).

**Step:** *PDF shift handover*

**Say:**

> “End of shift: export PDF with status, recovery guidance, capability assumptions, QA flags, and history. TXT is available for plain-text workflows.”

**Do:** Click **Export PDF**; show recovery sections in the file.

---

## Minute 4:15–5:00 — Close

**Say:**

> “v1.2 is local-first: CSV and HUB-IQ templates, multi-hole library, steering feasibility with editable assumptions, and PDF handover. We’re ready for a short pilot — measure time saved, export discipline, and whether drillers trust the wording. TargetLock IQ is decision support; site procedures and geologist sign-off still apply.”

**End tour** to restore the user’s hole data.

**Offer:** [executive-summary.md](./executive-summary.md), [pilot-proposal.md](./pilot-proposal.md), [field-feedback-form.md](./field-feedback-form.md).

---

## Q&A shortcuts

| Question | Short answer |
|----------|----------------|
| Is this a desurvey replacement? | No. Minimum curvature for decision support; validate against certified tools — see [validation-plan.md](./validation-plan.md). |
| Who owns the recommendation? | The site. App advises; supervisor/geologist approves. |
| “Use motor now?” | No. Method phrases are tentative; assumptions are editable per hole. |
| HUB-IQ? | CSV templates today; direct import on roadmap — [hub-iq-import.md](./hub-iq-import.md). |
| Offline rig? | Browser local storage; full offline/sync is roadmap. |
| Multi-hole? | Hole library in sidebar — switch without losing program context. |

---

## Presenter checklist

- [ ] Guide tour tested once before meeting  
- [ ] Step 2 (Scenario lab) highlights top-bar button  
- [ ] Step 7 (recovery guidance) highlight visible  
- [ ] Advanced mode shows steering + assumptions panels  
- [ ] PDF export includes recovery sections  
- [ ] Pilot one-pager or executive summary link ready  
- [ ] Field feedback form printed or shared for follow-up  

---

## After the demo

1. Capture screenshots per [screenshots/README.md](./screenshots/README.md).  
2. Send handover sample PDF from [samples/](./samples/).  
3. Schedule driller/geologist review using [field-feedback-form.md](./field-feedback-form.md).  
4. Log any wording or workflow issues — **feedback before new features**.

**Related:** [demo-script.md](./demo-script.md) (legacy v1.1 script — superseded by this runbook for v1.2).
