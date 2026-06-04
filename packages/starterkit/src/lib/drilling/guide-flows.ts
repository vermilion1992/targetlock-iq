import type {
  AdvancedTab,
  GuideFlowId,
  GuideFlowMeta,
  GuideHighlight,
  GuideStep,
} from "./guide-types";

export const GUIDE_FLOWS: GuideFlowMeta[] = [
  {
    id: "quick",
    title: "Quick orientation",
    subtitle: "Layout, modes, and where decisions live",
    durationLabel: "~5 min",
    stepCount: 6,
    audience: "First visit — driller, geologist, or supervisor",
  },
  {
    id: "standard",
    title: "Standard hole workflow",
    subtitle: "Plan → surveys → action plan → export",
    durationLabel: "~25 min",
    stepCount: 20,
    audience: "Day-to-day directional drilling on a single hole",
  },
  {
    id: "branch",
    title: "Branch / daughter hole workflow",
    subtitle: "Mother hole, targets, kickoff, approval, branch PDF",
    durationLabel: "~20 min",
    stepCount: 12,
    audience: "Multi-leg programs and daughter-hole planning",
  },
];

export const GUIDE_HIGHLIGHT_TAB: Partial<Record<GuideHighlight, AdvancedTab>> = {
  charts: "trajectory",
  "qa-panel": "qaqc",
  history: "decisions",
  "steering-panel": "steering",
  "math-panel": "math",
  "setup-panel": "setup",
  "validation-panel": "validation",
  "survey-tool-profile": "setup",
  "plan-corridor": "setup",
  "hole-package": "setup",
  "branch-program": "branch-program",
  "branch-mother-path": "branch-program",
  "branch-targets": "branch-program",
  "kickoff-planner": "branch-program",
  "branch-daughters": "branch-program",
  "branch-approval": "branch-program",
  "branch-export": "branch-program",
};

export const QUICK_ORIENTATION_STEPS: GuideStep[] = [
  {
    id: "app-purpose",
    title: "What TargetLock IQ is for",
    purpose:
      "TargetLock IQ connects planned trajectory, downhole surveys, and target geometry so each survey becomes an immediate drilling decision.",
    lookAt: "The rig dashboard header and status badge when data is loaded.",
    whyItMatters:
      "Reduces delay between survey delivery and the next interval aim — especially on deep exploration holes.",
    mode: "simple",
  },
  {
    id: "sidebar-setup",
    title: "Sidebar = setup and data",
    purpose:
      "The left sidebar holds hole identity, CSV imports, manual survey entry, target setup, and exports.",
    lookAt: "Hole data uploads and Add survey panels in the sidebar.",
    whyItMatters:
      "Keeping imports and entry on the left leaves the main workspace free for interpretation.",
    highlight: "hole-plan-upload",
    mode: "simple",
  },
  {
    id: "workspace-decisions",
    title: "Main workspace = decisions",
    purpose:
      "KPIs, projected miss, and the Action plan summarize whether the hole is on track and what to aim for next.",
    lookAt: "The KPI row and Action plan panel in the centre of the screen.",
    whyItMatters:
      "This is what the driller and shift supervisor review after each survey.",
    highlight: "kpis",
    mode: "simple",
  },
  {
    id: "simple-mode",
    title: "Simple mode = field-ready summary",
    purpose:
      "Simple mode hides advanced tabs and shows plan/section charts plus a concise action plan.",
    lookAt: "The Simple / Advanced toggle and the simplified chart band.",
    whyItMatters:
      "Designed for rig-floor use without engineering overload.",
    highlight: "mode-toggle",
    mode: "simple",
  },
  {
    id: "advanced-mode",
    title: "Advanced mode = technical review",
    purpose:
      "Advanced mode adds trajectory detail, steering feasibility, QA/QC, math reference, method & purpose, validation, and setup.",
    lookAt: "Switch to Advanced and skim the tab bar (Trajectory, Steering, QA/QC, etc.).",
    whyItMatters:
      "Geologists and directional contractors validate recommendations before committing to a correction.",
    highlight: "mode-toggle",
    mode: "advanced",
    advancedTab: "trajectory",
  },
  {
    id: "scenario-lab",
    title: "Scenario Lab = safe testing data",
    purpose:
      "Scenario lab loads synthetic holes and branch programs for training and validation without touching live client data.",
    lookAt: "The Scenario lab button in the top bar.",
    whyItMatters:
      "Use built-in or custom scenarios to learn the UI; always validate conclusions against real surveys before field use.",
    highlight: "scenario-lab",
    caution:
      "Simulated runs are labelled in the app and on exports. They do not replace validation with client or historical data.",
    mode: "simple",
  },
];

