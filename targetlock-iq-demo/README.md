# TargetLock IQ Demo

TargetLock IQ is a demo concept for a diamond drilling trajectory co-pilot. It lets a driller or geologist load a planned hole path, add the latest downhole surveys, compare plan versus actual, project target miss, and calculate the next dip and azimuth aim required to recover the hole.

This is an early static prototype designed to be opened directly in Cursor and continued as a real app.

## Open the demo

Open this file in a browser:

```text
outputs/targetlock-iq-demo/index.html
```

No install step is required. The app uses plain HTML, CSS, and JavaScript.

## Demo workflow

1. Open `index.html`.
2. Press `Load sample`.
3. Review current hole status, projected miss, and next 30 m recommendation.
4. Change target tolerance, max DLS, next survey interval, or target coordinates.
5. Use the prefilled manual survey form to add the next survey and watch the recommendation update.
6. Switch between `Simple` and `Advanced` modes.
7. Hover or focus the `i` icons for field explanations.
8. Upload your own CSVs if desired.
9. Press `Export report` to download a shift-ready summary.

## CSV format

Planned hole CSV:

```csv
md,dip,azimuth,tolerance_m,dip_tolerance_deg,azi_tolerance_deg
0,-60,125,2,2,3
30,-60.5,125.3,2,2,3
```

Actual survey CSV:

```csv
md,dip,azimuth
0,-60,125
30,-59.2,126.6
```

The app also accepts common aliases such as `depth`, `measured_depth`, `azi`, and `az`.

## What is implemented

- Planned trajectory import.
- Actual survey import.
- Minimum curvature desurvey.
- Planned versus actual offset.
- Projected target miss if no correction is made.
- Required dip and azimuth aim for the next interval.
- DLS check against a configurable maximum dogleg.
- Plan view, section view, and deviation chart.
- Target tolerance envelope on trajectory charts.
- Manual survey entry with next-aim fill.
- Simple and Advanced display modes.
- Information hovers for key drilling terms.
- Correction options for 15 m, 30 m, 60 m, and remaining depth.
- Survey QA/QC flags for interval, DLS, plan offset, recovery, and target risk.
- Driller-friendly wording such as steepen, flatten, turn left, and turn right.
- Survey table and downloadable report.

## What should come next

- Real IMDEX / HUB-IQ import adapters.
- Survey QA/QC flags and magnetic interference warnings.
- Directional tool mode for DeviDrill, motors, wedges, and branch holes.
- Lithology and drilling parameter learning.
- Multi-user approvals between rig and office.
- Offline tablet storage and sync.

## Handoff files

- `docs/product-plan.md` contains the full product and roadmap plan.
- `docs/pitch-outline.md` contains an IMDEX-style proposal narrative.
- `docs/technical-handoff.md` explains the current architecture and next engineering steps.

## Important

This demo is for product design and software prototyping only. It is not validated for operational drilling decisions.
