# TargetLock IQ — Screenshots (v1.3)

PNG captures for the pitch deck, leave-behind, and website.

**How to capture:** Follow this README and [screenshot-checklist.md](../screenshot-checklist.md).  
**Automated (partial):** `npm run dev` then `npm run capture:screenshots` in `packages/starterkit`.  
**Manual required:** v1.2 recovery and assumptions panels (see below).

**Settings:** 1920×1080 or higher · browser zoom 100% · light mode · sample data **DDH-0247** unless client approves real IDs.

---

## Required shots — deck minimum (11 files)

| # | Filename | App state | Used on deck slide |
|---|----------|-----------|-------------------|
| 1 | `01-simple-dashboard.png` | Simple mode, sample loaded, **Action plan** visible | 1, 3 |
| 2 | `02-simple-projected-miss.png` | Standard guide · step *Read the four key KPIs* (`kpis`); projected miss KPI accented | 4 |
| 3 | `03-recommendation-aim.png` | Standard guide · step *Understand the Action Plan* (`action-plan`); aim chips | 5 |
| 4 | `09-action-plan.png` | Standard guide · step *Understand the Action Plan*; full Action plan panel | 6 |
| 5 | `10-steering-feasibility.png` | Advanced → **Steering feasibility** tab (verdict summary) | 7 |
| 6 | `11-capability-assumptions.png` | Advanced → **Setup / assumptions** tab | 7 |
| 7 | `02-advanced-dashboard.png` | Advanced; tab bar + active tab content | 8 |
| 8 | `04-supervisor-decision.png` | Advanced → **Decisions** tab; supervisor panel | 8 |
| 9 | `05-trajectory-3d.png` | Advanced → **Trajectory** tab; 3D after slight drag | 9 |
| 10 | `07-export-handover-buttons.png` | Sidebar Export TXT + Export PDF | 10 |
| 11 | `08-pdf-handover-preview.png` | Open `/pitch-handover-preview.html` or exported PDF page 1 | 10 |

| 12 | `12-branch-program-readonly.png` | Advanced → **Branch program** tab; Scenario lab → **Mother + 2 daughters** | Appendix B |

**Legacy names** (still useful): `03-hole-library.png`, `06-pitch-correction-step.png`, `06-decision-history.png`.

---

## Exact app states — step by step

### 01 — Simple dashboard

1. Open http://localhost:3000/targetlock?mode=simple  
2. **Load sample** if empty  
3. Ensure **Recovery guidance** panel visible below KPIs  
4. Full viewport capture  

### 02 — Projected miss

1. **Guide** → **Standard hole workflow** → **Start guide**  
2. **Next** to *Read the four key KPIs* (step 6) — optional **Load demo: gradual drift**  
3. Capture viewport; projected miss KPI should show status accent  
4. Prefer capture **without** blue guide highlight for static deck (Exit guide or crop)  

### 03 — Recommendation aim

1. Standard guide step *Understand the Action Plan* (step 7)  
2. Crop to *Next interval aim* panel if needed for slide 5  

### 09 — Action plan ★ hero

1. Standard guide step *Understand the Action Plan*  
2. Full-width capture of the **Action plan** panel  
3. Verify: Current action (hero), Best method (tentative phrase), driller chips, aim/DLS/miss metrics, Escalate by  

### 10 — Steering feasibility

1. Switch to **Advanced**; open the **Steering feasibility** tab  
2. Capture the verdict summary (natural/parameter, motor/Navi/DeviDrill, wedge/branch, point of no return)  
3. Optionally click **Show details** for the interval/rejoin/method tables  

### 11 — Capability assumptions

1. Advanced → **Setup / assumptions** tab  
2. Capture **Recovery capability assumptions** editor (default ranges + disclaimer copy)  

### 06 — Decision history (governance slide)

1. Standard guide steps *Add a new survey manually* / *Fill from action plan*  
2. **Fill from action plan** → **Add survey**  
3. Advanced → **Decisions** tab → Decision history with new entry  

### 07–08 — Export

1. **Exit guide**  
2. Sidebar → Export buttons  
3. PDF preview: http://localhost:3000/pitch-handover-preview.html — confirm **Recovery guidance** and **Recovery capability assumptions** sections visible  

---

## Recommended shots (full pack)

| Filename | App state |
|----------|-----------|
| `03-hole-library.png` | Sidebar hole library with 2+ holes |
| `06-pitch-correction-step.png` | Standard guide · *Understand the Action Plan* full dashboard |
| `12-guide-tour-step7.png` | Guide chrome + action plan (for “live demo” slide) |
| `13-correction-options-table.png` | Advanced correction options |
| `14-deviation-chart.png` | Advanced deviation chart |
| `15-manual-survey-entry.png` | Sidebar manual survey with aim filled |
| `16-hub-iq-templates.png` | HUB-IQ template download links |

---

## Automated capture script

`packages/starterkit/scripts/capture-pitch-screenshots.mjs` generates **01, 02-advanced, 03-hole-library, 04-supervisor, 05-3d, 06-correction, 07-export, 08-pdf-preview**.

After `npm run capture:screenshots`, **manually capture 02-simple-projected-miss, 03-recommendation-aim, 09–11** using Guide steps above.

---

## Post-processing checklist

| Task | Done |
|------|------|
| Width consistent (1920 px) | [ ] |
| No real collar coordinates (unless approved) | [ ] |
| Recovery + assumptions visible in PDF preview | [ ] |
| Files named per table | [ ] |
| Referenced in [deck.md](../deck.md) | [ ] |

---

## Deck mapping

See [deck.md](../deck.md) (11 slides) and [demo-runbook.md](../demo-runbook.md) for live demo alignment.

**Regenerate handover samples:** `npm run generate:samples` in `packages/starterkit`.
