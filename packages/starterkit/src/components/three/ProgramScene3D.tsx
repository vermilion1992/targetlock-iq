"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { interpolateAtMd } from "@/lib/drilling/desurvey";
import {
  DEFAULT_TOOL_ERROR_MODEL,
  propagateUncertainty,
  uncertaintyAtMd,
} from "@/lib/drilling/uncertainty";
import type { PlannerQaSeverity } from "@/lib/drilling/planner-types";
import type { SurveyStation } from "@/lib/drilling/types";

export type Scene3DHole = {
  holeId: string;
  holeName: string;
  planType: "standard" | "daughter" | "import";
  /** Planned trace in a shared ENU frame (metres). */
  trace: SurveyStation[];
  /** Actual surveyed trace in the same frame, when available. */
  actualTrace?: SurveyStation[];
  /** Mother trace segment for daughters (already framed). */
  motherTrace?: SurveyStation[];
  target?: { e: number; n: number; d: number; tolerance: number } | null;
  highlighted?: boolean;
};

export type Scene3DClearanceLink = {
  holeAId: string;
  holeBId: string;
  mdA: number;
  mdB: number;
  severity: PlannerQaSeverity;
};

export type Scene3DSurface = {
  id: string;
  name: string;
  /** Flat frame-space positions [e0, n0, d0, ...] (same ENU frame as traces). */
  positions: number[];
  /** Triangle indices into positions; empty for wireframe-only assets. */
  indices: number[];
  /** Polylines as vertex index arrays into positions. */
  polylines: number[][];
  color: string;
  opacity: number;
};

type Props = {
  holes: Scene3DHole[];
  clearanceLinks?: Scene3DClearanceLink[];
  /** Imported geology surfaces/wireframes, already in the shared frame. */
  surfaces?: Scene3DSurface[];
  className?: string;
  heightPx?: number;
  showEllipsoidsDefault?: boolean;
  /** Filename used for the PNG snapshot download. */
  snapshotName?: string;
};

const COLORS = {
  plan: "#4f8df9",
  planHighlight: "#f59e0b",
  daughter: "#8b5cf6",
  actual: "#2bb673",
  mother: "#94a3b8",
  target: "#b42318",
  collar: "#0f172a",
  ellipsoid: "#f59e0b",
  risk: "#dc2626",
  watch: "#d97706",
  grid: "#cbd5e1",
};

/** ENU (e, n, d-down) to three.js (x right=E, y up=-D, z toward viewer=-N). */
function toVec3(p: { e: number; n: number; d: number }): [number, number, number] {
  return [p.e, -p.d, -p.n];
}

function traceMidFrame(holes: Scene3DHole[], surfaces: Scene3DSurface[] = []) {
  const box = new THREE.Box3();
  let any = false;
  const expand = (p: { e: number; n: number; d: number }) => {
    any = true;
    box.expandByPoint(new THREE.Vector3(...toVec3(p)));
  };
  for (const hole of holes) {
    hole.trace.forEach(expand);
    hole.actualTrace?.forEach(expand);
    if (hole.target) expand(hole.target);
  }
  for (const surface of surfaces) {
    const pos = surface.positions;
    for (let i = 0; i + 2 < pos.length; i += 3) {
      expand({ e: pos[i], n: pos[i + 1], d: pos[i + 2] });
    }
  }
  if (!any) {
    return { center: new THREE.Vector3(0, 0, 0), radius: 100 };
  }
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const radius = Math.max(60, size.length() / 2);
  return { center, radius };
}

function FitCamera({ center, radius }: { center: THREE.Vector3; radius: number }) {
  const camera = useThree((s) => s.camera);
  const fitKey = `${center.x.toFixed(0)}:${center.y.toFixed(0)}:${center.z.toFixed(0)}:${radius.toFixed(0)}`;
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    if (lastKey.current === fitKey) return;
    lastKey.current = fitKey;
    camera.position.set(
      center.x + radius * 1.4,
      center.y + radius * 0.9,
      center.z + radius * 1.4
    );
    camera.near = Math.max(0.1, radius / 1000);
    camera.far = radius * 40;
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }, [camera, center, fitKey, radius]);
  return null;
}

type SectionState = {
  enabled: boolean;
  azimuthDeg: number;
};

