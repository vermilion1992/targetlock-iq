# TargetLock Planner — Import / Export

## Export filenames

Program exports use:

`targetlock-planner-{program-slug}-{YYYY-MM-DD}-{suffix}`

Suffixes: `collars.csv`, `planned-surveys.csv`, `targets.csv`, `coordinates.csv`, `clearance.csv`, `manifest.json`.

## Import files

| File | Required | Column aliases |
|------|----------|----------------|
| Collars | Yes | hole_id/hole/name, easting/east/x, northing/north/y, elevation/rl/z, latitude, longitude, plan_type, program, status |
| Planned surveys | Recommended | hole_id, md/depth, dip, azimuth |
| Targets | Optional | hole_id, target_md, target_e, target_n, target_d, tolerance |
| Daughters | Optional | daughter_hole_id, mother_hole_id, kickoff_md, target_id |

Templates: `/templates/targetlock-planner-*-template.csv`

## Import assistant

Command Center → **Import planned holes** opens the import assistant with preview, warnings, and optional overwrite.

Imported holes receive `plannerMeta.createdFromPlanner = true`.

## Round-trip

1. Export program package from Package tab.
2. Edit CSVs in external tools (Compass, Micromine-style workflows).
3. Re-import via import assistant as a new or updated program.

Official survey database remains source of truth — verify imports independently.
