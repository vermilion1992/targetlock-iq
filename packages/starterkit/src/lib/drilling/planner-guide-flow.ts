/**
 * Interactive planner tour — the planner counterpart to the dashboard guide
 * flows. Each step switches the planner tab and the tour panel narrates what
 * to look at. The institutional demo program is idempotent, so the tour can
 * offer to load it without backing up state.
 */

/** Mirrors PlannerTab in components/planner/PlannerShell.tsx. */
export type PlannerGuideTab =
  | "create"
  | "coordinates"
  | "plans"
  | "program"
  | "map"
  | "scene3d"
  | "qa"
  | "review"
  | "package";

export type PlannerGuideStep = {
  id: string;
  title: string;
  purpose: string;
  lookAt: string;
  whyItMatters: string;
  caution?: string;
  tab: PlannerGuideTab;
  /** Offer the "Load demo program" action on this step. */
  offersDemo?: boolean;
};

export const PLANNER_GUIDE_FLOW_META = {
  id: "planner" as const,
  title: "Planner workflow tour",
  subtitle: "Plans → Program → Map → 3D → QA → Review → Package → handoff",
  durationLabel: "≈ 5 minutes",
  audience: "First planner session",
};

export const PLANNER_GUIDE_STEPS: PlannerGuideStep[] = [
  {
    id: "plans-library",
    title: "Plans — the program library",
    purpose: "See every hole in the selected program with status, type, and QA at a glance.",
    lookAt:
      "The plan table: standard and daughter holes, status badges (draft, planned, approved, active), and the program selector in the header.",
    whyItMatters:
      "This is the planner's home base — everything else in the tour operates on the program you select here.",
    tab: "plans",
    offersDemo: true,
  },
  {
    id: "create-wizard",
    title: "Create — plan a new hole",
    purpose: "Walk the wizard: identity, collar, target, constraints, generate, review, publish.",
    lookAt:
      "The stepper across the top. Constraints include path design — straight, build-and-hold, or dogleg-constrained curve-to-target.",
    whyItMatters:
      "Generated plans flow through the same QA and approval pipeline as imported ones, so nothing skips review.",
    caution: "The solver refuses infeasible curves instead of silently generating a bad plan.",
    tab: "create",
  },
  {
    id: "coordinates-register",
    title: "Coordinates — the program register",
    purpose: "Audit collars, GPS/grid metadata, targets, and kickoffs in one table.",
    lookAt: "Coordinate status badges and any warnings about missing or inconsistent metadata.",
    whyItMatters:
      "Coordinate mistakes are the most expensive planning errors in the field — resolve warnings before approval.",
    tab: "coordinates",
  },
  {
    id: "program-overview",
    title: "Program — readiness and lifecycle",
    purpose: "Check program-level readiness, approvals, and execution status.",
    lookAt: "Per-hole readiness, the relationship tree for mother/daughter holes, and lifecycle stages.",
    whyItMatters: "Supervisors sign off programs, not individual screens — this is their summary view.",
    tab: "program",
  },
  {
    id: "map-plan-view",
    title: "Map — plan view sanity check",
    purpose: "Verify collar and target placement in plan view or on satellite imagery.",
    lookAt: "Hole traces, target markers, kickoff nodes, and spatial warnings under the map.",
    whyItMatters: "A target plotted in the wrong paddock is obvious here and invisible in a table.",
    tab: "map",
  },
  {
    id: "scene-3d",
    title: "3D — the program in space",
    purpose: "Orbit the full program: traces, targets, uncertainty envelopes, clearance risks, geology.",
    lookAt:
      "Toolbar toggles — uncertainty envelopes, actual traces, geology overlays, and the vertical section plane. Import OBJ/DXF wireframes below the scene.",
    whyItMatters:
      "Clearance and geometry problems that hide in 2D jump out in 3D — and geology overlays show what the holes are actually chasing.",
    caution: "Geology overlays are display-only; no geological interpretation is performed.",
    tab: "scene3d",
  },
  {
    id: "qa-clearance",
    title: "QA — clearance and drillability",
    purpose: "Review anti-collision separation factors, clearance distances, and drillability checks.",
    lookAt:
      "The clearance table's distance and separation-factor columns, QA severity badges, and the configurable thresholds panel.",
    whyItMatters:
      "Blockers here stop approval. Separation factors use the simplified uncertainty model — verify independently for regulatory sign-off.",
    tab: "qa",
  },
  {
    id: "review-approve",
    title: "Review — the decision page",
    purpose: "Approve, revise, or activate the selected plan with full context.",
    lookAt: "Readiness checklist, QA summary, approval snapshot, and lock state.",
    whyItMatters:
      "Approval snapshots hash the plan — any later edit flags the approval as stale.",
    tab: "review",
  },
  {
    id: "package-exports",
    title: "Package — evidence and handoff files",
    purpose: "Export planning PDFs, contractor CSVs, trajectory DXF, and the program manifest.",
    lookAt: "Program package and per-hole package sections, including the DXF export for CAD/mining packages.",
    whyItMatters: "Contractors drill from these files, not from the app — the package is the deliverable.",
    tab: "package",
  },
  {
    id: "handoff-execution",
    title: "Handoff — drill against the plan",
    purpose: "Activate an approved plan to lock it and execute against it in the TargetLock dashboard.",
    lookAt:
      "The activate action on Review, then the execution banner in the dashboard once drilling starts.",
    whyItMatters:
      "Locking the plan preserves the audit trail: every steering decision is recorded against the approved geometry.",
    caution: "Contractor, geologist, and supervisor approval is required before drilling.",
    tab: "review",
  },
];

export function plannerGuideStepCount(): number {
  return PLANNER_GUIDE_STEPS.length;
}
