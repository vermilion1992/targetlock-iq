"use client";

import { useMemo, useState } from "react";
import { TargetLockFormCard } from "@/components/targetlock/TargetLockFormCard";
import { InfoTip } from "@/components/layout/InfoTip";
import { round } from "@/lib/drilling/format";
import {
  COORDINATE_CONVENTIONS,
  compareReferenceStations,
  parseReferenceCsv,
  type PlanSanityCheck,
  type ReferenceComparison,
} from "@/lib/drilling/validation";
import type { SurveyStation } from "@/lib/drilling/types";
import type { ReferenceWarning } from "@/lib/drilling/reference-system";
import { FileDropzone } from "@/components/planner/ui/FileDropzone";

type Props = {
  sanity: PlanSanityCheck;
  planStations: SurveyStation[];
  actualStations: SurveyStation[];
  referenceWarnings?: ReferenceWarning[];
};

export function ValidationPanel({
  sanity,
  planStations,
  actualStations,
  referenceWarnings = [],
}: Props) {
  const [comparePath, setComparePath] = useState<"actual" | "plan">("actual");
  const [reference, setReference] = useState<ReferenceComparison | null>(null);
  const [refMessage, setRefMessage] = useState<string | null>(null);
  const [refFileName, setRefFileName] = useState<string | null>(null);

  const compareTarget = comparePath === "actual" ? actualStations : planStations;

  const handleReferenceFile = async (file: File) => {
    let text: string;
    try {
      text = await file.text();
    } catch {
      setRefMessage(`Could not read ${file.name}.`);
      setReference(null);
      return;
    }
    const parsed = parseReferenceCsv(text);
    if (parsed.length === 0) {
      setReference(null);
      setRefMessage(
        `No reference stations found in ${file.name}. Expected columns: MD, East, North, Down.`
      );
      return;
    }
    const result = compareReferenceStations(parsed, compareTarget);
    setReference(result);
    setRefMessage(
      `Loaded ${parsed.length} reference stations from ${file.name}; matched ${result.matched} by MD.`
    );
  };

  const shownRows = useMemo(
    () => (reference ? reference.rows.slice(0, 50) : []),
    [reference]
  );

  return (
    <TargetLockFormCard
      kicker="Data review"
      title={
        <>
          Plan &amp; coordinate review{" "}
          <InfoTip tip="Sanity-check imports and compare desurvey output against trusted reference data. Decision support only — not an operational steering authority." />
        </>
      }
      className="targetlock-validation-panel"
    >

      {/* Plan import sanity check */}
      <section className="targetlock-validation-section">
        <h3 className="targetlock-validation-subhead">
          Plan import sanity check{" "}
          <InfoTip tip="Confirm units, direction, station spacing, and target before trusting the plan. Mismatched conventions can produce a believable but wrong correction." />
        </h3>
        {sanity.warnings.length > 0 ? (
          <ul className="targetlock-validation-flags">
            {sanity.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
        {sanity.hasPlan ? (
          <dl className="targetlock-validation-values">
            {sanity.rows.map((row) => (
              <div key={row.label} className={row.level === "warn" ? "is-warn" : undefined}>
                <dt>{row.label}</dt>
                <dd>
                  {row.value}
                  {row.note ? (
                    <span className="targetlock-validation-note"> {row.note}</span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      {/* Reference desurvey comparison */}
      <section className="targetlock-validation-section">
        <h3 className="targetlock-validation-subhead">
          Reference desurvey comparison{" "}
          <InfoTip tip="Upload known station coordinates from trusted software (Seequent, Micromine, acQuire, IMDEX/HUB-IQ, or a client spreadsheet) and compare the app's East/North/Down station-by-station." />
        </h3>
        <p className="targetlock-validation-help">
          CSV columns: <code>MD, East, North, Down</code>. Matched to the selected path by nearest
          MD (±0.5 m).
        </p>
        <div className="targetlock-validation-controls">
          <label className="targetlock-validation-name">
            <span>Compare against</span>
            <select
              value={comparePath}
              onChange={(e) => {
                setComparePath(e.target.value as "actual" | "plan");
                setReference(null);
                setRefMessage(null);
              }}
              aria-label="Path to compare against"
            >
              <option value="actual">Actual surveys</option>
              <option value="plan">Planned trajectory</option>
            </select>
          </label>
          <div className="targetlock-validation-name">
            <span>Reference CSV</span>
            <FileDropzone
              compact
              accept=".csv,text/csv"
              label="Choose reference desurvey CSV file"
              lead="Drop CSV or browse"
              hint="MD, East, North, Down"
              fileName={refFileName}
              onFiles={(files) => {
                setRefFileName(files[0].name);
                void handleReferenceFile(files[0]);
              }}
            />
          </div>
        </div>
        {refMessage ? (
          <p className="targetlock-validation-help" role="status" aria-live="polite">
            {refMessage}
          </p>
        ) : null}
        {reference ? (
          <>
            <dl className="targetlock-validation-values">
              <div>
                <dt>Stations matched</dt>
                <dd>
                  {reference.matched} / {reference.total}
                </dd>
              </div>
              <div className={reference.meanDistance > 0.5 ? "is-warn" : undefined}>
                <dt>Mean 3D difference</dt>
                <dd>{round(reference.meanDistance, 3)} m</dd>
              </div>
              <div className={reference.maxDistance > 1 ? "is-warn" : undefined}>
                <dt>Max 3D difference</dt>
                <dd>{round(reference.maxDistance, 3)} m</dd>
              </div>
            </dl>
            <div className="targetlock-table-wrap targetlock-table-wrap--steering">
              <table>
                <thead>
                  <tr>
                    <th>Ref MD</th>
                    <th>App MD</th>
                    <th>ΔE</th>
                    <th>ΔN</th>
                    <th>ΔD</th>
                    <th>Δ3D</th>
                  </tr>
                </thead>
                <tbody>
                  {shownRows.map((row) => (
                    <tr key={row.md}>
                      <td>{round(row.md, 1)}</td>
                      <td>{row.matched ? round(row.matchedMd ?? 0, 1) : "—"}</td>
                      <td>{row.matched ? round(row.dE, 3) : "—"}</td>
                      <td>{row.matched ? round(row.dN, 3) : "—"}</td>
                      <td>{row.matched ? round(row.dD, 3) : "—"}</td>
                      <td
                        className={
                          row.matched ? (row.distance > 1 ? "status-watch" : "status-ok") : ""
                        }
                      >
                        {row.matched ? round(row.distance, 3) : "no match"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="targetlock-validation-note">
              Small differences are expected from rounding and interpolation. Large or growing
              differences suggest a desurvey-method or convention mismatch — investigate before
              field use.
            </p>
          </>
        ) : null}
      </section>

      {/* Survey reference warnings */}
      {referenceWarnings.length > 0 ? (
        <section className="targetlock-validation-section">
          <h3 className="targetlock-validation-subhead">
            Survey reference system{" "}
            <InfoTip tip="Azimuth north-reference settings from the Settings tab. Mixed references are converted internally to true north before trajectory math." />
          </h3>
          <ul className="targetlock-validation-flags">
            {referenceWarnings.map((warning) => (
              <li key={warning.id}>{warning.message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Coordinate conventions */}
      <section className="targetlock-validation-section">
        <h3 className="targetlock-validation-subhead">
          Coordinate &amp; survey conventions{" "}
          <InfoTip tip="What the app assumes internally. Imported data must match these or corrections can be wrong." />
        </h3>
        <dl className="targetlock-validation-values targetlock-validation-conventions">
          {COORDINATE_CONVENTIONS.map((c) => (
            <div key={c.label}>
              <dt>{c.label}</dt>
              <dd>{c.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="targetlock-panel-footnote">
        TargetLock IQ is a decision-support prototype. Validate desurvey output, survey imports,
        coordinate conventions, tolerance logic, and recovery assumptions against trusted software
        and a directional drilling contractor before operational use.
      </p>
    </TargetLockFormCard>
  );
}
