# HUB-IQ / SURVEY-IQ CSV import (v1)

TargetLock IQ v1 imports **planned** and **actual** trajectories via CSV. This document describes column layouts compatible with common IMDEX-style exports and the built-in parser.

## Download templates

From a running app (`npm run dev` in `packages/starterkit`):

| File | URL |
|------|-----|
| Planned example | http://localhost:3000/templates/hub-iq-planned-example.csv |
| Actual example | http://localhost:3000/templates/hub-iq-actual-example.csv |

Source files: [`packages/starterkit/public/templates/`](../../packages/starterkit/public/templates/)

## Required columns

### Planned hole

| Column (any alias) | Unit | Required |
|--------------------|------|----------|
| `md`, `depth`, `measured_depth`, `measured_depth_m`, `survey_depth` | metres | Yes |
| `dip`, `inclination`, `inc`, `inclination_deg`, `dip_deg` | degrees (negative down) | Yes |
| `azimuth`, `azi`, `az`, `azimuth_deg`, `bearing` | degrees CW from north | Yes |
| `tolerance_m`, `tolerance`, `target_tolerance` | metres | No |
| `dip_tolerance_deg`, `dip_tolerance` | degrees | No |
| `azi_tolerance_deg`, `azimuth_tolerance_deg`, `azi_tolerance` | degrees | No |

Extra columns (e.g. `hole_id`, `survey_date`) are ignored.

### Actual surveys

Same as planned for `md`, `dip`/`inclination`, `azimuth`. Tolerance columns are not required on actuals.

## Import workflow

1. Export planned trajectory and actual surveys from HUB-IQ / SURVEY-IQ (or use company CSV standard).  
2. In TargetLock IQ, **Planned CSV** → select planned file.  
3. **Actual CSV** → select actual file.  
4. **Use planned target** to snap target MD/position from plan.  
5. Review recommendation and log supervisor decision (Advanced).

## v2 integration (roadmap)

- Direct API / file-drop from HUB-IQ without manual export  
- Hole ID matching between plan and actual files  
- Survey QC flags from SURVEY-IQ (magnetic, repeat survey)  
- Automatic sync when new survey is published  

## Validation

Before operational use, compare desurvey output at 2–3 stations against your site certified desurvey package. See [risk-and-validation-plan.md](./risk-and-validation-plan.md).
