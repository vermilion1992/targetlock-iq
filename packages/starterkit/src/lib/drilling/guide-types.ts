export type GuideFlowId = "quick" | "standard" | "branch";



/** Advanced tab ids in the tab bar, plus virtual targets used only by the guide. */

export type AdvancedTab =

  | "trajectory"

  | "surveys"

  | "branch-program"

  /** Virtual: opens How it works overlay (not a tab bar item). */

  | "math"

  | "method-purpose"

  | "roadmap"

  | "execution"

  | "settings";



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

  | "surveys-panel"

  | "manual-survey"

  | "fill-from-action-plan"

  | "export"

  | "math-panel"

  | "settings-panel"

  | "execution-panel"

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


