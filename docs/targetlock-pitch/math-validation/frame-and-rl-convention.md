# Frame and RL convention

Definitions used consistently across the planner map, 3D scene, clearance engine, DXF export, and grid coordinate displays. Regression-tested in `coordinate-system.test.ts`, `planner-spatial.test.ts`, `planner-clearance.test.ts`, `dxf-export.test.ts`, and `geology-store.test.ts`.

## Hole-local frame

Per-hole E/N/D offsets from the collar with **D down-positive** (depth below the collar). Persisted values — `hole.target`, `kickoffE/N/D`, plan/approval hashes — are all hole-local, so frame changes never invalidate stored plans or approvals.

## Program map frame (shared)

Used for multi-hole map/3D display, clearance closest-approach, and DXF export:

```
e = local_e + collar.easting
n = local_n + collar.northing
d = local_d − collar.elevation     (depth below the RL-0 datum; RL = −d)
```

A collar at RL 420 sits at frame `d = −420`. Holes with different collar RLs therefore keep their true vertical relationship: a hole collared 100 m higher is 100 m shallower in the frame at the same depth-below-collar. (The previous convention added collar RL to depth, which inverted vertical relationships between holes of different collar RLs — affecting clearance distances, the 3D scene, and exported Z values for mixed-RL programs.)

- **Clearance:** closest-approach runs on map-frame traces, so mixed-RL pairs are physically correct.
- **DXF:** exported `Z = −d` is a true elevation/RL, which is what Micromine / Leapfrog / Surpac / CAD expect.
- **Geology meshes:** "Z = elevation/RL" files frame as `d = −z` (exact round-trip with our own DXF export); "Z = depth" files as `d = z`. No datum-RL input is needed.

## Grid display values (true RL, up-positive)

Grid target and kickoff displays/exports use a true reduced level:

```
grid_E  = collar.easting  + local_e
grid_N  = collar.northing + local_n
grid_RL = collar.elevation − local_d
```

and inversely `local_d = collar.elevation − grid_RL`. Consequences:

- The Create wizard's "Target elevation / RL" input is a true RL: collar RL 400 with target RL 280 yields a local depth of 120 m.
- Every "RL" label (coordinate cards, kickoff previews, registry tables) and the `target_elevation` CSV column are true RLs.
- CSV import reads `target_easting` / `target_northing` / `target_elevation` as grid values converted through the hole's collar; `target_d` / `local_*` columns stay hole-local. There is deliberately no `rl` alias for local depth.

## North reference

The map frame applies **no azimuth rotation**: one consistent north reference per program is the documented contract, and the planner warns when a program mixes references or uses magnetic north without a site declination. On publish, the project coordinate system's `magneticDeclinationDeg` and `gridConvergenceDeg` are bridged into the hole's reference system so the execution dashboard's azimuth conversion uses the planner's site values.
