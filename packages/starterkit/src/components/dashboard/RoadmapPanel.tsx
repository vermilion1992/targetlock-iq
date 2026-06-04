"use client";

import { ReferenceDocSection } from "@/components/dashboard/ReferenceDocSection";
import { InfoTip } from "@/components/layout/InfoTip";

export function RoadmapPanel() {
  return (
    <article className="targetlock-panel targetlock-ref-panel targetlock-ref-panel--roadmap">
      <div className="targetlock-panel-title">
        <h2>
          Roadmap{" "}
          <InfoTip tip="Informational future direction for RC1 pilots. RC1 delivers validated decision support in the browser; offline field mode and live integrations are planned separately." />
        </h2>
        <span className="targetlock-mini-tag targetlock-ref-tag targetlock-ref-tag--future">
          Future direction
        </span>
      </div>

      <div className="targetlock-ref-lead targetlock-ref-lead--scope" role="note">
        <p className="targetlock-ref-lead-kicker">RC1 scope</p>
        <p>
          RC1 is focused on validated decision support before live integrations or field offline
          workflows.
        </p>
      </div>

      <div className="targetlock-ref-sections targetlock-ref-sections--roadmap">
        <ReferenceDocSection
          title="Offline Field Mode"
          badge="A"
          variant="field"
          titleTip="Installable progressive web app (PWA) that caches the app shell and hole library so crews can open TargetLock after the first load without internet at the rig."
        >
          <p className="targetlock-ref-section-intro">
            Field practicality — work at the rig without relying on continuous connectivity.
          </p>
          <ul className="targetlock-ref-list">
            <li>Installable field app / PWA</li>
            <li>Open TargetLock after first load without internet</li>
            <li>Local hole library available offline</li>
            <li>Offline CSV import</li>
            <li>Offline handover and branch PDF export</li>
            <li>Full hole package JSON backup/transfer</li>
            <li>Future sync when connection returns</li>
          </ul>
          <div className="targetlock-ref-limitation" role="note">
            <strong>Limitation</strong>
            <p>Offline data remains device/browser-local until sync is implemented.</p>
          </div>
        </ReferenceDocSection>

        <ReferenceDocSection
          title="API / Integration Layer"
          badge="B"
          variant="integration"
          titleTip="Connectors to client survey and planning systems (e.g. HUB-IQ, SURVEY-IQ) for automated import and governed export — subject to site access and API contracts."
        >
          <p className="targetlock-ref-section-intro">
            Enterprise scale — connect to client survey and planning systems where access is
            available.
          </p>
          <ul className="targetlock-ref-list">
            <li>HUB-IQ / SURVEY-IQ integration where access is available</li>
            <li>Survey provider import profiles</li>
            <li>Automated hole plan and survey result ingestion</li>
            <li>Project/hole matching</li>
            <li>QA/QC flags from source systems where provided</li>
            <li>Export reports/packages back to client systems</li>
          </ul>
          <div className="targetlock-ref-limitation" role="note">
            <strong>Limitation</strong>
            <p>
              Integrations depend on client access, API permissions, and data governance{" "}
              <InfoTip tip="Each site defines who may read survey data, which systems are authoritative, and how exports are approved. TargetLock cannot bypass client IT or contractual data-handling rules." />
              .
            </p>
          </div>
        </ReferenceDocSection>
      </div>

      <div className="targetlock-ref-closing" role="note">
        <p>Pilot feedback should decide which roadmap item is prioritised first.</p>
      </div>
    </article>
  );
}
