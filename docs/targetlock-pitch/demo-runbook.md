# TargetLock IQ — Demo runbook (5 minutes)

**Audience:** Drilling superintendent, exploration manager, geologist, IMDEX stakeholder  
**Version:** v1.3  
**Format:** Live browser demo at `/targetlock` using **Guide Center → Standard hole workflow** (or **Quick orientation** for a 2-minute layout-only pass)  
**Backup:** Static demo `targetlock-iq-demo/index.html` if Next app unavailable  

---

## Before you start

| Check | Action |
|-------|--------|
| App running | `npm run dev` in `packages/starterkit` |
| URL | http://localhost:3000/targetlock |
| Browser | Zoom 100%; close unrelated tabs |
| Guide | **Guide** → select **Standard hole workflow** → **Start guide** |
| Data | Banner: *Guide active — your hole data is unchanged* (use **Load demo** on a step only if needed) |
| Export | Confirm PDF download is not blocked |
| Backup | Have [samples/DDH-0247-handover-md390.pdf](./samples/DDH-0247-handover-md390.pdf) open if live export fails |

Optional: **Quick orientation** (6 steps) for executives who only need layout and modes.

Full step list: [pilot-testing-kit/guide-center.md](./pilot-testing-kit/guide-center.md).

---

## Minute 0:00–0:30 — Frame the problem

**Say:**

> “Every survey is a decision point. Today that decision is often delayed — spreadsheet, email, or waiting for the geologist. TargetLock IQ closes the loop at the rig: plan versus actual, projected miss at target, recovery guidance, and what to aim for on the next interval.”

**Show:** **Guide** → **Standard hole workflow** → **Start guide**.

**Step:** *Welcome to TargetLock IQ*

---

## Minute 0:30–1:00 — Layout and data (Steps 2–5)

**Steps:** *Simple vs Advanced* → *Hole details* → *Upload a hole plan* → *Upload survey results*

**Say:**

> “Sidebar holds hole identity and CSV imports — plan trajectory and survey results. The main workspace is for decisions after data is loaded. If you’re demoing without client files, use **Load demo** on the KPI step or open **Scenario lab** after the guide.”

**Point to:** Sidebar hole fields and file inputs (highlighted on each step).

---

## Minute 1:00–2:05 — KPIs and action plan (Steps 6–7)

**Steps:** *Read the four key KPIs* → *Understand the Action Plan*

**Say:**

> “Four KPIs: latest survey, dip/azimuth, offset from plan, and projected miss at target. The Action plan states current status, best recovery method, next interval aim, and when to escalate — advisory wording, not a motor order.”

**Point to:** KPI row, Action plan panel.

**Optional:** **Load demo: gradual drift** on step 6 if the hole is empty.

---

## Minute 2:05–2:50 — Charts and Advanced (Steps 10–12)

**Steps:** *Check Plan / Section / Deviation charts* → *Open Advanced mode* → *Review Steering Feasibility*

**Say:**

> “Charts confirm what the numbers show. Advanced adds steering feasibility — natural, motor/Navi, wedge/branch — against editable capability assumptions.”

**Point to:** Simple charts or **Open Steering feasibility** from the guide panel.

---

## Minute 2:50–3:35 — Governance (Steps 13–14)

**Steps:** *Review QA/QC flags* → *Check Math Reference*

**Say:**

> “QA/QC flags interval and target risks. Math reference shows the geometry behind the recommendation for geologist or contractor review.”

**Use:** **Open QA/QC** / **Open Math reference** buttons in the guide footer.

---

## Minute 3:35–4:20 — Survey in, handover out (Steps 8–9, 18)

**Steps:** *Add a new survey manually* → *Fill from action plan* → *Export handover PDF*

**Say:**

> “Enter the next camera survey or fill from the action plan. End of shift: export PDF with status, recovery context, QA flags, and history.”

**Do:** **Fill from action plan** → **Add survey** (if time); **Export PDF**.

---

## Minute 4:15–5:00 — Close

**Say:**

> “v1.3 adds Guide Center: quick orientation, full hole workflow, and a branch/daughter guide for multi-leg programs. Local-first CSV, multi-hole library, steering feasibility, and PDF handover. Ready for pilot — measure time to decision and export discipline. TargetLock IQ is decision support; site procedures and geologist sign-off still apply.”

**Exit guide** to restore pre-guide state (including any demo data).

**Offer:** [executive-summary.md](./executive-summary.md), [pilot-proposal.md](./pilot-proposal.md), [pilot-testing-kit/feedback-form.md](./pilot-testing-kit/feedback-form.md).

**Branch demo:** **Guide** → **Branch / daughter hole workflow** — see [pilot-testing-kit/branch-program-guide.md](./pilot-testing-kit/branch-program-guide.md).

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

- [ ] Standard hole guide tested once before meeting  
- [ ] Optional demo loads on steps 6 / 12 / 18 if hole is empty  
- [ ] Action plan highlight visible on step 7  
- [ ] Advanced steering + QA accessible via **Open [tab]**  
- [ ] PDF export works  
- [ ] Pilot one-pager or executive summary link ready  

---

## After the demo

1. Capture screenshots per [screenshots/README.md](./screenshots/README.md).  
2. Send handover sample PDF from [samples/](./samples/).  
3. Schedule review using [pilot-testing-kit/feedback-form.md](./pilot-testing-kit/feedback-form.md).  

**Related:** [pilot-testing-kit/guide-center.md](./pilot-testing-kit/guide-center.md) · [demo-script.md](./demo-script.md) (legacy v1.1 script).
