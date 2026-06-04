# Steering feasibility — logic and assumptions

TargetLock IQ compares **planned vs actual interval behaviour** (lift/drop and swing per survey interval) and estimates whether common recovery methods are **plausible** within configurable dogleg assumptions.

This is **decision support**, not a steering guarantee.

---

## What is calculated

### Interval behaviour

For each actual survey interval:

- **Planned lift/drop** — change in dip on the planned path over that MD span  
- **Planned swing** — azimuth change on plan over that span  
- **Actual lift/drop** and **actual swing** — same for the actual path  
- **Delta** — actual minus planned  
- **Flag** — outside a tolerance derived from configured max DLS and interval length  

### Recovery

- **Required DLS to target** — from existing recommendation engine  
- **Required DLS to rejoin plan** — at 30 m, 60 m, 90 m, and target depth  
- **Point of no return (estimate)** — depth where required DLS exceeds the highest “smooth” method limit in the default profile set  
- **Trend phrase** — whether the latest interval is inside or outside planned behaviour tolerance  

### Method profiles (defaults, editable per hole in Advanced)

| Method | Default DLS range (°/30 m) | Role |
|--------|---------------------------|------|
| Natural correction | 0–1.5 | Rig steering without tool change |
| Parameter correction | 0.5–2.5 | WOB/RPM/pump/rod handling |
| Shorten survey interval | — | Risk control, not a steering method |
| Motor / Navi | 1.5–5 | Downhole tool — site dependent |
| DeviDrill | 4–9 | Directional core barrel assumption |
| Wedge / branch | review when required DLS &gt; 2.5 | Sidetrack when smooth recovery unlikely |

**Advanced → Recovery capability assumptions** stores ranges per active hole (local library). **Reset to defaults** restores `capability-profiles.ts` values. TXT/PDF handovers include the active assumption summary.

Phrases are cautious, e.g. “Motor/Navi **may be** required…” not “Use motor now.”

---

## Simple vs Advanced UI

**Simple = What do I do next?** — the **Action plan** panel (the hero), merging the next-interval aim and recovery guidance:

- Current action (On track / Watch / Correct now / Steering review / Wedge or branch review)  
- Best method (tentative wording)  
- Next interval aim (lift/drop + swing left/right chips; re-survey each interval)  
- Aim dip / aim azimuth, DLS required vs limit, projected miss  
- Escalation depth / wording  

Plus four KPIs (latest survey MD, actual dip/azi, plan offset, projected miss) and basic plan/section charts.

**Advanced = Why is that the answer?** — grouped tabs, not everything at once:

- **Trajectory** — plan/section/3D/deviation charts, miss vector, survey table  
- **Steering feasibility** — verdict summary (natural/parameter, motor/Navi/DeviDrill, wedge/branch, point of no return) with **Show details** for interval tables, rejoin DLS, and method assumptions; correction options  
- **QA/QC** — compact status pill + top issues, expandable to all checks  
- **Decisions** — supervisor decision + decision history  
- **Setup / assumptions** — **Recovery capability assumptions** editor (configurable, not guaranteed)  

---

## Limitations

- Does not model ground strength, rod string, pump limits, or contractor skill.  
- Does not replace geologist or supervisor sign-off.  
- Point of no return is a **stepwise estimate**, not a rigorous optimisation.  
- Profiles should be tuned per site when moving from pilot to production.

---

## Code

- `packages/starterkit/src/lib/drilling/steering-feasibility.ts`  
- `packages/starterkit/src/lib/drilling/capability-profiles.ts`  
- `packages/starterkit/src/lib/drilling/capability-assumptions.ts`  
- `packages/starterkit/src/lib/drilling/steering-types.ts`  
- UI: `CapabilityAssumptionsEditor.tsx` (Advanced only)  
- Tests: `steering-feasibility.test.ts`, `capability-assumptions.test.ts`
