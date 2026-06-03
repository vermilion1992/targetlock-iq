# TargetLock IQ Pitch Outline

## Working title

TargetLock IQ: real-time drillhole trajectory decision support for mineral exploration diamond drilling.

## Problem

Diamond drilling does not always follow the planned path. Survey tools can show where the hole is, but crews still need to decide what to do with that information:

- Continue drilling.
- Adjust naturally.
- Shorten survey interval.
- Escalate to geologist review.
- Use directional drilling support.
- Wedge, branch, or stop.

The painful part is the gap between survey capture and action. That gap costs time, metres, confidence, and sometimes the target.

## Product idea

TargetLock IQ turns every survey into an immediate operational decision.

It ingests the planned trajectory, target envelope, actual survey results, and steering limits. Then it calculates:

- Current actual position.
- Offset from plan.
- Projected target miss if no correction is made.
- Required dip and azimuth to recover.
- Whether the correction is inside max DLS.
- Recommended action level.
- QA/QC warnings.
- Shift-ready report.

## Why IMDEX is a logical partner

IMDEX already has key pieces of the ecosystem:

- Downhole survey tools.
- SURVEY-IQ.
- HUB-IQ.
- Directional drilling technology.
- Drilling optimisation products.
- Digital geology and analytics capability.

TargetLock IQ would make those tools more actionable at the rig by linking survey data to real-time correction decisions.

## Demo story

Hole DDH-0247 is planned to hit a target at 600 m.

By 390 m, actual surveys show the hole walking away from plan. The app shows:

- Current MD: 390 m.
- Plan offset: 32.6 m.
- Projected miss: 63.4 m.
- Status: Correction needed.
- Next 30 m aim: -61.1 dip and 133.2 azimuth.
- Required DLS: 2.44 deg/30 m, inside the configured 3.0 deg/30 m limit.

The driller can add the next survey manually or from a CSV import and immediately see whether the correction is working.

The interface has two levels:

- Simple mode for rig-floor decisions: current survey, projected miss, next aim, manual survey entry, and trajectory charts.
- Advanced mode for geologists, supervisors, and directional drillers: target tuning, correction options, QA/QC flags, deviation charts, and survey tables.

## Differentiators

- Built for the driller first, not only the office.
- Converts survey results into action, not just visualisation.
- Shows whether recovery is feasible before more metres are drilled.
- Supports both simple natural correction and advanced steering workflows.
- Creates an auditable decision record.
- Can become an integration layer across survey tools, planning software, and directional drilling services.

## MVP ask

Run a 90-day field prototype:

1. Use historical holes to validate calculations and recommendations.
2. Deploy a tablet-friendly prototype on one active rig.
3. Compare target hit rate, survey-to-decision time, and manual spreadsheet reduction.
4. Capture driller and geologist feedback.
5. Decide whether to integrate with HUB-IQ/SURVEY-IQ or develop as a standalone pilot module.

## Success metrics

- Faster survey-to-decision time.
- Lower end-of-hole target miss.
- More holes recovered back inside tolerance.
- Fewer unnecessary metres.
- Fewer redrills.
- Higher driller/geologist confidence.
- More consistent decision records.

## Future vision

TargetLock IQ becomes the drilling execution brain:

- Real-time survey capture.
- Predictive deviation by formation and rig parameters.
- Directional tool recommendations.
- Branch and wedge planning.
- Remote geologist approval.
- Fleet-level analytics across contractors, rigs, targets, and ground conditions.
