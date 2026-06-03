import { round } from "./format";
import type { DecisionHistoryEntry } from "./history";
import type { Recommendation } from "./types";

export type SupervisorDecisionKind =
  | "continue"
  | "correct_naturally"
  | "shorten_interval"
  | "steer"
  | "stop_hole";

export type SupervisorDecisionOption = {
  kind: SupervisorDecisionKind;
  label: string;
  description: string;
};

export const SUPERVISOR_DECISIONS: SupervisorDecisionOption[] = [
  {
    kind: "continue",
    label: "Continue",
    description: "Accept current trajectory; resurvey at planned interval.",
  },
  {
    kind: "correct_naturally",
    label: "Correct naturally",
    description: "Follow recommended dip/azi over the next interval without steering tools.",
  },
  {
    kind: "shorten_interval",
    label: "Shorten survey interval",
    description: "Reduce next survey spacing while correcting.",
  },
  {
    kind: "steer",
    label: "Steer",
    description: "Escalate for directional tooling or motor steering.",
  },
  {
    kind: "stop_hole",
    label: "Stop hole",
    description: "Pause drilling for geology / supervisor review before TD.",
  },
];

export function entryForSupervisorDecision(
  kind: SupervisorDecisionKind,
  reco: Recommendation | null,
  notes?: string
): Omit<DecisionHistoryEntry, "id" | "timestamp"> {
  const option = SUPERVISOR_DECISIONS.find((d) => d.kind === kind)!;
  const mdLabel = reco ? ` at MD ${round(reco.current.md, 0)} m` : "";
  return {
    type: "supervisor_decision",
    summary: `Supervisor: ${option.label}${mdLabel}`,
    detail: notes?.trim() ? `${option.description}\nNotes: ${notes.trim()}` : option.description,
    md: reco?.current.md,
    statusLabel: reco?.classification.label,
    actionTaken: option.label,
  };
}

export function suggestedNextInterval(
  current: number,
  kind: SupervisorDecisionKind
): number | null {
  if (kind !== "shorten_interval") return null;
  return Math.max(10, Math.round(current / 2));
}
