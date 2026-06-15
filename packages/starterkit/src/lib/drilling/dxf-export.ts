import { buildStations } from "./desurvey";
import type { HoleLibrary } from "./hole-library";
import { buildPlannerMapModel } from "./planner-spatial";
import type { SurveyRecord, SurveyStation } from "./types";

/**
 * Minimal ASCII DXF (R12-compatible) writer for drillhole trajectories.
 * Coordinates: X = Easting, Y = Northing, Z = -d. In the program map frame
 * d is depth below the RL-0 datum, so Z is a true elevation / RL — what
 * Micromine / Leapfrog / Surpac / CAD packages expect. One 3D polyline per
 * trace, layered per hole, plus collar points and target markers.
 */

export type DxfHole = {
  holeName: string;
  plan: SurveyStation[];
  actual?: SurveyStation[];
  target?: { e: number; n: number; d: number; tolerance: number } | null;
};

function pair(code: number, value: string | number): string {
  return `${code}\n${value}`;
}

function num(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : "0";
}

function layerName(raw: string): string {
  return (
    raw
      .replace(/[^\w-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase()
      .slice(0, 60) || "HOLE"
  );
}

function point(layer: string, e: number, n: number, d: number): string[] {
  return [
    pair(0, "POINT"),
    pair(8, layer),
    pair(10, num(e)),
    pair(20, num(n)),
    pair(30, num(-d)),
  ];
}

function circle(
  layer: string,
  e: number,
  n: number,
  d: number,
  radius: number
): string[] {
  return [
    pair(0, "CIRCLE"),
    pair(8, layer),
    pair(10, num(e)),
    pair(20, num(n)),
    pair(30, num(-d)),
    pair(40, num(Math.max(0.1, radius))),
  ];
}

function polyline3d(layer: string, stations: SurveyStation[]): string[] {
  if (stations.length < 2) return [];
  const out: string[] = [
    pair(0, "POLYLINE"),
    pair(8, layer),
    pair(66, 1),
    pair(70, 8), // 3D polyline flag
  ];
  for (const s of stations) {
    out.push(
      pair(0, "VERTEX"),
      pair(8, layer),
      pair(10, num(s.e)),
      pair(20, num(s.n)),
      pair(30, num(-s.d)),
      pair(70, 32) // 3D polyline vertex flag
    );
  }
  out.push(pair(0, "SEQEND"), pair(8, layer));
  return out;
}

function layerTableEntry(name: string, colorIndex: number): string[] {
  return [
    pair(0, "LAYER"),
    pair(2, name),
    pair(70, 0),
    pair(62, colorIndex),
    pair(6, "CONTINUOUS"),
  ];
}

export function buildDxf(holes: DxfHole[]): string {
  const layers: { name: string; color: number }[] = [
    { name: "COLLARS", color: 7 },
    { name: "TARGETS", color: 1 },
  ];
  const entities: string[] = [];

  for (const hole of holes) {
    const base = layerName(hole.holeName);
    const planLayer = `${base}_PLAN`;
    const actualLayer = `${base}_ACTUAL`;
    layers.push({ name: planLayer, color: 5 });

    if (hole.plan.length > 1) {
      entities.push(...polyline3d(planLayer, hole.plan));
    }
    if (hole.actual && hole.actual.length > 1) {
      layers.push({ name: actualLayer, color: 3 });
      entities.push(...polyline3d(actualLayer, hole.actual));
    }
    const collar = hole.plan[0] ?? hole.actual?.[0];
    if (collar) {
      entities.push(...point("COLLARS", collar.e, collar.n, collar.d));
    }
    if (hole.target) {
      entities.push(
        ...point("TARGETS", hole.target.e, hole.target.n, hole.target.d),
        ...circle(
          "TARGETS",
          hole.target.e,
          hole.target.n,
          hole.target.d,
          hole.target.tolerance
        )
      );
    }
  }

  const sections: string[] = [
    pair(999, "TargetLock IQ trajectory export — X=Easting Y=Northing Z=Elevation/RL (m)"),
    pair(0, "SECTION"),
    pair(2, "TABLES"),
    pair(0, "TABLE"),
    pair(2, "LAYER"),
    pair(70, layers.length),
    ...layers.flatMap((l) => layerTableEntry(l.name, l.color)),
    pair(0, "ENDTAB"),
    pair(0, "ENDSEC"),
    pair(0, "SECTION"),
    pair(2, "ENTITIES"),
    ...entities,
    pair(0, "ENDSEC"),
    pair(0, "EOF"),
  ];

  return sections.join("\n") + "\n";
}

/** Program-wide DXF using the shared planner map frame. */
export function buildProgramDxf(
  library: HoleLibrary,
  programId: string
): string | null {
  const model = buildPlannerMapModel(library, programId);
  if (!model || !model.layers.length) return null;

  const holes: DxfHole[] = model.layers.map((layer) => ({
    holeName: layer.holeName,
    plan: layer.trace,
    target: layer.target,
  }));

  return buildDxf(holes);
}

/** Single-hole DXF in the hole-local frame (collar at origin). */
export function buildHoleDxf(
  holeName: string,
  planRecords: SurveyRecord[],
  actualRecords: SurveyRecord[],
  target?: { e: number; n: number; d: number; tolerance: number } | null
): string {
  return buildDxf([
    {
      holeName,
      plan: buildStations(planRecords),
      actual: actualRecords.length > 1 ? buildStations(actualRecords) : undefined,
      target,
    },
  ]);
}

export function downloadDxf(content: string, filename: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "application/dxf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".dxf") ? filename : `${filename}.dxf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
