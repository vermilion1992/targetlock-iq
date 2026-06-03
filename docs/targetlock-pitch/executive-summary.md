# TargetLock IQ — Executive summary

**Product:** TargetLock IQ  
**Category:** Diamond drilling trajectory decision support  
**Status:** Working v1.1 prototype (local-first, browser-based; pilot-ready)  
**Audience:** Exploration drilling managers, operations superintendents, technology leads  

---

## Problem

In mineral exploration drilling, the gap between **downhole survey** and **drilling decision** is where targets are missed and metres are wasted. Surveys arrive from the camera; someone later compares plan versus actual, estimates miss at target depth, and advises the next dip and azimuth. That loop is often slow, inconsistent, and disconnected from the rig floor. By the time a geologist or supervisor responds, the hole may have drilled another interval off plan.

## Solution

TargetLock IQ is a **survey-to-decision co-pilot** for diamond drilling. It loads the planned hole and actual surveys, desurveys with **minimum curvature**, compares actual to plan at the current measured depth, projects **target miss** if the hole continues uncorrected, and recommends a **next-interval aim** (dip and azimuth) with driller-friendly wording: steepen, flatten, turn left, turn right. **QA/QC flags** and **shift handover reports** (TXT and PDF) support supervisor and geologist review without replacing their judgment.

## Who uses it

| Role | Primary use |
|------|-------------|
| **Driller** | Rig-floor dashboard (Simple mode): current MD, plan offset, projected miss, next aim |
| **Geologist** | Target definition, deviation review, validation of recommendations (Advanced mode) |
| **Supervisor** | Decision history, handover export, risk flags before the next interval |

## Core value

- **Faster survey-to-decision** — minutes instead of hours for routine trajectory checks  
- **Fewer missed targets** — projected miss and miss vector visible before TD  
- **Fewer wasted metres** — earlier correction when drift is still recoverable within dogleg limits  
- **Consistent rig-floor language** — same recommendation format every survey  
- **Audit trail** — decision history and exportable handover for shift change  

## What exists today (v1 / v1.1)

- Pure **drilling math engine** (TypeScript, unit-tested): CSV import, desurvey, recommendation, QA  
- **Simple** and **Advanced** UI modes; **3D trajectory preview** (Advanced)  
- **HUB-IQ-style CSV** templates and column aliases; import guide in pitch pack  
- **Hole name** and **site/project** on reports; **supervisor decision** log (continue / steer / stop, etc.)  
- **Multi-hole library** and **localStorage** persistence (surveys, target, history per hole)  
- **TXT and PDF** shift handover export (includes recent decisions and metadata)  
- **Pitch walkthrough** for demos (8 steps, screenshot-friendly highlights)  

See [current-status.md](./current-status.md) for gaps (live HUB-IQ, full sign-off, hosting).  

## IMDEX ecosystem fit

TargetLock IQ is designed to sit beside—not replace—field data platforms:

- **HUB-IQ / SURVEY-IQ** — CSV templates and aliases today; live API/sync on v2 roadmap  
- **Reflex / ioGAS / other geology tools** — target and intercept context remain in geology workflows; TargetLock owns **trajectory decision at the rig**  
- **Reporting** — handover PDF aligned with shift supervisor and client reporting needs  

## Pilot ask

A **4–8 week site pilot** on one or two deep exploration holes: measure survey-to-decision time, plan offset trends, and geologist/supervisor acceptance. Success = faster decisions, documented handovers, and agreement on v2 priorities (multi-hole program use, live import, formal sign-off).

## Investment framing

v1 proves **workflow and math**. Commercial product adds validated integrations, multi-user governance, and deployment options (see [commercial-model-options.md](./commercial-model-options.md) and [feature-roadmap.md](./feature-roadmap.md)).

---

*TargetLock IQ provides decision support only. All recommendations require site procedures, independent desurvey checks where required, and geologist/supervisor approval before operational use.*