export const STANDARD_HOLE_STEPS: GuideStep[] = [
  {
    id: "welcome",
    title: "Welcome to TargetLock IQ",
    purpose:
      "This walkthrough covers a single-hole workflow from plan import through handover export.",
    lookAt: "The Guide panel at the bottom of the screen — use Next to move through steps.",
    whyItMatters:
      "Follow the sequence once with your own data or load a demo scenario when a step offers it.",
    mode: "simple",
  },
  {
    id: "simple-vs-advanced",
    title: "Simple vs Advanced",
    purpose:
      "Simple mode is for rig-floor decisions; Advanced mode exposes trajectory, steering, QA/QC, and validation detail.",
    lookAt: "The Simple / Advanced toggle in the top bar.",
    whyItMatters:
      "Most shifts stay in Simple; open Advanced when reviewing feasibility or signing off assumptions.",
    highlight: "mode-toggle",
    mode: "simple",
  },
  {
    id: "hole-details",
    title: "Hole details",
    purpose: "Hole ID and site name identify the active hole in the library and on exports.",
    lookAt: "Hole ID / name and Site / project fields in the sidebar.",
    whyItMatters: "Correct naming avoids mixing holes in handover PDFs and package backups.",
    highlight: "hole-details",
    mode: "simple",
  },
  {
    id: "hole-plan-upload",
    title: "Upload a hole plan",
    purpose:
      "The planned trajectory CSV defines desurvey path, target geometry, and corridor checks.",
    lookAt: "Hole plan file input under Hole data in the sidebar.",
    whyItMatters: "Without a plan, offset, projected miss, and correction options cannot be calculated.",
    highlight: "hole-plan-upload",
    mode: "simple",
  },
  {
    id: "survey-upload",
    title: "Upload survey results",
    purpose: "Actual survey CSV drives the live hole path and all recommendations.",
    lookAt: "Survey results file input under Hole data.",
    whyItMatters: "Each new survey should refresh KPIs and the action plan within seconds of import.",
    highlight: "survey-upload",
    mode: "simple",
  },
  {
    id: "kpis",
    title: "Read the four key KPIs",
    purpose:
      "Latest survey depth, actual dip/azimuth, offset from plan, and projected miss at target summarize hole health.",
    lookAt: "The four metric tiles below the top bar.",
    whyItMatters:
      "Projected miss is the primary early warning before the hole is irrecoverable at the configured dogleg.",
    highlight: "kpis",
    mode: "simple",
    demoAction: {
      kind: "builtin-scenario",
      scenarioId: "gradual-drift",
      label: "Load demo: gradual drift",
    },
  },
  {
    id: "action-plan",
    title: "Understand the Action Plan",
    purpose:
      "The Action plan states current status, best recovery method, next interval aim, and escalation timing in rig-floor language.",
    lookAt: "The Action plan panel (status, method, aim chips, escalate-by).",
    whyItMatters:
      "This is decision support for the next interval — not a motor order or definitive geologic sign-off.",
    highlight: "action-plan",
    mode: "simple",
    caution:
      "All steering, wedge, and branch recommendations are advisory. Confirm with the directional contractor and site geologist.",
  },
  {
    id: "add-survey-manual",
    title: "Add a new survey manually",
    purpose: "Enter MD, dip, and azimuth from the camera when CSV import is not used.",
    lookAt: "Add survey fields and the Add survey button in the sidebar.",
    whyItMatters: "Manual entry keeps the dashboard current between file drops from the survey tool.",
    highlight: "manual-survey",
    mode: "simple",
  },
  {
    id: "fill-from-action-plan",
    title: 'Use "Fill from action plan"',
    purpose:
      "Copies recommended dip and azimuth from the current action plan into the manual survey form.",
    lookAt: "Fill from action plan button above Add survey.",
    whyItMatters: "Reduces transcription error when recording the intended next-interval aim.",
    highlight: "fill-from-action-plan",
    mode: "simple",
  },
  {
    id: "charts",
    title: "Check Plan / Section / Deviation charts",
    purpose:
      "Plan view, vertical section, and deviation charts show spatial separation between plan and actual.",
    lookAt: "Simple-mode chart band, or Advanced → Trajectory for the full set including 3D.",
    whyItMatters: "Visual confirmation supports the numeric KPIs before approving a correction.",
    highlight: "charts",
    mode: "simple",
    advancedTab: "trajectory",
  },
  {
    id: "open-advanced",
    title: "Open Advanced mode",
    purpose: "Advanced tabs group trajectory, steering, QA/QC, decisions, math, validation, and setup.",
    lookAt: "Advanced toggle and tab bar under the main workspace.",
    whyItMatters: "Technical review happens here without cluttering the rig-floor Simple view.",
    highlight: "mode-toggle",
    mode: "advanced",
    advancedTab: "trajectory",
  },
  {
    id: "steering-feasibility",
    title: "Review Steering Feasibility",
    purpose:
      "Compares required dogleg to configured limits and classifies natural, motor/Navi, and wedge/branch options.",
    lookAt: "Advanced → Steering feasibility — verdict summary and method table.",
    whyItMatters:
      "Shows whether the recommended correction is achievable with assumed tooling before escalating.",
    highlight: "steering-panel",
    mode: "advanced",
    advancedTab: "steering",
    caution: "Feasibility uses capability assumptions — validate against contractor limits and hole conditions.",
    demoAction: {
      kind: "builtin-scenario",
      scenarioId: "steering-review",
      label: "Load demo: motor / Navi review",
    },
  },
  {
    id: "qa-qc",
    title: "Review QA/QC flags",
    purpose:
      "Interval, DLS, plan offset, recovery, and target QA flags highlight data or trajectory risks per station.",
    lookAt: "Advanced → QA/QC tab and flag list.",
    whyItMatters: "Supervisors and geologists use flags to validate surveys before acting on the action plan.",
    highlight: "qa-panel",
    mode: "advanced",
    advancedTab: "qaqc",
  },
  {
    id: "math-reference",
    title: "Check Math Reference",
    purpose: "Shows desurvey basis, required DLS, and vector geometry behind the recommendation.",
    lookAt: "Advanced → Math reference panel.",
    whyItMatters: "Supports peer review and alignment with offline spreadsheet checks.",
    highlight: "math-panel",
    mode: "advanced",
    advancedTab: "math",
  },
  {
    id: "survey-tool-profile",
    title: "Set Survey Tool Profile",
    purpose:
      "Documents assumed survey tool accuracy and tolerance bands used in uncertainty messaging.",
    lookAt: "Advanced → Setup / assumptions → Survey tool profile section.",
    whyItMatters: "Aligns QA messaging with the tool actually running in the hole.",
    highlight: "survey-tool-profile",
    mode: "advanced",
    advancedTab: "setup",
  },
  {
    id: "plan-corridor",
    title: "Adjust Plan Corridor / Target setup",
    purpose:
      "Plan corridor width and target MD/E/N/D define tolerance and recoverability context in the sidebar (Advanced).",
    lookAt: "Target setup and Plan corridor editor in the sidebar (visible in Advanced).",
    whyItMatters: "Corridor and target geometry drive offset and miss calculations — keep them aligned with the geologic model.",
    highlight: "plan-corridor",
    mode: "advanced",
  },
  {
    id: "scenario-lab",
    title: "Use Scenario Lab",
    purpose:
      "Load built-in synthetic holes (on-plan, drift, recoverable, steering review, etc.) for training without client data.",
    lookAt: "Scenario lab button — Built-in scenarios and Custom generator.",
    whyItMatters: "Safe environment to practice imports, surveys, and exports before a live hole.",
    highlight: "scenario-lab",
    mode: "simple",
  },
  {
    id: "export-handover",
    title: "Export handover PDF",
    purpose: "Produces a shift handover PDF with status, metrics, correction context, QA flags, and recent history.",
    lookAt: "Export PDF in the sidebar Hole data row.",
    whyItMatters: "Standardizes communication to the next crew or geologist on shift change.",
    highlight: "export",
    mode: "simple",
    demoAction: {
      kind: "builtin-scenario",
      scenarioId: "recoverable",
      label: "Load demo: recoverable correction",
    },
  },
  {
    id: "export-hole-package",
    title: "Export / import full hole package",
    purpose:
      "JSON hole package backs up the entire local library — all holes, branch programs, daughters, and assumptions.",
    lookAt: "Advanced → Setup / assumptions → Hole package backup section.",
    whyItMatters: "Browser storage can be cleared; export before upgrades or shared-machine use.",
    highlight: "hole-package",
    mode: "advanced",
    advancedTab: "setup",
  },
  {
    id: "limitations",
    title: "Known limitations and validation reminder",
    purpose:
      "TargetLock IQ is decision support. Validate math, assumptions, and recommendations against client standards and field measurements.",
    lookAt: "Advanced → Validation tab — sanity checks and assumption sign-off.",
    whyItMatters:
      "Pilot and RC builds require explicit validation before relying on outputs for steering or branch commitments.",
    highlight: "validation-panel",
    mode: "advanced",
    advancedTab: "validation",
    caution:
      "Do not treat projected miss, toolface, kickoff depth, or branch separation as authoritative without site approval.",
  },
];

