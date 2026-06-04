export type GuideFlowId = "quick" | "standard" | "branch";

export type AdvancedTab =
  | "trajectory"
  | "branch-program"
  | "steering"
  | "qaqc"
  | "decisions"
  | "math"
  | "method-purpose"
  | "validation"
  | "setup";

export type GuideHighlight =
  | "scenario-lab"
  | "hole-details"
  | "hole-plan-upload"
  | "survey-upload"
  | "hole-package"
  | "mode-toggle"
  | "status"
  | "kpis"
  | "projected-miss"
  | "action-plan"
  | "recommendation"
  | "recovery-guidance"
  | "miss-vector"
  | "charts"
  | "manual-survey"
  | "fill-from-action-plan"
  | "export"
  | "history"
  | "qa-panel"
  | "steering-panel"
  | "math-panel"
  | "setup-panel"
  | "validation-panel"
  | "survey-tool-profile"
  | "plan-corridor"
  | "branch-program"
  | "branch-mother-path"
  | "branch-targets"
  | "kickoff-planner"
  | "branch-daughters"
  | "branch-approval"
  | "branch-export";

export type GuideDemoAction = {
  kind: "builtin-scenario" | "branch-scenario";
  scenarioId: string;
  label: string;
};

export type GuideStep = {
  id: string;
  title: string;
  purpose: string;
  lookAt: string;
  whyItMatters: string;
  caution?: string;
  mode?: "simple" | "advanced";
  highlight?: GuideHighlight;
  advancedTab?: AdvancedTab;
  demoAction?: GuideDemoAction;
};

export type GuideFlowMeta = {
  id: GuideFlowId;
  title: string;
  subtitle: string;
  durationLabel: string;
  stepCount: number;
  audience: string;
};
