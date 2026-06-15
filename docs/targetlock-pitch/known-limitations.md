# TargetLock IQ — Known Limitations

## Decision support only

TargetLock IQ and Hole Planner provide planning and trajectory comparison support. They do **not** replace certified survey deliverables, rig toolface control, or geologist sign-off.

## Anti-collision

Clearance checks are **approximate**. Separation factors use the simplified uncertainty model below and are computed for independent (standard-standard) hole pairs only — mother/daughter and planned-vs-actual pairs share survey lineage, so SF is intentionally not applied there. No certified anti-collision. Do not use for regulatory separation sign-off without independent verification.

## Positional uncertainty model

Uncertainty ellipses/envelopes are an **ISCWSA-inspired simplified model**: depth (constant + proportional), inclination, azimuth-sensor, and declination terms propagated along the minimum-curvature path. Random terms accumulate in quadrature, the declination term linearly. It is **not** a certified ISCWSA / OWSG implementation — no full error-term catalogue, no covariance cross-terms, no tool-specific calibration files. Use it for decision support, not survey certification.

## Curved well planning

Build-and-hold and curve-to-target designs use a single constant-curvature arc plus tangent in the plane containing the start direction and the target. No 3D spline optimisation, torque/drag, or wellbore-stability modelling. Verify designed paths with the drilling contractor before committing.

## Coordinates and CRS

Magnetic declination and grid convergence are now **computed**, not just typed: declination from an in-house WMM2025 implementation (validated against all 100 official NOAA test values to 0.01°) and convergence from the projection (proj4) for recognized MGA2020 / MGA94 / WGS84 UTM grids (validated against published Geoscience Australia and Landgate control values). Collar lat/long ⇄ easting/northing conversion is available for the same grid registry. Computed values flow through the planner's project coordinate system into the hole's reference system on publish, so the execution dashboard's azimuth conversion uses them automatically.

Honest limits remain: this is **not** a certified geodesy engine. No datum shifts beyond the GRS80/WGS84 transverse-Mercator grid registry (no NTv2 grid files, no plate-motion epoch propagation, no vertical datums), unknown EPSG codes stay metadata-only with an explicit notice, and WMM gives the regional main field only — local crustal magnetics near ore bodies can shift true declination materially. Planner desurvey itself stays un-rotated — one consistent north reference per program is the documented contract, and the planner warns on magnetic plans without a declination and on programs that mix north references. Verify all collar and target coordinates before field use.

The shared program frame uses an RL-0 datum: map/3D/DXF depth is measured below RL 0 (so exported DXF Z is a true elevation/RL), and grid target/kickoff "RL" values are true reduced levels.

## Data storage

Default deployment uses **local browser storage** only. No cloud audit trail, multi-user auth, or centralized backup unless you deploy with a backend.

## Source of truth

The official survey database and contractor deliverables remain authoritative. Exported CSV/PDF/TXT files must be reviewed before drilling.

## Geology and terrain

Imported geology is **display-only**. The planner 3D scene can overlay OBJ/DXF wireframes and surfaces (3DFACE, polyface mesh, polylines) exported from mining packages, but TargetLock performs no geological interpretation, no solids/boolean operations, and no pierce-point calculations. Placement relies on user-supplied offsets, datum RL, and Z convention — the placement check flags meshes far from the program collars, but correct georeferencing remains the user's responsibility. Geology assets live in browser storage with a hard size budget (~4.5 MB serialized); decimate large wireframes before import. Geology renders in the planner 3D scene only (program grid frame), not the single-hole dashboard scene. The planner map remains SVG plan-view without terrain.

## Interoperability

DXF export carries trajectory geometry (3D polylines), collars, and target markers only — no attributes, lithology, or survey metadata. Geology import reads OBJ and DXF wireframe geometry only — no attributes, lithology codes, or block-model data. Desurvey cross-check (balanced tangential, radius of curvature) is for reconciliation; all TargetLock calculations remain minimum curvature.

## Approval

Contractor, geologist, and supervisor approval is required before drilling. Planner approval snapshots are local attestations, not e-signatures.

## Branch vs Hole Planner

Dashboard **Branch program** (Advanced tab) and **Hole Planner** (`/targetlock/planner`) share storage but serve different workflows.

| Workspace | Role |
|-----------|------|
| **Hole Planner** | Institutional program planning — collars, targets, daughters, QA/clearance, approval, package export, plan lock |
| **TargetLock dashboard** | Execution — surveys, action plan, actual vs locked plan, execution audit |
| **Branch program tab** | Execution-time branch context — kickoff ranking from **actual** mother surveys, program maps, daughter switching (not duplicate planning) |

**Canonical path:** Plan in Hole Planner → Approve → Activate → record surveys on TargetLock. For planner-managed programs, the Branch tab is read-only for targets/daughters/approvals; use it for live kickoff analysis and overlays only.

Scenario lab branch demos and ad-hoc branch programs (no `plannerMeta`) still use the full Branch tab workflow on the dashboard.
