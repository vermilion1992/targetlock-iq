"use client";

import dynamic from "next/dynamic";

/** Client-only loader — the WebGL canvas must never render on the server. */
export const ProgramScene3DLazy = dynamic(
  () => import("./ProgramScene3D").then((m) => m.ProgramScene3D),
  {
    ssr: false,
    loading: () => (
      <p className="targetlock-panel-copy">Loading 3D scene…</p>
    ),
  }
);

export type {
  Scene3DClearanceLink,
  Scene3DHole,
  Scene3DSurface,
} from "./ProgramScene3D";
