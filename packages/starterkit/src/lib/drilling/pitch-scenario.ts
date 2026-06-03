import { parseSurveyCsv } from "./csv";
import { defaultSampleTarget } from "./sample-target";
import type { SurveyRecord, TargetConfig } from "./types";
import { SAMPLE_ACTUAL_CSV, SAMPLE_PLAN_CSV } from "@/lib/sample-data";

export type PitchHighlight =
  | "scenario-lab"
  | "status"
  | "kpis"
  | "projected-miss"
  | "recommendation"
  | "recovery-guidance"
  | "miss-vector"
  | "qa-panel"
  | "charts"
  | "manual-survey"
  | "export"
  | "history";

export type PitchStep = {
  id: string;
  title: string;
  narrative: string;
  presenterTip?: string;
  mode: "simple" | "advanced";
  highlight?: PitchHighlight;
  showProductSummary?: boolean;
  actualRecords: SurveyRecord[];
  target?: Partial<TargetConfig>;
};

const fullPlan = parseSurveyCsv(SAMPLE_PLAN_CSV);
const fullActual = parseSurveyCsv(SAMPLE_ACTUAL_CSV);

/** Collar + one interval on plan */
const onPlanActual: SurveyRecord[] = [
  { md: 0, dip: -60, azimuth: 125 },
  { md: 30, dip: -60.4, azimuth: 125.2 },
];

function sliceActual(count: number): SurveyRecord[] {
  return fullActual.slice(0, Math.max(1, count));
}

export const PITCH_STEPS: PitchStep[] = [
  {
    id: "intro",
    title: "Welcome",
    narrative:
      "TargetLock IQ turns every downhole survey into an immediate drilling decision. This tour walks through a hole moving from on-plan to off-target, then recovering with a clear handover. Open Guide in the header anytime for the product overview.",
    presenterTip: "Use Next to follow the story. Highlighted areas show where to look on screen.",
    mode: "simple",
    actualRecords: onPlanActual,
  },
  {
    id: "scenario_lab",
    title: "Scenario Lab",
    narrative:
      "Use Scenario lab to load synthetic cases for testing, training, validation, and demos without real drill data. Built-in scenarios cover on-plan, gradual drift, recoverable correction, Motor/Navi review, wedge/branch review, QA survey jumps, and invalid imports; Custom builds a hole from start dip/azimuth, target depth, planned lift/swing, drift pattern, and survey noise. Loaded runs are marked as simulated, exports include the scenario name, and this does not replace validation with real client or historical data.",
    presenterTip: "Open Scenario lab after the tour to try a built-in case.",
    mode: "simple",
    highlight: "scenario-lab",
    actualRecords: onPlanActual,
  },
  {
    id: "on_plan",
    title: "On plan at collar",
    narrative:
      "Early surveys match the planned trajectory. Status is on track, plan offset is small, and projected miss at target is inside tolerance.",
    presenterTip: "Point to the plan vs actual charts — they overlap.",
    mode: "simple",
    highlight: "status",
    actualRecords: onPlanActual,
  },
  {
    id: "drift_start",
    title: "Surveys start drifting",
    narrative:
      "As drilling continues, azimuth walks right and dip flattens slightly. Plan offset grows but the hole is still recoverable within the configured dogleg.",
    mode: "simple",
    highlight: "kpis",
    actualRecords: sliceActual(5),
  },
  {
    id: "miss_flagged",
    title: "Projected target miss",
    narrative:
      "If the hole continues on the current trend with no correction, it will miss the target envelope at TD. The projected miss and miss vector quantify the risk.",
    mode: "simple",
    highlight: "projected-miss",
    actualRecords: sliceActual(10),
  },
  {
    id: "recommendation",
    title: "Driller-friendly correction",
    narrative:
      "TargetLock recommends the next interval aim — lift or drop, swing left or right — limited by max DLS. This is the rig-floor instruction set.",
    mode: "simple",
    highlight: "recommendation",
    actualRecords: fullActual,
  },
  {
    id: "recovery_guidance",
    title: "Recovery guidance",
    narrative:
      "The Recovery guidance panel answers what to do next: current action, best recovery method, next aim, and when to escalate — without engineering overload.",
    presenterTip:
      "Point to Current action and Escalate by — this is decision support, not a motor order.",
    mode: "simple",
    highlight: "recovery-guidance",
    actualRecords: fullActual,
  },
  {
    id: "qa_risk",
    title: "QA/QC flags target risk",
    narrative:
      "Advanced mode surfaces interval, DLS, plan offset, recovery, and target QA flags so the geologist or supervisor can validate before the next interval.",
    mode: "advanced",
    highlight: "qa-panel",
    actualRecords: fullActual,
  },
  {
    id: "add_survey",
    title: "Add the next survey",
    narrative:
      "The driller enters the camera survey (or uses aim preload). The recommendation and charts update immediately — survey-to-decision in seconds.",
    mode: "simple",
    highlight: "manual-survey",
    actualRecords: fullActual,
    presenterTip: "Click “Use aim” then “Add survey” to simulate the next station.",
  },
  {
    id: "export_pdf",
    title: "PDF shift handover",
    narrative:
      "Export a professional PDF for shift handover: status, metrics, correction options, QA flags, and recent decision history — ready for the geologist or next crew.",
    mode: "simple",
    highlight: "export",
    actualRecords: fullActual,
    presenterTip: "Click Export PDF to download the handover document.",
  },
];

export function getPitchStep(index: number): PitchStep | null {
  if (index < 0 || index >= PITCH_STEPS.length) return null;
  return PITCH_STEPS[index];
}

export function resolvePitchTarget(step: PitchStep): TargetConfig {
  const base = defaultSampleTarget();
  return { ...base, ...step.target };
}

export function getPitchPlanRecords(): SurveyRecord[] {
  return fullPlan;
}

export const PITCH_STEP_COUNT = PITCH_STEPS.length;
