# TargetLock Planner — Pilot Gate

## Automated smoke

```bash
cd packages/starterkit
npm run build && npm start
# separate terminal:
npm run smoke:planner-gate
npm run smoke:execution-gate
```

Env: `TARGETLOCK_URL` (default `http://localhost:8080/targetlock`).

### smoke:planner-gate checks

- `/targetlock/planner` loads (planner shell header row visible)
- "Demo program" / "Load demo program" button present; demo loads and RC2 holes appear
- Nav tabs: Create, Program, Map, 3D, QA, Review, Package
- 3D tab mounts the geology overlays panel
- Export program package button clickable

### smoke:execution-gate checks

- Planner → dashboard handoff
- Execution banner and Validation exports for planner-created active hole

## Manual checklist

1. Fresh browser: Plans tab empty state offers "Load demo program" and "Create plan".
2. Load institutional demo program (Plans header or empty state).
3. Inspect Plans table and context rail counts (6 holes, mixed statuses).
4. Guide → "Start interactive tour" walks Plans → Create → … → Package.
5. Map — mother/daughter links visible.
6. 3D — orbit the program; import an OBJ/DXF geology file via the Geology overlays panel; placement check warns when offsets are wrong.
7. QA — review clearance warnings and separation factors.
8. Review — approve RC2-003; verify readiness strip.
9. Package — export program package CSVs + manifest + trajectory DXF.
10. Activate approved plan → `/targetlock` execution banner.
11. Add actual survey → export execution evidence.
12. Reload browser — data and geology overlays persist.
13. Export/import hole package JSON (dashboard library).

## Quality gate

```bash
npm run lint
npm run test
npm run build
```
