# Known Limitations — TargetLock IQ v2 RC1

**TargetLock IQ is a decision-support prototype. Do not use it for live drilling decisions without site validation, geologist review, and directional drilling contractor agreement where applicable.**

- **Local browser storage only** — hole data is stored in the current browser and does not sync between devices or users.
- **Decision support only** — RC1 is not a certified survey deliverable, survey database, or rig instruction system.
- **CSV import uses the Import Assistant** — upload via Hole plan / Survey results for preview, templates, and validation; confirm units and conventions before import. Download the CSV test pack from Hole data or Scenario lab for pilot files.
- **Branch kickoff uses actual mother surveys** — daughter kickoff planning is based on the surveyed mother-hole path. Plan-only kickoff planning is not supported in RC1.
- **Toolface and branch outputs are planning estimates** — final toolface, wedge, motor/Navi, DeviDrill, or branch decisions must be confirmed by qualified personnel.
- **Recovery feasibility uses configurable capability assumptions** — natural/parameter, motor/Navi, DeviDrill, and wedge/branch thresholds are editable per hole. There is no universal rod deviation rating; feasibility depends on ground, rods, hole size, rig, depth, survey quality, and directional contractor input.
- **Next-interval aim is not a permanent directive** — dip/azimuth guidance applies to the next survey interval only. Re-survey, recalculate, and repeat until on track or an escalation decision point.
- **No live HUB-IQ integration** — RC1 supports CSV/template workflows only.
- **No login or private access control** — treat the public pilot URL as a convenience link, not a secure project workspace.
- **Guide Center is non-destructive by default** — it does not change hole data unless **Load demo** is selected. Exiting the guide restores the prior working state.

Backup recommendation: **Export full hole package** (`.json`) before experiments, resets, or browser cache clearing.

Audit: [rc1-general-audit.md](../rc1-general-audit.md)
