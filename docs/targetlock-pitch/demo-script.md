# TargetLock IQ — Demo script (3–5 minutes)

**Audience:** Drilling superintendent, exploration manager, IMDEX stakeholder  
**Format:** Live browser demo at `/targetlock` using **Pitch walkthrough**  
**Backup:** Static demo `targetlock-iq-demo/index.html` if Next app unavailable  

---

## Before you start

- Run `npm run dev` in `packages/starterkit`; open **http://localhost:3000/targetlock**  
- Click **Pitch walkthrough** (top right) — restores demo data and does not overwrite saved state after **Exit demo**  
- Optional: open **Product summary** first for executive audiences (45 seconds)  

---

## Minute 0:00–0:30 — Frame the problem

**Say:**

> “Every survey is a decision point. Today that decision is often delayed—spreadsheet, email, or waiting for the geologist. TargetLock IQ closes the loop at the rig: plan versus actual, projected miss at target, and what to aim for on the next thirty metres.”

**Show:** Product summary modal → **Start pitch walkthrough** (or **Pitch walkthrough** directly).

---

## Minute 0:30–1:15 — On plan (Steps 1–2)

**Walkthrough steps:** *Welcome* → *On plan at collar*

**Say:**

> “Early in the hole we’re on plan—status on track, small plan offset, projected miss inside tolerance. The driller sees the same view we’d want on the rig floor in Simple mode.”

**Point to:** Status badge, KPI row, plan/section charts (tracks overlap).

**Do not:** Switch to Advanced yet.

---

## Minute 1:15–2:00 — Drift and miss (Steps 3–4)

**Steps:** *Surveys start drifting* → *Projected target miss*

**Say:**

> “As azimuth walks and dip flattens, plan offset grows. If we keep drilling without correction, we project a miss at target depth—the number that matters for the intercept. This is the conversation that used to happen hours later.”

**Point to:** **Projected miss** KPI (highlighted), plan offset, charts diverging.

---

## Minute 2:00–2:45 — Recommendation (Step 5)

**Step:** *Driller-friendly correction*

**Say:**

> “The app recommends next-interval dip and azimuth, limited by max dogleg. Wording is deliberate: steepen or flatten, turn left or turn right—not just numbers on a page.”

**Point to:** Next interval aim panel, dip/azi change lines, action text.

**Optional:** Read one line from action text aloud.

---

## Minute 2:45–3:30 — Geologist / supervisor view (Step 6)

**Step:** *QA/QC flags target risk* (switches to **Advanced** automatically)

**Say:**

> “Advanced mode is for the geologist or supervisor: interval checks, DLS, plan offset, recovery feasibility, target risk. Same hole, more governance—not a different product.”

**Point to:** **Survey QA/QC** panel (risk / watch / Clear), **Correction options** table, **Supervisor decision** panel (log continue / steer / stop for handover).

**Optional:** **3D trajectory** panel — drag to rotate; “preview only in v1.1, not rig control.”

---

## Minute 3:30–4:15 — Survey in, handover out (Steps 7–8)

**Step:** *Add the next survey*

**Say:**

> “When the survey comes off the camera, the driller enters MD, dip, and azimuth—or preloads from aim. Decision history records what was recommended and what was done.”

**Do:** **Use aim** → **Add survey** (if time).

**Step:** *PDF shift handover*

**Say:**

> “End of shift or end of interval: export a PDF handover with status, metrics, correction options, QA flags, and recent history. TXT is there for systems that want plain text.”

**Do:** Click **Export PDF**; briefly show downloaded file if projector allows.

---

## Minute 4:15–5:00 — Close

**Say:**

> “v1.1 is local-first: CSV and HUB-IQ templates today, supervisor decisions and PDF handover on the rig. Pilot measures time saved and acceptance; next is multi-hole across the program, then live HUB-IQ. TargetLock IQ is decision support—site procedures and geologist sign-off still apply.”

**Exit demo** to restore any user data.

**Offer:** [executive-summary.md](./executive-summary.md), [pilot-proposal.md](./pilot-proposal.md).

---

## Q&A shortcuts

| Question | Short answer |
|----------|----------------|
| Is this a desurvey replacement? | No. Minimum curvature desurvey for decision support; validate against your certified tools where required. |
| Offline rig? | v1 persists in browser; full offline/sync is roadmap. |
| HUB-IQ? | CSV today; direct import on roadmap. |
| Who owns the recommendation? | The site. App advises; supervisor/geologist approves. |
| 3D view? | Canvas preview in Advanced v1.1; full Three.js later. |
| Supervisor sign-off? | Decision log + export today; formal name/role sign-off on v2 roadmap. |

---

## Presenter checklist

- [ ] Browser zoom 100%; close unrelated tabs  
- [ ] Pitch walkthrough tested once before meeting  
- [ ] PDF export works (popup/download not blocked)  
- [ ] Product summary reviewed for executive room  
- [ ] Pilot one-pager printed or shared link ready  
