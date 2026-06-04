"use client";

import type { ReactNode } from "react";
import { InfoTip } from "@/components/layout/InfoTip";

function RoadmapSection({
  title,
  titleTip,
  children,
}: {
  title: string;
  titleTip?: string;
  children: ReactNode;
}) {
  return (
    <section className="targetlock-method-section">
      <h3>
        {title}
        {titleTip ? (
          <>
            {" "}
            <InfoTip tip={titleTip} />
          </>
        ) : null}
      </h3>
      {children}
    </section>
  );
}

export function RoadmapPanel() {
  return (
    <article className="targetlock-panel targetlock-method-panel">
      <div className="targetlock-panel-title">
        <h2>
          Roadmap{" "}
          <InfoTip tip="Informational future direction for RC1 pilots. RC1 delivers validated decision support in the browser; offline field mode and live integrations are planned separately." />
        </h2>
        <span className="targetlock-mini-tag">Future direction</span>
      </div>
      <p className="targetlock-panel-copy">
        RC1 is focused on validated decision support before live integrations or field
        offline workflows.
      </p>

      <div className="targetlock-method-sections">
        <RoadmapSection
          title="Offline Field Mode"
          titleTip="Installable progressive web app (PWA) that caches the app shell and hole library so crews can open TargetLock after the first load without internet at the rig."
        >
          <ul>
            <li>Installable field app / PWA</li>
            <li>Open TargetLock after first load without internet</li>
            <li>Local hole library available offline</li>
            <li>Offline CSV import</li>
            <li>Offline handover and branch PDF export</li>
            <li>Full hole package JSON backup/transfer</li>
            <li>Future sync when connection returns</li>
          </ul>
          <p className="targetlock-panel-footnote">
            <strong>Limitation:</strong> Offline data remains device/browser-local until sync is
            implemented.
          </p>
        </RoadmapSection>

        <RoadmapSection
          title="API / Integration Layer"
          titleTip="Connectors to client survey and planning systems (e.g. HUB-IQ, SURVEY-IQ) for automated import and governed export — subject to site access and API contracts."
        >
          <ul>
            <li>HUB-IQ / SURVEY-IQ integration where access is available</li>
            <li>Survey provider import profiles</li>
            <li>Automated hole plan and survey result ingestion</li>
            <li>Project/hole matching</li>
            <li>QA/QC flags from source systems where provided</li>
            <li>Export reports/packages back to client systems</li>
          </ul>
          <p className="targetlock-panel-footnote">
            <strong>Limitation:</strong> Integrations depend on client access, API permissions,
            and data governance{" "}
            <InfoTip tip="Each site defines who may read survey data, which systems are authoritative, and how exports are approved. TargetLock cannot bypass client IT or contractual data-handling rules." />
            .
          </p>
        </RoadmapSection>
      </div>

      <p className="targetlock-panel-footnote">
        Pilot feedback should decide which roadmap item is prioritised first.
      </p>
    </article>
  );
}
