"use client";

import { InfoTip } from "@/components/layout/InfoTip";
import { HoleDetailsFields } from "@/components/dashboard/HoleDetailsFields";

type Props = {
  activeHoleId: string;
  holeName: string;
  siteName: string;
  onHoleNameChange: (value: string) => void;
  onSiteNameChange: (value: string) => void;
  className?: string;
};

export function HoleDetailsPanel({
  activeHoleId,
  holeName,
  siteName,
  onHoleNameChange,
  onSiteNameChange,
  className = "",
}: Props) {
  return (
    <article className={`targetlock-panel ${className}`.trim()}>
      <div className="targetlock-panel-title">
        <h2>
          Hole details{" "}
          <InfoTip tip="Hole ID or name and site or project label for the active hole. Edits apply to exports and the hole library entry." />
        </h2>
      </div>
      <div className="targetlock-stack">
        <HoleDetailsFields
          activeHoleId={activeHoleId}
          holeName={holeName}
          siteName={siteName}
          onHoleNameChange={onHoleNameChange}
          onSiteNameChange={onSiteNameChange}
        />
      </div>
    </article>
  );
}