function SectionPlane({
  section,
  center,
  radius,
}: {
  section: SectionState;
  center: THREE.Vector3;
  radius: number;
}) {
  if (!section.enabled) return null;
  // Vertical plane whose strike follows the chosen azimuth.
  const azRad = (section.azimuthDeg * Math.PI) / 180;
  // Strike direction in three coords: ENU (sin az, cos az, 0) -> (sin az, 0, -cos az)
  const rotationY = Math.atan2(Math.sin(azRad), Math.cos(azRad));
  return (
    <mesh
      position={center}
      rotation={[0, -rotationY + Math.PI / 2, 0]}
    >
      <planeGeometry args={[radius * 2.4, radius * 2.4]} />
      <meshBasicMaterial
        color="#64748b"
        transparent
        opacity={0.12}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function SectionCameraJump({
  trigger,
  section,
  center,
  radius,
}: {
  trigger: number;
  section: SectionState;
  center: THREE.Vector3;
  radius: number;
}) {
  const camera = useThree((s) => s.camera);
  const lastTrigger = useRef(0);
  useEffect(() => {
    if (trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    const azRad = (section.azimuthDeg * Math.PI) / 180;
    // Normal to the vertical section plane (horizontal, perpendicular to strike).
    const normal = new THREE.Vector3(Math.cos(azRad), 0, Math.sin(azRad));
    camera.position.copy(center.clone().add(normal.multiplyScalar(radius * 2.2)));
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }, [camera, center, radius, section.azimuthDeg, trigger]);
  return null;
}

function tracePoints(trace: SurveyStation[]): [number, number, number][] {
  return trace.map((s) => toVec3(s));
}

function HoleTraces({
  hole,
  showEllipsoids,
  sigmaLabel,
}: {
  hole: Scene3DHole;
  showEllipsoids: boolean;
  sigmaLabel: string;
}) {
  const planColor = hole.highlighted
    ? COLORS.planHighlight
    : hole.planType === "daughter"
      ? COLORS.daughter
      : COLORS.plan;

  const ellipsoids = useMemo(() => {
    if (!showEllipsoids || hole.trace.length < 2) return [];
    const uncertainty = propagateUncertainty(hole.trace, DEFAULT_TOOL_ERROR_MODEL);
    const first = hole.trace[0]!.md;
    const last = hole.trace[hole.trace.length - 1]!.md;
    const step = Math.max(60, (last - first) / 8);
    const out: { position: [number, number, number]; radius: number }[] = [];
    for (let md = first + step; md <= last + 1e-6; md += step) {
      const station = interpolateAtMd(hole.trace, md);
      const u = uncertaintyAtMd(uncertainty, md);
      if (!station || !u || u.radiusM <= 0.05) continue;
      out.push({ position: toVec3(station), radius: u.radiusM });
    }
    return out;
  }, [hole.trace, showEllipsoids]);

  const collar = hole.trace[0];

  return (
    <group>
      {hole.motherTrace && hole.motherTrace.length > 1 ? (
        <Line
          points={tracePoints(hole.motherTrace)}
          color={COLORS.mother}
          lineWidth={1.5}
          dashed
          dashSize={6}
          gapSize={4}
        />
      ) : null}

      {hole.trace.length > 1 ? (
        <Line
          points={tracePoints(hole.trace)}
          color={planColor}
          lineWidth={hole.highlighted ? 3 : 2}
        />
      ) : null}

      {hole.actualTrace && hole.actualTrace.length > 1 ? (
        <Line
          points={tracePoints(hole.actualTrace)}
          color={COLORS.actual}
          lineWidth={2.5}
        />
      ) : null}

      {collar ? (
        <group position={toVec3(collar)}>
          <mesh>
            <sphereGeometry args={[3.2, 16, 16]} />
            <meshStandardMaterial color={planColor} />
          </mesh>
          <Html
            distanceFactor={600}
            position={[0, 10, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div className="program-scene-3d-label">{hole.holeName}</div>
          </Html>
        </group>
      ) : null}

      {hole.target ? (
        <mesh position={toVec3(hole.target)}>
          <sphereGeometry args={[Math.max(1.5, hole.target.tolerance), 20, 20]} />
          <meshStandardMaterial
            color={COLORS.target}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      ) : null}

      {ellipsoids.map((item, index) => (
        <mesh key={`${hole.holeId}-u-${index}`} position={item.position}>
          <sphereGeometry args={[item.radius, 12, 12]} />
          <meshBasicMaterial
            color={COLORS.ellipsoid}
            transparent
            opacity={0.14}
            depthWrite={false}
          />
        </mesh>
      ))}
      {showEllipsoids && ellipsoids.length ? (
        <group position={ellipsoids[ellipsoids.length - 1]!.position}>
          <Html distanceFactor={800} style={{ pointerEvents: "none" }}>
            <div className="program-scene-3d-label program-scene-3d-label--muted">
              ±{ellipsoids[ellipsoids.length - 1]!.radius.toFixed(1)} m ({sigmaLabel})
            </div>
          </Html>
        </group>
      ) : null}
    </group>
  );
}

function ClearanceLinks({
  holes,
  links,
}: {
  holes: Scene3DHole[];
  links: Scene3DClearanceLink[];
}) {
  const byId = useMemo(() => {
    const map = new Map<string, Scene3DHole>();
    holes.forEach((h) => map.set(h.holeId, h));
    return map;
  }, [holes]);

  const segments = useMemo(() => {
    const out: {
      key: string;
      a: [number, number, number];
      b: [number, number, number];
      severity: PlannerQaSeverity;
    }[] = [];
    for (const link of links) {
      if (link.severity === "ok") continue;
      const holeA = byId.get(link.holeAId);
      const holeB = byId.get(link.holeBId.replace(/-actual$/, ""));
      if (!holeA || !holeB) continue;
      const traceB = link.holeBId.endsWith("-actual")
        ? holeB.actualTrace ?? holeB.trace
        : holeB.trace;
      const a = interpolateAtMd(holeA.trace, link.mdA);
      const b = interpolateAtMd(traceB, link.mdB);
      if (!a || !b) continue;
      out.push({
        key: `${link.holeAId}-${link.holeBId}-${link.mdA}`,
        a: toVec3(a),
        b: toVec3(b),
        severity: link.severity,
      });
    }
    return out;
  }, [byId, links]);

  return (
    <group>
      {segments.map((segment) => (
        <group key={segment.key}>
          <Line
            points={[segment.a, segment.b]}
            color={segment.severity === "risk" ? COLORS.risk : COLORS.watch}
            lineWidth={3}
            dashed
            dashSize={4}
            gapSize={3}
          />
          <mesh position={segment.a}>
            <sphereGeometry args={[2.2, 12, 12]} />
            <meshBasicMaterial
              color={segment.severity === "risk" ? COLORS.risk : COLORS.watch}
            />
          </mesh>
          <mesh position={segment.b}>
            <sphereGeometry args={[2.2, 12, 12]} />
            <meshBasicMaterial
              color={segment.severity === "risk" ? COLORS.risk : COLORS.watch}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function GeologySurface({
  surface,
  wireframe,
}: {
  surface: Scene3DSurface;
  wireframe: boolean;
}) {
  const geometry = useMemo(() => {
    if (!surface.indices.length) return null;
    const geo = new THREE.BufferGeometry();
    const array = new Float32Array(surface.positions.length);
    for (let i = 0; i + 2 < surface.positions.length; i += 3) {
      // ENU (e, n, d-down) → three (x=E, y=-d, z=-N), same as toVec3.
      array[i] = surface.positions[i];
      array[i + 1] = -surface.positions[i + 2];
      array[i + 2] = -surface.positions[i + 1];
    }
    geo.setAttribute("position", new THREE.BufferAttribute(array, 3));
    geo.setIndex(surface.indices);
    geo.computeVertexNormals();
    return geo;
  }, [surface.positions, surface.indices]);

  useEffect(() => () => geometry?.dispose(), [geometry]);

  const polylinePoints = useMemo(
    () =>
      surface.polylines
        .filter((line) => line.length >= 2)
        .map((line) =>
          line.map((index) =>
            toVec3({
              e: surface.positions[index * 3],
              n: surface.positions[index * 3 + 1],
              d: surface.positions[index * 3 + 2],
            })
          )
        ),
    [surface.polylines, surface.positions]
  );

  return (
    <group>
      {geometry ? (
        <mesh geometry={geometry}>
          <meshStandardMaterial
            color={surface.color}
            transparent
            opacity={wireframe ? 1 : surface.opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            wireframe={wireframe}
          />
        </mesh>
      ) : null}
      {polylinePoints.map((points, index) => (
        <Line
          key={`${surface.id}-line-${index}`}
          points={points}
          color={surface.color}
          lineWidth={1.5}
        />
      ))}
    </group>
  );
}

export function ProgramScene3D({
  holes,
  clearanceLinks = [],
  surfaces = [],
  className,
  heightPx = 460,
  showEllipsoidsDefault = true,
  snapshotName = "targetlock-3d-scene",
}: Props) {
  const [showEllipsoids, setShowEllipsoids] = useState(showEllipsoidsDefault);
  const [showActual, setShowActual] = useState(true);
  const [showGeology, setShowGeology] = useState(true);
  const [geologyWireframe, setGeologyWireframe] = useState(false);
  const [section, setSection] = useState<SectionState>({
    enabled: false,
    azimuthDeg: 90,
  });
  const [sectionJump, setSectionJump] = useState(0);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

  const visibleHoles = useMemo(
    () =>
      showActual
        ? holes
        : holes.map((h) => ({ ...h, actualTrace: undefined })),
    [holes, showActual]
  );

  const visibleSurfaces = showGeology ? surfaces : [];

  const { center, radius } = useMemo(
    () => traceMidFrame(holes, surfaces),
    [holes, surfaces]
  );

  const handleSnapshot = () => {
    const gl = glRef.current;
    if (!gl) return;
    const url = gl.domElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${snapshotName}.png`;
    link.click();
  };

  if (!holes.length || holes.every((h) => h.trace.length < 2)) {
    return (
      <p className="targetlock-panel-copy">
        No plan traces available for the 3D scene yet.
      </p>
    );
  }

  return (
    <div className={`program-scene-3d ${className ?? ""}`.trim()}>
      <div className="program-scene-3d-toolbar" role="toolbar" aria-label="3D scene controls">
        <label className="program-scene-3d-toggle">
          <input
            type="checkbox"
            checked={showEllipsoids}
            onChange={(e) => setShowEllipsoids(e.target.checked)}
          />
          Uncertainty envelopes
        </label>
        <label className="program-scene-3d-toggle">
          <input
            type="checkbox"
            checked={showActual}
            onChange={(e) => setShowActual(e.target.checked)}
          />
          Actual traces
        </label>
        {surfaces.length ? (
          <>
            <label className="program-scene-3d-toggle">
              <input
                type="checkbox"
                checked={showGeology}
                onChange={(e) => setShowGeology(e.target.checked)}
              />
              Geology
            </label>
            {showGeology ? (
              <label className="program-scene-3d-toggle">
                <input
                  type="checkbox"
                  checked={geologyWireframe}
                  onChange={(e) => setGeologyWireframe(e.target.checked)}
                />
                Wireframe
              </label>
            ) : null}
          </>
        ) : null}
        <label className="program-scene-3d-toggle">
          <input
            type="checkbox"
            checked={section.enabled}
            onChange={(e) =>
              setSection((prev) => ({ ...prev, enabled: e.target.checked }))
            }
          />
          Section plane
        </label>
        {section.enabled ? (
          <>
            <label className="program-scene-3d-toggle">
              Azimuth°
              <input
                type="number"
                min={0}
                max={360}
                step={5}
                value={section.azimuthDeg}
                onChange={(e) =>
                  setSection((prev) => ({
                    ...prev,
                    azimuthDeg: Number(e.target.value) || 0,
                  }))
                }
                style={{ width: 64 }}
              />
            </label>
            <button
              type="button"
              className="targetlock-link-btn"
              onClick={() => setSectionJump((n) => n + 1)}
            >
              View section
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="targetlock-link-btn"
          onClick={handleSnapshot}
        >
          Save image
        </button>
      </div>

      <div
        className="program-scene-3d-viewport"
        style={{ height: heightPx }}
        role="application"
        aria-label="Interactive 3D drilling program scene. Drag to orbit, scroll to zoom, right-drag to pan."
      >
        <Canvas
          gl={{ preserveDrawingBuffer: true, antialias: true }}
          camera={{ fov: 50 }}
          onCreated={({ gl }) => {
            glRef.current = gl;
            gl.setClearColor("#f6f8fb");
          }}
        >
          <ambientLight intensity={0.9} />
          <directionalLight position={[1, 2, 1.5]} intensity={0.9} />
          <FitCamera center={center} radius={radius} />
          <SectionCameraJump
            trigger={sectionJump}
            section={section}
            center={center}
            radius={radius}
          />
          <OrbitControls makeDefault target={center} enableDamping />

          <gridHelper
            args={[radius * 3, 20, COLORS.grid, COLORS.grid]}
            position={[center.x, center.y + radius * 0.95, center.z]}
          />

          {visibleSurfaces.map((surface) => (
            <GeologySurface
              key={surface.id}
              surface={surface}
              wireframe={geologyWireframe}
            />
          ))}

          {visibleHoles.map((hole) => (
            <HoleTraces
              key={hole.holeId}
              hole={hole}
              showEllipsoids={showEllipsoids}
              sigmaLabel="2-sigma simplified"
            />
          ))}

          <ClearanceLinks holes={visibleHoles} links={clearanceLinks} />
          <SectionPlane section={section} center={center} radius={radius} />
        </Canvas>
      </div>

      <p className="program-scene-3d-hint">
        Drag to orbit · Scroll zoom · Right-drag pan · Envelopes are the
        ISCWSA-inspired simplified uncertainty model (conservative radius).
      </p>
    </div>
  );
}