export const BRANCH_HOLE_STEPS: GuideStep[] = [
  {
    id: "mother-daughter-concept",
    title: "What is a mother/daughter program",
    purpose:
      "A mother hole carries the main actual path; daughter holes branch from kickoff depths toward point targets with separation checks.",
    lookAt: "Branch program tab intro copy when no program is loaded.",
    whyItMatters:
      "Keeps multi-leg exploration programs in one workspace instead of disconnected spreadsheets.",
    mode: "advanced",
    advancedTab: "branch-program",
    caution:
      "Kickoff depth, required DLS, toolface, and separation are planning estimates — confirm with the directional contractor and geologist.",
  },
  {
    id: "load-branch-scenario",
    title: "Load Branch Program scenario",
    purpose:
      "Scenario lab → Branch programs loads a mother hole with targets and daughters for testing.",
    lookAt: "Scenario lab → Branch programs list, or Load demo on this step.",
    whyItMatters: "Branch UI needs mother actual surveys and targets before kickoff ranking is meaningful.",
    highlight: "scenario-lab",
    mode: "simple",
    demoAction: {
      kind: "branch-scenario",
      scenarioId: "branch-p2-kickoff-compare",
      label: "Load demo: P2 kickoff comparison",
    },
  },
  {
    id: "mother-actual-path",
    title: "Mother hole actual path",
    purpose: "The mother actual trajectory anchors kickoff station geometry and separation from daughters.",
    lookAt: "Branch program summary and program map charts (mother actual trace).",
    whyItMatters: "Kickoff planner ranks MD steps from the actual mother path — not the plan alone.",
    highlight: "branch-mother-path",
    mode: "advanced",
    advancedTab: "branch-program",
  },
  {
    id: "daughter-targets",
    title: "Add / select daughter targets",
    purpose: "Point targets (E/N/D + tolerance) define where each daughter leg should pierce.",
    lookAt: "Branch target editor table in the Branch program tab.",
    whyItMatters: "Target geometry drives required heading, DLS, and separation columns in the kickoff table.",
    highlight: "branch-targets",
    mode: "advanced",
    advancedTab: "branch-program",
  },
  {
    id: "kickoff-planner",
    title: "Review kickoff options",
    purpose:
      "Kickoff planner ranks candidate MDs with required DLS, method feasibility, and separation from mother/siblings.",
    lookAt: "Kickoff planner ranked table and top options.",
    whyItMatters: "Supports choosing a kickoff depth before saving a daughter draft.",
    highlight: "kickoff-planner",
    mode: "advanced",
    advancedTab: "branch-program",
  },
  {
    id: "dls-separation",
    title: "Understand DLS and separation",
    purpose:
      "Required dogleg and mother/sibling separation columns show whether a kickoff is mechanically and geometrically reasonable.",
    lookAt: "DLS and separation cells in the kickoff planner; method labels (natural, motor/Navi, wedge).",
    whyItMatters: "Prevents selecting kickoffs that violate tooling limits or minimum hole separation.",
    highlight: "kickoff-planner",
    mode: "advanced",
    advancedTab: "branch-program",
    caution: "Method feasibility uses the same advisory assumptions as single-hole steering review.",
  },
  {
    id: "save-daughter-draft",
    title: "Save daughter draft",
    purpose: "Saving creates a daughter hole entry with planned leg and kickoff metadata in the library.",
    lookAt: "Save daughter control in the kickoff planner after selecting a row.",
    whyItMatters: "Draft daughters can be reviewed before approval and before importing daughter actual surveys.",
    highlight: "kickoff-planner",
    mode: "advanced",
    advancedTab: "branch-program",
  },
  {
    id: "approval-gate",
    title: "Approve daughter plan",
    purpose:
      "Approval captures a snapshot of assumptions and plan state; changing setup later may mark the approval stale.",
    lookAt: "Branch approval panel for the active daughter.",
    whyItMatters: "Documents sign-off before treating the daughter plan as field-ready.",
    highlight: "branch-approval",
    mode: "advanced",
    advancedTab: "branch-program",
  },
  {
    id: "switch-active-daughter",
    title: "Switch active daughter",
    purpose: "Sets which daughter hole receives imports, Simple strip context, and branch PDF export.",
    lookAt: "Daughter list — Set active actions.",
    whyItMatters: "Wrong active daughter causes surveys and exports to attach to the wrong leg.",
    highlight: "branch-daughters",
    mode: "advanced",
    advancedTab: "branch-program",
    demoAction: {
      kind: "branch-scenario",
      scenarioId: "branch-p2-three-target",
      label: "Load demo: three targets",
    },
  },
  {
    id: "import-daughter-surveys",
    title: "Import daughter survey results",
    purpose:
      "Survey results import can target the active daughter hole when a branch program is loaded.",
    lookAt: "Survey results upload — import target picker when multiple holes exist.",
    whyItMatters: "Keeps mother and daughter actual paths separate for correct branch overlays.",
    highlight: "survey-upload",
    mode: "simple",
  },
  {
    id: "export-branch-pdf",
    title: "Export branch plan PDF",
    purpose:
      "Branch plan PDF summarizes mother context, daughter plan, kickoff, DLS, separation, and approval state.",
    lookAt: "Export branch plan PDF button at the bottom of the Branch program tab.",
    whyItMatters: "Handover artifact for directional drilling and geology review of the daughter leg.",
    highlight: "branch-export",
    mode: "advanced",
    advancedTab: "branch-program",
  },
  {
    id: "branch-disclaimer",
    title: "Operational disclaimer",
    purpose:
      "Branch and steering outputs remain advisory planning aids until confirmed by qualified personnel.",
    lookAt: "Disclaimer banner at the top of the Branch program tab.",
    whyItMatters: "Sets expectations for pilot testing and field trials — not a replacement for contractor programs.",
    highlight: "branch-program",
    mode: "advanced",
    advancedTab: "branch-program",
    caution:
      "Toolface hints, kickoff MD, and wedge/branch feasibility must be validated on site before drilling a daughter hole.",
  },
];

