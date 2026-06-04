# DLS, kickoff, branch, and separation

## Dogleg (DLS)

**Function:** `doglegMotherToDaughter` / station `dls` from desurvey

| Case | Mother dip/azi | Daughter dip/azi | Expected |
|------|----------------|------------------|----------|
| Match | -60, 90 | -60, 90 | ≈ 0°/30 m |
| Turn | -60, 90 | -63, 95 | Higher than small turn |

**Vitest:** `math-validation.test.ts` → `math validation — DLS`

## Kickoff from actual mother

**Rule:** Never kickoff from plan-only — `kickoffStationFromMother(actualRecords, md)`

| MD | Expected |
|----|----------|
| 30 on straight actual | Kickoff MD ≈ 30; mother dip ≈ -60° |

**Vitest:** `branch-program.test.ts`, `math-validation.test.ts`

## Branch required heading and separation

- `requiredDaughterHeading` — finite dip/azimuth toward target ENZ
- `separationMotherDaughter` — min centre-to-centre distance; status ok / caution / warning

**Scenario check:** Load `branch-daughter-convergence` — separation not OK, min distance &lt; 8 m.

## Toolface (planning only)

**Function:** `estimateToolface`

| Case | Expected |
|------|----------|
| \|dip\| &gt; 80° at kickoff or target heading | `nearVertical === true` |

Disclaimer required in UI and PDF — see `TOOLFACE_DISCLAIMER` in code.
