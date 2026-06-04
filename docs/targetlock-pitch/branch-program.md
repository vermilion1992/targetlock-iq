# TargetLock IQ — Branch Program (v2)

**Module:** Branch Program  
**Subtitle:** Mother hole, daughter holes, targets, and kickoff control  
**Status:** Phase 1 — docs, Scenario Lab demos, read-only Advanced visualization, kickoff math foundation

---

## Purpose

Branch holes (also called **branch holes**, **sidetracks**, or **multilateral boreholes**) are drilled from an existing **mother hole** to reach new targets — mainly for resource definition, using wedges, downhole motors, or directional core drilling (DCD / DeviDrill).

A daughter hole is **not** another independent drill trace. Its start point depends on the **actual surveyed mother hole**, not the planned mother hole. TargetLock treats daughters as children of a measured 3D parent trajectory.

---

## Terminology

| Term | Meaning |
|------|---------|
| **Mother hole** | Parent hole with planned and actual surveys |
| **Daughter hole** | Branch from mother at kickoff MD (e.g. `DDH-0247A`, `DDH-0247B`) |
| **Kickoff** | Branch measured depth on mother; XYZ and dip/azimuth from **actual** mother survey |
| **Branch method** | Wedge, motor/Navi, DeviDrill/DCD, natural branch, planned sidetrack |
| **Target** | Point, disk, plane, interval, or orebody window with tolerance and priority |

---

## Workflow (full v2)

1. **Load mother hole** — plan + actual surveys; true mother path from minimum curvature.
2. **Choose branch window** — viable kickoff range (e.g. 420–540 m); sample every 3/6/10 m or survey interval.
3. **Assign daughter target** — required heading, dip, DLS, projected daughter path.
4. **Feasibility ranking** — kickoff depth, DLS, directional metres, method suitability, separation, uncertainty.
5. **Approval gate** — Draft → geology reviewed → directional reviewed → approved for drilling (Phase 2).
6. **Live daughter surveying** — surveys belong to daughter leg from kickoff; mother and siblings as reference.

Phase 1 implements steps 1–4 as **read-only** demos; steps 5–6 are documented for v2 full build.

---

## Core data model

See `packages/starterkit/src/lib/drilling/branch-program-types.ts`.

- **Mother:** hole ID, collar, planned trajectory, actual surveyed trajectory, restrictions, survey tool profile.
- **Daughter:** daughter ID, parent hole ID, kickoff MD, kickoff from actual survey, branch method, planned/actual daughter trajectory, active target, status.
- **Targets:** multiple per program; type, tolerance envelope, priority, assigned daughter, geological purpose.

**Institutional rule:** kickoff XYZ and mother direction at branch point are always computed from `mother.actualRecords` via `kickoffStationFromMother()` — never from plan alone.

---

## Math (Phase 1)

Implemented in `branch-program.ts`:

| Function | Description |
|----------|-------------|
| `kickoffStationFromMother` | Min-curve interpolation on actual mother at kickoff MD |
| `requiredDaughterHeading` | Dip/azimuth from kickoff to target |
| `doglegMotherToDaughter` | DLS per 30 m between mother direction and required daughter direction |
| `rankKickoffOptions` | Rank kickoff depths in a window |
| `separationMotherDaughter` | Min centre-to-centre distance, closest approach MD, warning |

**Method feasibility:** maps required DLS to suitability using recovery capability assumptions (natural, parameter, motor/Navi, DeviDrill, wedge). DeviDrill typical 5–9°/30 m remains **configurable**, not site truth.

**Phase 2 (not shipped):** toolface angle, build/drop and left/right turn components, wedge event count, ellipse uncertainty, separation factor.

---

## Separation (exploration v1)

- Minimum centre-to-centre distance between mother and daughter paths
- Closest approach depth
- Separation warning below configurable threshold (default 5 m)
- Survey uncertainty caution (Phase 2: ellipse / separation factor per Innova-style anti-collision)

---

## Simple vs Advanced UX

### Simple mode (when branch program loaded)

- Active hole context: Mother (daughter context label in Phase 1)
- Current action: from mother hole recommendation
- Active target: assigned daughter target label
- Branch plan on track: green / amber / red from separation + DLS
- “Directional review required” when DLS exceeds capability thresholds

No branch engineering detail on the rig floor.

### Advanced mode — Branch Program tab (Phase 1 read-only)

- Program map (mother + daughter trajectories + targets + kickoff nodes)
- Branch table (daughter ID, target, kickoff MD, method, DLS, separation, status)
- **Target library** — add/edit/remove point targets (E/N/D, tolerance, purpose including geotechnical)
- **Kickoff planner** — ranked MD window from actual mother; Best control / Shortest path / Lowest dogleg; save daughter draft
- **Daughter list** — set active drilling context, status stepper, archive
- **Approvals** — formal snapshot; stale banner when kickoff, plan, or assumptions change
- **Toolface estimate** — planning-only card with required disclaimer
- **Export branch plan PDF** — from Branch program tab
- Disclaimer: *Planning estimate only. Kickoff and toolface to be confirmed by directional drilling contractor.*

---

## Scenario Lab

Ten built-in branch program demos (five Phase 1 + five Phase 2) — see [test-scenarios.md](./test-scenarios.md#branch-program-scenarios). Load from **Scenario lab → Branch programs** (imports persisted program + daughter holes).

---

## Reports

**Branch Planning Report PDF** (`branch-report-pdf.ts`) — program overview, mother summary, daughter/target, kickoff comparison table, approval/stale note, heading/DLS, assumptions, separation, toolface estimate, sign-off, disclaimer. Filename `branch-plan-{daughterId}-{date}.pdf`.

---

## Industry references

- [Devico — branch holes](https://www.devico.com/service/delineation-drilling/)
- [Devico — DeviDrill](https://www.devico.com/product/devidrill/)
- [Geodrill — directional drilling](https://www.geodrill.ltd/drilling-services/directional-drilling/)
- [Coring Magazine — definitions](https://coringmagazine.com/article/directional-diamond-drilling-definitions-terms-simple-calculations/)
- [Coring Magazine — toolface planning](https://coringmagazine.com/article/formulae-practice-borehole-planning-toolface-calculation/)
- [Innova — anti-collision](https://docs.innova-drilling.com/introduction/innova-engineering-manual/innova-vantage-manual/6.0-well-views/6.3-anti-collision)

---

## Related docs

| Doc | Use |
|-----|-----|
| [feature-roadmap.md](./feature-roadmap.md) | Phase 1 vs Phase 2 delivery |
| [test-scenarios.md](./test-scenarios.md) | Branch program demo matrix |
| [steering-feasibility.md](./steering-feasibility.md) | Recovery methods and DLS bands |
| [current-status.md](./current-status.md) | Shipped vs planned |

*Decision support only. Verify kickoff, toolface, and branch plans with site procedures and directional contractor approval.*
