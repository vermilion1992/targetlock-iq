import { kickoffStationFromMother } from "./branch-program";
import { validateProjectCoordinateInputs } from "./coordinate-system";
import { buildStations } from "./desurvey";
import { findHole, resolveProgramCoordinateSystem, type HoleLibrary } from "./hole-library";
import { checkPlanDlsWarnings } from "./planner";
import { plannerPlanType } from "./planner-program";
import type {
  PlannerDrillabilityIssue,
  PlannerQaSettings,
} from "./planner-types";
import type { SavedHoleProject } from "./storage";

export type DrillabilityResult = {
  ok: boolean;
  hasHardErrors: boolean;
  issues: PlannerDrillabilityIssue[];
};

function maxDlsForHole(
  hole: SavedHoleProject,
  settings: PlannerQaSettings
): number {
  return hole.target?.maxDls ?? settings.maxDls;
}

export function checkHoleDrillability(
  hole: SavedHoleProject,
  library: HoleLibrary,
  settings: PlannerQaSettings
): DrillabilityResult {
  const issues: PlannerDrillabilityIssue[] = [];
  const type = plannerPlanType(hole);
  const maxDls = maxDlsForHole(hole, settings);

  if (!hole.planRecords.length) {
    issues.push({
      code: "no_plan_records",
      level: "error",
      message: "Plan has no planned survey stations.",
    });
  } else if (hole.planRecords.length <= 1) {
    issues.push({
      code: "insufficient_stations",
      level: "error",
      message: "Plan must have more than one station.",
    });
  }

  for (let i = 1; i < hole.planRecords.length; i += 1) {
    const prev = hole.planRecords[i - 1]!;
    const curr = hole.planRecords[i]!;
    if (curr.md <= prev.md) {
      issues.push({
        code: "md_not_increasing",
        level: "error",
        message: `MD not strictly increasing at station ${i + 1} (${curr.md} m ≤ ${prev.md} m).`,
        md: curr.md,
      });
    }
  }

  const stations = buildStations(hole.planRecords);
  for (const station of stations) {
    if (!Number.isFinite(station.dls)) {
      issues.push({
        code: "dls_invalid",
        level: "error",
        message: `DLS invalid at MD ${station.md.toFixed(0)} m.`,
        md: station.md,
      });
    }
  }

  if (!hole.target?.md && hole.planRecords.length === 0) {
    issues.push({
      code: "missing_target",
      level: "error",
      message: "Missing target definition.",
    });
  }

  if (type === "daughter") {
    if (!hole.parentHoleId) {
      issues.push({
        code: "missing_mother_ref",
        level: "error",
        message: "Daughter plan missing mother hole reference.",
      });
    } else {
      const mother = findHole(library, hole.parentHoleId);
      if (!mother) {
        issues.push({
          code: "missing_mother",
          level: "error",
          message: "Missing mother hole in library.",
        });
      } else if (hole.kickoffMd !== undefined) {
        const kickoff = kickoffStationFromMother(
          mother.actualRecords,
          hole.kickoffMd
        );
        if (!kickoff) {
          issues.push({
            code: "missing_mother_path",
            level: "error",
            message: "Daughter kickoff missing mother actual path.",
            md: hole.kickoffMd,
          });
        }
      } else {
        issues.push({
          code: "missing_kickoff_md",
          level: "error",
          message: "Missing daughter kickoff MD.",
        });
      }
    }
  }

  if (hole.planRecords.length > 1) {
    const dlsWarnings = checkPlanDlsWarnings(hole.planRecords, maxDls);
    for (const msg of dlsWarnings) {
      issues.push({
        code: "dls_exceeded",
        level: "warning",
        message: msg,
      });
    }

    const final = stations[stations.length - 1];
    const targetMd = hole.target?.md;
    if (final && targetMd !== undefined && targetMd > 0) {
      const interval = hole.target?.nextInterval ?? 30;
      if (Math.abs(final.md - targetMd) > interval + 1) {
        issues.push({
          code: "target_md_mismatch",
          level: "warning",
          message: `Final plan MD ${final.md.toFixed(0)} m differs from target MD ${targetMd.toFixed(0)} m.`,
          md: final.md,
        });
      }
    }

    if (final) {
      const tolerance = hole.target?.tolerance ?? 6;
      const miss = Math.hypot(
        final.e - hole.target.e,
        final.n - hole.target.n,
        final.d - hole.target.d
      );
      if (miss > tolerance + 1) {
        issues.push({
          code: "target_miss",
          level: "warning",
          message: `Planned path ends ${miss.toFixed(1)} m from target (tolerance ${tolerance} m).`,
          md: final.md,
        });
      }
    }
  }

  for (const record of hole.planRecords) {
    if (record.dip < -90 || record.dip > 90) {
      issues.push({
        code: "dip_out_of_range",
        level: "warning",
        message: `Dip ${record.dip.toFixed(1)}° outside [-90, 90] at MD ${record.md.toFixed(0)} m.`,
        md: record.md,
      });
    }
    if (record.azimuth < 0 || record.azimuth >= 360) {
      issues.push({
        code: "azimuth_out_of_range",
        level: "warning",
        message: `Azimuth ${record.azimuth.toFixed(1)}° outside [0, 360) at MD ${record.md.toFixed(0)} m.`,
        md: record.md,
      });
    }
    if (Math.abs(record.dip) > 85) {
      issues.push({
        code: "near_vertical",
        level: "warning",
        message: `Near-vertical dip ${record.dip.toFixed(1)}° at MD ${record.md.toFixed(0)} m — review steering assumptions.`,
        md: record.md,
      });
    }
  }

  const programId = hole.plannerMeta?.programId;
  if (programId) {
    const pcs = resolveProgramCoordinateSystem(
      library.holes.filter((h) => h.plannerMeta?.programId === programId)
    );
    const coordWarnings = validateProjectCoordinateInputs(pcs, [hole]);
    for (const msg of coordWarnings) {
      issues.push({
        code: "coordinate_metadata",
        level: settings.requireCoordinateMetadataBeforeApproval
          ? "error"
          : "warning",
        message: msg,
      });
    }
  }

  const hasHardErrors = issues.some((i) => i.level === "error");
  return {
    ok: !hasHardErrors && issues.length === 0,
    hasHardErrors,
    issues,
  };
}
