"use client";

import { InfoTip } from "@/components/layout/InfoTip";
import { estimateToolface, TOOLFACE_DISCLAIMER } from "@/lib/drilling/branch-toolface";
import type { KickoffStation } from "@/lib/drilling/branch-program";
import { round } from "@/lib/drilling/format";

type Props = {
  kickoff: KickoffStation;
  daughterDip: number;
  daughterAzimuth: number;
};

export function ToolfaceEstimateCard({ kickoff, daughterDip, daughterAzimuth }: Props) {
  const tf = estimateToolface(kickoff, daughterDip, daughterAzimuth);
  return (
    <div className="branch-toolface-card" role="note">
      <h4>
        Toolface estimate{" "}
        <InfoTip tip="Indicative toolface for planning discussion at the selected kickoff — not a rig instruction." />
      </h4>
      <dl>
        <div>
          <dt>Build / drop</dt>
          <dd>{round(tf.buildDropDeg, 1)}°</dd>
        </div>
        <div>
          <dt>Left / right turn</dt>
          <dd>{round(tf.leftRightTurnDeg, 1)}°</dd>
        </div>
        <div>
          <dt>Est. toolface</dt>
          <dd>{round(tf.toolfaceDeg, 0)}°</dd>
        </div>
      </dl>
      {tf.nearVertical ? <p className="branch-toolface-warn">Near-vertical — toolface less stable.</p> : null}
      <p className="branch-toolface-disclaimer">{TOOLFACE_DISCLAIMER}</p>
    </div>
  );
}
