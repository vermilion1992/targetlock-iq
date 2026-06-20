"use client";

import { useMemo } from "react";
import {
  ProgramScene3DLazy as ProgramScene3D,
  type Scene3DClearanceLink,
  type Scene3DHole,
} from "@/components/three/ProgramScene3DLazy";
import { findHole, type HoleLibrary } from "@/lib/drilling/hole-library";
import {
  buildPlannerMapModel,
  getPlannerMapFramePath,
} from "@/lib/drilling/planner-spatial";
import { buildStations } from "@/lib/drilling/desurvey";
import { resolveTargetEnu } from "@/lib/drilling/coordinate-system";
import type { PlannerDraft, PlannerQaReport } from "@/lib/drilling/planner-types";
import type { SavedHoleProject } from "@/lib/drilling/storage";

type Props = {
  library: HoleLibrary;
  hole: SavedHoleProject | null;
  draft: PlannerDraft;
  qaReport: PlannerQaReport | null;
};

type ReviewScene = {
  holes: Scene3DHole[];
  clearanceLinks: Scene3DClearanceLink[];
  contextHoleCount: number;
};

function slugify(value: string): string {
  return value.replace(/[^\w.-]+/g, "-").toLowerCase() || "plan";
}

export function PlannerReviewScene({ library, hole, draft, qaReport }: Props) {
  const scene = useMemo<ReviewScene | null>(() => {
    const programId = hole?.plannerMeta?.programId ?? null;

    // Program context — show the selected hole alongside its neighbours with
    // clearance links, matching the standalone 3D tab.
    if (programId) {
      const model = buildPlannerMapModel(library, programId, undefined, hole?.holeId ?? null);
      if (model && model.layers.length) {
        const holes: Scene3DHole[] = model.layers.map((layer) => {
          const sibling = findHole(library, layer.holeId);
          const actualTrace =
            sibling && sibling.actualRecords.length > 1
              ? getPlannerMapFramePath(sibling, library).actualTrace
              : undefined;
          return {
            holeId: layer.holeId,
            holeName: layer.holeName,
            planType: layer.planType,
            trace: layer.trace,
            actualTrace,
            motherTrace: layer.motherTrace,
            target: layer.target,
            highlighted: layer.holeId === hole?.holeId,
          };
        });
        const clearanceLinks: Scene3DClearanceLink[] = qaReport
          ? qaReport.clearancePairs
              .filter((pair) => pair.severity !== "ok")
              .map((pair) => ({
                holeAId: pair.holeAId,
                holeBId: pair.holeBId,
                mdA: pair.mdA,
                mdB: pair.mdB,
                severity: pair.severity,
              }))
          : [];
        return { holes, clearanceLinks, contextHoleCount: holes.length };
      }
    }

    // Standalone fallback — a single highlighted trajectory from the draft
    // (covers unsaved plans and saved holes without a program).
    const trace = buildStations(draft.planRecords);
    if (!trace.length) return null;
    const target = resolveTargetEnu(draft);
    const holes: Scene3DHole[] = [
      {
        holeId: hole?.holeId ?? "draft",
        holeName: draft.holeName || hole?.holeName || "Plan",
        planType: draft.planType === "daughter" ? "daughter" : "standard",
        trace,
        actualTrace:
          hole && hole.actualRecords.length > 1
            ? buildStations(hole.actualRecords)
            : undefined,
        target: {
          e: target.e,
          n: target.n,
          d: target.d,
          tolerance: draft.target.tolerance,
        },
        highlighted: true,
      },
    ];
    return { holes, clearanceLinks: [], contextHoleCount: 1 };
  }, [library, hole, draft, qaReport]);

  if (!scene) {
    return (
      <p className="targetlock-panel-copy">
        Generate a plan to explore the interactive 3D trajectory.
      </p>
    );
  }

  return (
    <ProgramScene3D
      holes={scene.holes}
      clearanceLinks={scene.clearanceLinks}
      heightPx={560}
      showEllipsoidsDefault
      snapshotName={`targetlock-review-${slugify(
        hole?.holeName ?? draft.holeName ?? "plan"
      )}-3d`}
    />
  );
}