const FLOW_STEPS: Record<GuideFlowId, GuideStep[]> = {
  quick: QUICK_ORIENTATION_STEPS,
  standard: STANDARD_HOLE_STEPS,
  branch: BRANCH_HOLE_STEPS,
};

export function getGuideSteps(flowId: GuideFlowId): GuideStep[] {
  return FLOW_STEPS[flowId];
}

export function getGuideStep(flowId: GuideFlowId, index: number): GuideStep | null {
  const steps = getGuideSteps(flowId);
  if (index < 0 || index >= steps.length) return null;
  return steps[index];
}

export function getGuideStepCount(flowId: GuideFlowId): number {
  return getGuideSteps(flowId).length;
}

export function getGuideFlowMeta(flowId: GuideFlowId): GuideFlowMeta {
  const meta = GUIDE_FLOWS.find((f) => f.id === flowId);
  if (!meta) throw new Error(`Unknown guide flow: ${flowId}`);
  return meta;
}

export function resolveGuideTab(step: GuideStep): AdvancedTab | undefined {
  if (step.advancedTab) return step.advancedTab;
  if (!step.highlight) return undefined;
  return GUIDE_HIGHLIGHT_TAB[step.highlight];
}

export function guideFocusClass(
  highlight: GuideHighlight | undefined,
  current: GuideHighlight | undefined,
  tourActive: boolean
): string {
  if (!tourActive || !highlight || !current || highlight !== current) return "";
  return "guide-focus pitch-highlight";
}
