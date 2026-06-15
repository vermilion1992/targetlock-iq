import {
  buildPlannerMapModel,
  DEFAULT_MAP_LAYER_TOGGLE,
  programMapScale,
  type PlannerMapHoleLayer,
  type PlannerMapModel,
} from "./planner-spatial";
import type { HoleLibrary } from "./hole-library";

const STATUS_STROKE: Record<string, string> = {
  draft: "#94a3b8",
  planned: "#1a4fa3",
  approved: "#1a6b3c",
  active: "#856404",
  completed: "#155724",
  archived: "#6c757d",
};

function tracePath(
  layer: PlannerMapHoleLayer,
  scale: ReturnType<typeof programMapScale>
): string {
  const stations = layer.trace;
  if (!stations.length) return "";
  return stations
    .map((s, i) => {
      const x = scale.x(s.e);
      const y = scale.y(s.n);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

export function renderPlannerMapSvg(
  model: PlannerMapModel,
  width = 640,
  height = 420
): string {
  const scale = programMapScale(width, height, model.layers);
  const { plot } = scale;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#f8fafc"/>`,
  ];

  for (let i = 0; i <= 7; i++) {
    const x = plot.left + ((plot.right - plot.left) * i) / 7;
    parts.push(
      `<line x1="${x}" y1="${plot.top}" x2="${x}" y2="${plot.bottom}" stroke="#e2e8f0" stroke-width="0.5"/>`
    );
  }
  for (let i = 0; i <= 5; i++) {
    const y = plot.top + ((plot.bottom - plot.top) * i) / 5;
    parts.push(
      `<line x1="${plot.left}" y1="${y}" x2="${plot.right}" y2="${y}" stroke="#e2e8f0" stroke-width="0.5"/>`
    );
  }

  for (const layer of model.layers) {
    const stroke = STATUS_STROKE[layer.status] ?? "#1a4fa3";
    const path = tracePath(layer, scale);
    if (path) {
      parts.push(
        `<path d="${path}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>`
      );
    }
    if (layer.trace[0]) {
      parts.push(
        `<circle cx="${scale.x(layer.trace[0]!.e)}" cy="${scale.y(layer.trace[0]!.n)}" r="5" fill="${stroke}"/>`
      );
    }
    parts.push(
      `<circle cx="${scale.x(layer.target.e)}" cy="${scale.y(layer.target.n)}" r="4" fill="#dc2626"/>`
    );
    if (layer.trace[0]) {
      parts.push(
        `<text x="${scale.x(layer.trace[0]!.e) + 8}" y="${scale.y(layer.trace[0]!.n) - 8}" font-size="10" fill="#334155">${layer.holeName}</text>`
      );
    }
  }

  parts.push("</svg>");
  return parts.join("");
}

export function buildProgramMapModel(
  library: HoleLibrary,
  programId: string
): PlannerMapModel | null {
  return buildPlannerMapModel(library, programId, DEFAULT_MAP_LAYER_TOGGLE);
}

export async function capturePlannerMapPng(
  model: PlannerMapModel,
  width = 640,
  height = 420
): Promise<string | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }
  const svg = renderPlannerMapSvg(model, width, height);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
