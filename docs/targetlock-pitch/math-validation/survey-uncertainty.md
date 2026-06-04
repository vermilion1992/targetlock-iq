# Survey uncertainty assumptions

**Module:** `survey-tool-profile.ts`, `assessSurveyUncertainty`

**Role in RC1:** Advisory layer when projected miss is close to target tolerance — does not replace magnetic interference models or anti-collision ellipse methods.

## What to validate

| Check | Method |
|-------|--------|
| Profile summary on report | Matches Setup → Survey tool profile |
| Assessment level | Changes when tolerance / miss relationship changes |
| Copy | States uncertainty is indicative, not a survey QC certificate |

## Pilot limitation

No ellipse uncertainty or separation factor (Phase 3). Separation in branch program is centre-to-centre geometry only.
