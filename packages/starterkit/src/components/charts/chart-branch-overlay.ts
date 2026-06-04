import { buildStations } from "@/lib/drilling/desurvey";
import type { BranchTarget } from "@/lib/drilling/branch-program-types";
import type { SurveyRecord, SurveyStation } from "@/lib/drilling/types";

export type ExtraTrajectory = {
  id: string;
  label: string;
  stations: SurveyStation[];
  role: "daughter" | "reference" | "mother" | "sibling";
};

export type KickoffChartMarker = {
  md: number;
  station: SurveyStation;
  label: string;
};

export type TargetChartMarker = {
  e: number;
  n: number;
  d: number;
  label: string;
};

export type BranchChartOverlay = {
  extraTrajectories?: ExtraTrajectory[];
  kickoffMarkers?: KickoffChartMarker[];
  targetMarkers?: TargetChartMarker[];
};

export const DAUGHTER_TRAJECTORY_COLORS = [
  { stroke: "#7c3aed", glow: "rgba(124, 58, 237, 0.15)" },
  { stroke: "#0d9488", glow: "rgba(13, 148, 136, 0.15)" },
  { stroke: "#db2777", glow: "rgba(219, 39, 119, 0.15)" },
] as const;

export const MUTED_MOTHER_TRAJECTORY = {
  stroke: "#94a3b8",
  glow: "rgba(148, 163, 184, 0.12)",
} as const;

export const MUTED_SIBLING_TRAJECTORY = {
  stroke: "#cbd5e1",
  glow: "rgba(203, 213, 225, 0.12)",
} as const;

export function branchTrajectoryColors(
  traj: ExtraTrajectory,
  index: number
): { stroke: string; glow: string } {
  if (traj.role === "mother") return MUTED_MOTHER_TRAJECTORY;
  if (traj.role === "sibling") return MUTED_SIBLING_TRAJECTORY;
  return DAUGHTER_TRAJECTORY_COLORS[index % DAUGHTER_TRAJECTORY_COLORS.length]!;
}

export function stationsFromRecords(records: SurveyRecord[]): SurveyStation[] {
  return buildStations(records);
}

export function buildBranchChartOverlay(opts: {
  daughters: { daughterId: string; planRecords: SurveyRecord[] }[];
  targets: BranchTarget[];
  kickoffs: KickoffChartMarker[];
}): BranchChartOverlay {
  return {
    extraTrajectories: opts.daughters.map((d) => ({
      id: d.daughterId,
      label: d.daughterId,
      stations: stationsFromRecords(d.planRecords),
      role: "daughter",
    })),
    kickoffMarkers: opts.kickoffs,
    targetMarkers: opts.targets.map((t) => ({
      e: t.e,
      n: t.n,
      d: t.d,
      label: t.label,
    })),
  };
}

export function buildBranchChartOverlayWithContext(opts: {
  program: {
    mother: { holeId: string; actualRecords: SurveyRecord[] };
    daughters: { daughterId: string; daughterHoleId: string; planRecords: SurveyRecord[] }[];
    targets: BranchTarget[];
  };
  viewingHoleId: string;
  holeRole: "standard" | "mother" | "daughter";
  kickoffs: KickoffChartMarker[];
}): BranchChartOverlay {
  const extraTrajectories: ExtraTrajectory[] = [];

  if (opts.holeRole === "daughter") {
    extraTrajectories.push({
      id: opts.program.mother.holeId,
      label: `${opts.program.mother.holeId} (mother)`,
      stations: stationsFromRecords(opts.program.mother.actualRecords),
      role: "mother",
    });
    opts.program.daughters.forEach((d) => {
      if (d.daughterHoleId === opts.viewingHoleId) return;
      extraTrajectories.push({
        id: d.daughterId,
        label: `${d.daughterId} (sibling)`,
        stations: stationsFromRecords(d.planRecords),
        role: "sibling",
      });
    });
  } else {
    opts.program.daughters.forEach((d) => {
      extraTrajectories.push({
        id: d.daughterId,
        label: d.daughterId,
        stations: stationsFromRecords(d.planRecords),
        role: "daughter",
      });
    });
  }

  return {
    extraTrajectories,
    kickoffMarkers: opts.kickoffs,
    targetMarkers: opts.program.targets.map((t) => ({
      e: t.e,
      n: t.n,
      d: t.d,
      label: t.label,
    })),
  };
}
