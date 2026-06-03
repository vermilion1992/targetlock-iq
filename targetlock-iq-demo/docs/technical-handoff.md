# TargetLock IQ Technical Handoff

## Current stack

This demo is intentionally dependency-free:

- `index.html` for structure.
- `styles.css` for layout and visual design.
- `app.js` for state, survey math, recommendations, charts, CSV parsing, and report export.

It can be opened directly in a browser or served from a static web server. This makes it easy to transfer into Cursor before choosing a production stack.

## Recommended next stack

For a serious prototype, move to:

- Vite.
- React or Svelte.
- TypeScript.
- IndexedDB for offline rig storage.
- A plotting library for production charts, or Three.js for the 3D trajectory view.
- Unit tests around desurvey and recommendation math.

## Main modules to extract

From `app.js`, extract these into separate modules:

- `csv.ts`: CSV parsing and survey import adapters.
- `geometry.ts`: vector, dip/azimuth, dogleg, and minimum curvature math.
- `desurvey.ts`: planned and actual trajectory generation.
- `recommendation.ts`: target projection, correction options, and action classification.
- `qa.ts`: survey QA/QC flag generation.
- `report.ts`: shift report generation.
- `ui-mode.ts`: simple versus advanced screen state and role-based visibility.

## Current calculation flow

1. Parse planned and actual CSV data.
2. Build station coordinates using minimum curvature.
3. Read target MD, target XYZ offset, tolerance, max DLS, and next interval.
4. Compare actual station to plan at the same MD.
5. Project the current hole to target MD if no correction is made.
6. Calculate miss vector and total miss.
7. Calculate direction from current position to target.
8. Convert that direction into required dip and azimuth.
9. Limit the next interval recommendation by max DLS.
10. Build correction options and QA/QC flags.
11. Render the same data in Simple mode for rig-floor use or Advanced mode for technical review.

## Current data assumptions

- Coordinates are offsets from collar, not absolute mine grid coordinates.
- `d` means positive down.
- Dips are negative downward, matching common exploration drilling convention.
- Azimuth is degrees clockwise from north.
- Target tolerance is a spherical/visual envelope in metres.
- The app does not yet model survey uncertainty, magnetic interference, tool calibration, or ground prediction.

## Production safety work

Before field use, add:

- Unit tests using known survey examples.
- QA/QC validation against trusted desurvey software.
- Coordinate reference system handling.
- Survey uncertainty and confidence envelopes.
- Repeat survey comparison.
- Magnetic azimuth warnings.
- Approval gates for high-risk recommendations.
- Clear audit trail for every recommendation and human decision.

## High-value next features

1. Real project files:
   - Save/load a hole package with plan, actuals, target, notes, and decisions.

2. Manual survey workflow:
   - Add survey source, timestamp, tool serial, survey quality, and driller initials.
   - Add notes for why the driller accepted, rejected, or modified the suggested aim.

3. Steering mode:
   - Tool library for natural drilling, DeviDrill, motor, wedge, and branch workflows.
   - Toolface recommendation.
   - Required dogleg versus tool capability.

4. Geologist approval:
   - Continue.
   - Correct naturally.
   - Shorten survey interval.
   - Steer.
   - Wedge/branch.
   - Stop hole.

5. Integrations:
   - IMDEX HUB-IQ and SURVEY-IQ imports.
   - Seequent, acQuire, maxgeo, and Micromine exports.

## Cursor prompt to continue

Use this prompt in Cursor:

```text
We are building TargetLock IQ, a diamond drilling trajectory co-pilot. Start from the static demo in this folder. Convert it into a Vite + TypeScript app while preserving the current behavior. First extract the survey math and recommendation logic into tested modules, then recreate the UI with components. Keep the product rig-floor focused: planned trajectory, actual surveys, target envelope, projected miss, next interval dip/azimuth aim, correction options, QA/QC flags, and report export.
```
