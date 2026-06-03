# TargetLock IQ Product Plan

## One-line concept

TargetLock IQ turns each downhole survey into a clear drilling decision: continue, monitor, correct naturally, or switch to active steering before the hole becomes unrecoverable.

## Product thesis

Mineral exploration drilling already has survey tools, cloud platforms, planning systems, and directional drilling hardware. The missing layer is a real-time decision engine that connects them for the driller at the moment a new survey arrives.

The current workflow is often fragmented:

- The geologist designs the planned hole path and target.
- The driller receives collar, dip, azimuth, target depth, and survey requirements.
- Surveys come in every 30 m or another interval.
- Actual trajectory can drift from plan due to ground conditions, bit behavior, rod string, rig setup, structure, or operational parameters.
- Decisions about correction often happen in spreadsheets, calls, or delayed office review.

TargetLock IQ should make that decision immediate, visual, auditable, and practical.

## Primary users

Driller:

- Needs a simple answer during shift.
- Wants to know whether the hole is still recoverable.
- Needs next dip and azimuth aim in plain terms.
- Needs confidence in whether a correction is possible without specialist steering.

Site geologist:

- Owns target tolerance and geological objective.
- Needs planned versus actual and target risk in real time.
- Needs to approve continue, stop, branch, wedge, or steer decisions.

Drilling supervisor:

- Needs consistent decision records across rigs and crews.
- Wants fewer redrills, fewer missed targets, and faster escalation.

Directional drilling specialist:

- Needs DLS, toolface, steering window, branch plan, and tool capability context.

Exploration manager:

- Wants evidence that meters are being used efficiently.
- Wants auditable decisions and better target hit rate.

## Core job to be done

When a new survey arrives, tell the crew:

1. Where is the hole now?
2. Where will it finish if nothing changes?
3. Is the target still achievable?
4. What dip and azimuth should we aim for next?
5. Do we need geologist approval or directional drilling support?

## MVP scope

The first useful version should include:

- Planned hole import by CSV or integration.
- Actual survey import by CSV, manual input, or survey tool adapter.
- Target definition by XYZ point, target plane, or planned trajectory station.
- Target tolerance envelope.
- Minimum curvature desurvey.
- Plan view, section view, and target miss view.
- Next interval recommendation.
- DLS required versus DLS allowed.
- Simple decision status:
  - On track.
  - Watch.
  - Correction needed.
  - Directional steering recommended.
  - Target at risk.
- Shift report export.
- Offline-first tablet operation.

## Advanced product modules

### 1. Steering advisor

For high-end work, TargetLock IQ becomes a steering assistant:

- Calculate achievable correction based on remaining depth and max dogleg.
- Support next 15 m, 30 m, 60 m, and to-target correction options.
- Show natural correction versus active steering.
- Recommend when to shorten survey interval.
- Calculate toolface direction for directional tools.
- Model branch, wedge, sidetrack, and daughter hole options.

### 2. Formation learning

Use historical drilling behavior to predict deviation tendency:

- Lithology.
- Structure and bedding orientation.
- Ground hardness and broken ground.
- Bit type.
- Rod size.
- Drilling method.
- Mud program.
- WOB, RPM, flow, torque, and penetration rate.
- Contractor, rig, and crew history.

Output:

- Expected lift/drop tendency.
- Expected left/right walk tendency.
- Risk of missing target if no earlier correction is made.

### 3. Geology-aware target mode

Targets are often not just points. The product should support:

- Point targets.
- Target plates.
- Orebody intercept windows.
- Fault or contact intercepts.
- Multiple target windows.
- Priority target plus acceptable backup intercept.
- Target tolerance that changes with depth.

### 4. Rig-to-office approvals

Workflow:

1. Driller receives survey result.
2. App flags correction need.
3. Geologist reviews in office or camp.
4. Geologist approves continue, steer, wedge, branch, shorten survey interval, or terminate.
5. Decision is recorded with time, user, survey, and recommendation.

### 5. Enterprise integration

Likely integration targets:

- IMDEX HUB-IQ.
- IMDEX SURVEY-IQ.
- REFLEX and DeviGyro survey exports.
- acQuire.
- maxgeo.
- Seequent Leapfrog / Central.
- Micromine.
- CSV and LAS-style exports where required.

## Data model

Hole:

- Hole ID.
- Project.
- Collar coordinates.
- Datum and coordinate reference.
- Planned start dip and azimuth.
- Planned end depth.
- Active target ID.
- Status.

Trajectory station:

- Hole ID.
- Measured depth.
- Dip.
- Azimuth.
- Easting offset.
- Northing offset.
- Vertical depth.
- Dogleg severity.
- Source: planned, survey, projected, recommendation.

Target:

- Target ID.
- Type: point, plate, interval, volume.
- Easting.
- Northing.
- Vertical depth.
- Target measured depth.
- Radius or tolerance envelope.
- Dip tolerance.
- Azimuth tolerance.
- Priority.

Decision:

- Survey station.
- Projected miss.
- Required correction.
- Recommended action.
- Confidence.
- Approved by.
- Timestamp.
- Notes.

