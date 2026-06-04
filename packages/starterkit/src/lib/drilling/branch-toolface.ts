import { doglegDeg, normalizeVector, vectorFromDipAz } from "./geometry";
import type { KickoffStation } from "./branch-program";

export type ToolfaceEstimate = {
  buildDropDeg: number;
  leftRightTurnDeg: number;
  toolfaceDeg: number;
  nearVertical: boolean;
  note: string;
};

export const TOOLFACE_DISCLAIMER =
  "Toolface estimate for planning discussion only. Final orientation must be confirmed by directional drilling contractor and survey/tooling provider.";

const VERTICAL_DIP_THRESHOLD = 80;

/**
 * Planning estimate: decompose dogleg into build/drop and left/right turn,
 * then approximate high-side toolface (0° = build, 180° = drop in simplified model).
 */
export function estimateToolface(
  kickoff: KickoffStation,
  daughterDip: number,
  daughterAzimuth: number
): ToolfaceEstimate {
  const motherDir = vectorFromDipAz(kickoff.motherDip, kickoff.motherAzimuth);
  const daughterDir = vectorFromDipAz(daughterDip, daughterAzimuth);
  const dogleg = doglegDeg(motherDir, daughterDir);

  const motherH = normalizeVector({ e: motherDir.e, n: motherDir.n, d: 0 });
  const daughterH = normalizeVector({ e: daughterDir.e, n: daughterDir.n, d: 0 });
  const cross =
    motherH.e * daughterH.n - motherH.n * daughterH.e;
  const dotH = motherH.e * daughterH.e + motherH.n * daughterH.n;
  const leftRightTurnDeg =
    (Math.atan2(cross, dotH) * 180) / Math.PI;

  const buildDropDeg = daughterDip - kickoff.motherDip;
  const toolfaceDeg = normalizeAngle(
    Math.atan2(leftRightTurnDeg, buildDropDeg) * (180 / Math.PI) + 90
  );

  const nearVertical =
    Math.abs(kickoff.motherDip) > VERTICAL_DIP_THRESHOLD ||
    Math.abs(daughterDip) > VERTICAL_DIP_THRESHOLD;

  let note = TOOLFACE_DISCLAIMER;
  if (nearVertical) {
    note += " Near-vertical hole — azimuth and toolface are less stable.";
  }

  return {
    buildDropDeg,
    leftRightTurnDeg,
    toolfaceDeg,
    nearVertical,
    note,
  };
}

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}
