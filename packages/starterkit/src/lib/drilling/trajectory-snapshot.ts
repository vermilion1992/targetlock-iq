import { drawPlanView } from "@/components/charts/chart-draw";
import {
  drawTrajectory3D,
  VIEW_PRESETS,
  type View3D,
} from "@/components/charts/chart-3d";
import type { BranchChartOverlay } from "@/components/charts/chart-branch-overlay";
import { isValidImageDataUrl } from "./pdf-brand";
import type { Recommendation, SurveyStation } from "./types";

export type TrajectorySnapshotOptions = {
  mode?: "3d" | "plan";
  branchOverlay?: BranchChartOverlay | null;
  width?: number;
  height?: number;
  view?: View3D;
  jpegQuality?: number;
};

const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 540;
const JPEG_QUALITY = 0.85;

function hasTrajectoryData(
  planStations: SurveyStation[],
  actualStations: SurveyStation[]
): boolean {
  return planStations.length >= 2 || actualStations.length >= 2;
}

function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  jpegQuality: number
): string | null {
  try {
    const dataUrl = canvas.toDataURL("image/jpeg", jpegQuality);
    return isValidImageDataUrl(dataUrl) ? dataUrl : null;
  } catch {
    try {
      const dataUrl = canvas.toDataURL("image/png");
      return isValidImageDataUrl(dataUrl) ? dataUrl : null;
    } catch {
      return null;
    }
  }
}

function renderToCanvas(
  planStations: SurveyStation[],
  actualStations: SurveyStation[],
  recommendation: Recommendation | null,
  opts: TrajectorySnapshotOptions
): string | null {
  const width = opts.width ?? DEFAULT_WIDTH;
  const height = opts.height ?? DEFAULT_HEIGHT;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const drawOpts = { branchOverlay: opts.branchOverlay ?? null };

  if (opts.mode === "plan") {
    drawPlanView(ctx, width, height, planStations, actualStations, recommendation, drawOpts);
  } else {
    drawTrajectory3D(
      ctx,
      width,
      height,
      planStations,
      actualStations,
      recommendation,
      opts.view ?? VIEW_PRESETS.iso,
      drawOpts
    );
  }

  return canvasToDataUrl(canvas, opts.jpegQuality ?? JPEG_QUALITY);
}

/**
 * Capture a trajectory chart as a JPEG data URL for PDF embedding.
 * Browser-only; returns null when canvas is unavailable or data is insufficient.
 */
export function getTrajectorySnapshot(
  planStations: SurveyStation[],
  actualStations: SurveyStation[],
  recommendation: Recommendation | null,
  opts?: TrajectorySnapshotOptions
): string | null {
  if (typeof document === "undefined") return null;
  if (!hasTrajectoryData(planStations, actualStations)) return null;

  const options = opts ?? {};

  if (options.mode === "plan") {
    return renderToCanvas(planStations, actualStations, recommendation, options);
  }

  try {
    const snapshot = renderToCanvas(planStations, actualStations, recommendation, {
      ...options,
      mode: "3d",
    });
    if (snapshot) return snapshot;
  } catch {
    /* fall through to plan view */
  }

  try {
    return renderToCanvas(planStations, actualStations, recommendation, {
      ...options,
      mode: "plan",
    });
  } catch {
    return null;
  }
}
