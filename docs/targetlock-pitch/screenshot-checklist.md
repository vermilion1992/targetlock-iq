# TargetLock IQ — Screenshot checklist

Use for pitch deck, leave-behind PDF, and website. Capture at **1920×1080** or higher; browser zoom **100%**. Save under [screenshots/](./screenshots/) (see folder README). Deck slide mapping: [deck-outline.md](./deck-outline.md).

**App URL:** http://localhost:3000/targetlock  
**Data:** **Load sample** or **Guide** tour (10 steps) to step 7+ for recovery / drift visuals.

---

## Required shots (deck minimum — v1.2)

| # | Filename (suggested) | How to capture | Used for |
|---|----------------------|----------------|----------|
| 1 | `01-simple-dashboard.png` | Simple mode, sample, recovery panel visible | Cover / solution |
| 2 | `02-simple-projected-miss.png` | Guide step 5 (*Projected target miss*) | Risk visibility |
| 3 | `03-recommendation-aim.png` | Guide step 6; next interval aim panel | Driller value |
| 4 | `09-recovery-guidance.png` | Guide step 7; recovery guidance panel | **v1.2 decision support** |
| 5 | `10-steering-feasibility.png` | Advanced; steering feasibility panel | Geologist / supervisor |
| 6 | `11-capability-assumptions.png` | Advanced; recovery capability assumptions | Site assumptions |
| 7 | `04-advanced-qa-flags.png` | Guide step 8; Advanced QA panel | Geologist confidence |
| 8 | `06-decision-history.png` | After **Use aim** → **Add survey** (step 9) | Audit / governance |
| 9 | `07-export-buttons.png` | Sidebar **Hole data**: Export TXT + Export PDF | Handover workflow |
| 10 | `08-pdf-handover.png` | PDF page 1: larger logo, decision summary cards, next-interval aim (single line), recovery one-liner, trajectory; page 2: **Technical Detail** appendix | Deliverable example |

---

## Recommended shots (full pack)

| # | Filename | How to capture |
|---|----------|----------------|
| 9 | `09-pitch-walkthrough-bar.png` | Mid-Guide tour; bottom step panel visible |
| 10 | `10-guide-overview-modal.png` | **Guide → Overview** modal open |
| 11 | `11-correction-options-table.png` | Advanced; correction options |
| 12 | `12-deviation-chart.png` | Advanced; deviation from plan chart |
| 13 | `13-miss-vector-panel.png` | Step 5; miss vector E/N/D |
| 14 | `14-status-correction-needed.png` | Step 5+; status badge “Correction needed” or “Watch” |
| 15 | `15-manual-survey-entry.png` | Sidebar manual survey with aim filled |
| 16 | `16-trajectory-3d.png` | Advanced mode; drag-to-rotate 3D trajectory panel |
| 17 | `17-supervisor-decision.png` | Advanced; log a supervisor decision with notes |
| 18 | `18-hub-iq-templates.png` | Sidebar **Hole data** → expand **CSV format help**; example CSV links visible |
| 19 | `19-scenario-lab-modal.png` | Top bar **Scenario lab** open; Built-in scenarios cards visible |
| 20 | `20-advanced-roadmap.png` | Advanced → **Roadmap** tab; both future-direction sections visible |

---

## Capture notes

### UI refresh (current build)

The dashboard was given a presentation polish. When capturing, take advantage of:

- **Recovery guidance panel** — Simple mode; scan-friendly Current action / Best method /
  Escalate by (`09-recovery-guidance.png`). Hero for v1.2 decision-support story.
- **Next interval aim block** — the panel leads with large
  Lift/Drop / Swing left/right chips. Hero for driller value (`03-recommendation-aim.png`).
- **Status badge with status dot** — top-right pill (colored by hole status) reads well at
  thumbnail size for `14-status-correction-needed.png`.
- **Status-accented Projected miss KPI** — the projected-miss card takes on the hole-status
  color (amber/red/green), good for `02-simple-projected-miss.png`.
- **Empty state** — before loading data the recommendation panel shows a clean
  "No survey data yet" prompt; load sample data before deck shots.
- Top bar shows `Rig dashboard · <hole name>` — satisfies the "hole name visible" note below.

### Branding and clarity

- Use **light mode** (default TargetLock UI).  
- Crop to app shell; avoid desktop clutter unless showing “rig tablet” context.  
- Ensure **DDH-0247** or pilot hole name is visible in one shot (now shown in the top bar).  

### Sensitive data

- Pilot screenshots: use **sample data** only unless client approves real hole IDs.  
- Blur collar coordinates if real project data is used.  

### PDF export

- Export at MD **390 m** (sample) for consistent deck narrative.  
- Capture **page 1** — larger branded masthead, executive summary, next-interval aim (one line), recovery one-liner, trajectory overview, critical checks only (no OK QA noise).  
- Capture **page 2** — **Technical Detail** appendix (correction options, QA detail, assumptions, validation, history) + disclaimer.  
- Branch plan PDF: page 1 should show mother/daughter context and branch trajectory visual.

### Pitch / Guide highlights

- Blue outline (`guide-focus`) appears during **Guide** tour — optional for “live demo” slide; prefer clean UI without highlight for static deck slides.  

---

## Slide mapping

See [deck.md](./deck.md) (11 slides) and [screenshots/README.md](./screenshots/README.md) for v1.2 capture states.