## Calculation approach

The demo uses minimum curvature desurvey:

- Convert dip and azimuth to a 3D unit vector.
- Calculate dogleg between survey stations.
- Apply ratio factor for curved displacement.
- Accumulate east, north, and down offsets.

Recommendation engine:

- Compare actual station against planned station at the same measured depth.
- Project current hole to target depth using current dip and azimuth.
- Calculate projected miss if no correction is made.
- Calculate direction from current position to target.
- Convert that direction into a required dip and azimuth.
- Compare required dogleg to max allowable dogleg.
- Clamp next interval aim if the correction exceeds the dogleg limit.
- Classify action level.

Future production versions should add uncertainty envelopes, tool-specific steering models, and survey QA/QC error propagation.

## Demo user stories

As a driller, I can load the planned hole and the latest surveys so I know whether the hole is drifting.

As a driller, I can see the recommended next dip and azimuth so I have a concrete aim for the next interval.

As a geologist, I can define target tolerance and see whether the planned geological intercept is still likely.

As a supervisor, I can export a report showing what decision was made and why.

As a directional drilling specialist, I can see whether the correction is within max DLS or needs steering hardware.

## User interface principles

- Rig-floor first.
- Large numbers for the current decision.
- Avoid geology-office complexity on the driller screen.
- Show plan, actual, projection, and target in one glance.
- Use clear operational language.
- Make survey interval changes obvious.
- Keep confidence and uncertainty visible.
- Keep Simple mode focused on the next drilling action.
- Use Advanced mode for target tuning, correction scenarios, QA/QC, and audit detail.

## Proposed screens

1. Rig dashboard:
   - Current survey.
   - Status.
   - Projected target miss.
   - Next dip and azimuth aim.
   - Action required.
   - Simple and Advanced display modes.

2. Trajectory view:
   - Plan view.
   - Vertical section.
   - 3D view.
   - Target envelope.

3. Survey entry:
   - Import from survey tool.
   - Manual fallback.
   - QA/QC warnings.

4. Steering mode:
   - Max DLS.
   - Tool capability.
   - Toolface.
   - Branch or wedge options.

5. Approval history:
   - Survey.
   - Recommendation.
   - Decision.
   - User.
   - Timestamp.

## Roadmap

### Phase 1 - Static demo

- Plain browser app.
- Sample data.
- CSV upload.
- Minimum curvature.
- Basic recommendation engine.
- Charts and report export.

### Phase 2 - Field prototype

- Tablet-friendly PWA.
- Offline storage.
- Manual survey entry.
- More robust CSV templates.
- Client-side project files.
- Better target envelope modeling.

### Phase 3 - Integration prototype

- HUB-IQ / SURVEY-IQ adapter.
- Seequent / acQuire export.
- User login.
- Rig and office roles.
- Audit trail.

### Phase 4 - Steering product

- Directional drilling tool capability library.
- DeviDrill and motor workflows.
- Branch and wedge planner.
- Geologist remote approval.
- Predictive deviation learning.

### Phase 5 - Enterprise platform

- Multi-rig fleet dashboard.
- Model training on historical holes.
- Cost and meters-saved analytics.
- Automated end-of-hole performance review.

## Pitch to IMDEX

IMDEX already has survey tools, HUB-IQ, SURVEY-IQ, directional drilling technology, drilling optimization, and digital earth knowledge capability. TargetLock IQ would sit at the intersection of those strengths.

The value proposition:

"Every survey becomes an immediate, validated drilling decision."

Why it fits:

- It increases the value of IMDEX survey tools.
- It makes HUB-IQ more operational for drillers.
- It creates a bridge into directional drilling services.
- It supports real-time drilling optimization.
- It creates measurable client value through fewer missed targets and fewer wasted meters.

## Pilot success metrics

- Reduction in survey-to-decision time.
- Reduction in target miss distance.
- Number of holes recovered back inside tolerance.
- Reduction in redrilled holes.
- Meters saved by earlier correction.
- Driller adoption and trust score.
- Geologist approval turnaround time.
- Reported reduction in spreadsheet/manual workflow.

## Commercial options

- Add-on module inside IMDEX HUB-IQ.
- Per-rig monthly subscription.
- Per-project license.
- Premium steering module.
- Enterprise fleet analytics package.
- Integration API for survey and planning vendors.

## Risks and mitigations

Risk: Users may over-trust recommendations.

Mitigation: Treat output as decision support, show confidence, require approval thresholds, and validate field performance.

Risk: Bad survey data creates bad steering advice.

Mitigation: Add survey QA/QC, repeat-survey checks, magnetic interference warnings, and uncertainty modeling.

Risk: Drillers need simple guidance, not complex charts.

Mitigation: Separate rig dashboard from specialist steering mode.

Risk: Integration complexity slows adoption.

Mitigation: Start with CSV and manual entry, then add official adapters.

Risk: Ground behavior is unpredictable.

Mitigation: Show DLS feasibility and confidence; learn from actual historical deviation.
