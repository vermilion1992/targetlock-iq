"use client";

import { HeroSubHeader } from "@/components/dashboard/HeroSubHeader";
import { InfoTip } from "@/components/layout/InfoTip";
import { round } from "@/lib/drilling/format";
import type { SurveyStation } from "@/lib/drilling/types";

const SURVEYS_PANEL_TIP =
  "Desurveyed actual path using minimum curvature — one row per survey station imported or entered in the sidebar.";

type Props = {
  actualStations: SurveyStation[];
  latestSurveyMd?: number | null;
};

export function SurveysPanel({ actualStations, latestSurveyMd }: Props) {
  const latestLabel =
    latestSurveyMd != null && Number.isFinite(latestSurveyMd)
      ? `Latest survey ${round(latestSurveyMd, 0)} m`
      : "--";

  return (
    <article className="targetlock-settings-form-card targetlock-surveys-panel">
      <HeroSubHeader
        kicker="Survey log"
        title={
          <>
            Actual surveys <InfoTip tip={SURVEYS_PANEL_TIP} />
          </>
        }
        meta={<span className="targetlock-mini-tag">{latestLabel}</span>}
      />
      <div className="targetlock-settings-form-card-body">
        {actualStations.length === 0 ? (
          <p className="targetlock-settings-form-card-copy">
            No actual surveys yet — import a survey CSV or add stations in the sidebar.
          </p>
        ) : (
          <div className="targetlock-table-wrap targetlock-table-wrap--surveys">
            <table>
              <thead>
                <tr>
                  <th>MD</th>
                  <th>Dip</th>
                  <th>Azimuth</th>
                  <th>East</th>
                  <th>North</th>
                  <th>Down</th>
                  <th>DLS</th>
                </tr>
              </thead>
              <tbody>
                {actualStations.map((station) => (
                  <tr key={station.md}>
                    <td>{round(station.md, 0)}</td>
                    <td>{round(station.dip, 1)}</td>
                    <td>{round(station.azimuth, 1)}</td>
                    <td>{round(station.e, 1)}</td>
                    <td>{round(station.n, 1)}</td>
                    <td>{round(station.d, 1)}</td>
                    <td>{round(station.dls, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </article>
  );
}
