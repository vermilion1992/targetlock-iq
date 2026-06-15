"use client";

import { useMemo, useState } from "react";
import {
  rankKickoffOptionsWithSeparation,
  topKickoffComparisons,
} from "@/lib/drilling/branch-program";
import type {
  BranchMethod,
  BranchProgram,
} from "@/lib/drilling/branch-program-types";
import { buildStations } from "@/lib/drilling/desurvey";
import { round } from "@/lib/drilling/format";
import type { CreateDaughterInput } from "@/lib/drilling/branch-program-library";
import { InfoTip } from "@/components/layout/InfoTip";
import { ToolfaceEstimateCard } from "./ToolfaceEstimateCard";

type Props = {
  program: BranchProgram;
  readOnly?: boolean;
  onSaveDaughter: (input: CreateDaughterInput) => string | null;
};

export function KickoffPlannerPanel({ program, readOnly = false, onSaveDaughter }: Props) {
  const defaults = program.persisted?.kickoffPlannerDefaults ?? program.kickoffWindow;
  const [targetId, setTargetId] = useState(program.targets[0]?.id ?? "");
  const [mdMin, setMdMin] = useState(String(defaults?.mdMin ?? 420));
  const [mdMax, setMdMax] = useState(String(defaults?.mdMax ?? 540));
  const [stepM, setStepM] = useState(String(defaults?.stepM ?? 30));
  const [preferredMethod, setPreferredMethod] = useState<BranchMethod | "contractor-review">(
    "motor-navi"
  );
  const [selectedMd, setSelectedMd] = useState<number | null>(null);
  const [daughterId, setDaughterId] = useState("DDH-0247A");
  const [method, setMethod] = useState<BranchMethod>("motor-navi");

  const target = program.targets.find((t) => t.id === targetId);

  const ranked = useMemo(() => {
    if (!target) return [];
    const motherStations = buildStations(program.mother.actualRecords);
    const siblings = program.daughters.map((d) => d.planRecords);
    return rankKickoffOptionsWithSeparation(
      program.mother.actualRecords,
      target,
      Number(mdMin),
      Number(mdMax),
      Number(stepM),
      {
        motherStations,
        siblingPlanRecords: siblings,
        preferredMethod,
      }
    );
  }, [program, target, mdMin, mdMax, stepM, preferredMethod]);

  const top3 = topKickoffComparisons(ranked);
  const previewOpt = ranked.find((r) => r.kickoffMd === selectedMd) ?? ranked[0];

  const handleSave = () => {
    if (!target || selectedMd == null) return;
    const id = daughterId.trim() || `DDH-${program.mother.holeId}A`;
    onSaveDaughter({
      daughterId: id,
      targetId: target.id,
      kickoffMd: selectedMd,
      method,
      status: "draft",
    });
  };

  return (
    <article className="targetlock-panel">
      <div className="targetlock-panel-title">
        <h2>
          Kickoff planner{" "}
          <InfoTip tip="Ranks kickoff MD steps from the actual mother hole path. Required DLS and separation are planning estimates — confirm before drilling." />
        </h2>
      </div>
      <p className="targetlock-panel-copy">
        Kickoff from actual mother survey — not planned path alone.
        {readOnly
          ? " Rank options here for field decisions; create or revise daughter plans in Hole Planner."
          : null}
      </p>

      <div className="targetlock-branch-form-grid">
        <label>
          Target
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            {program.targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          MD min
          <input value={mdMin} onChange={(e) => setMdMin(e.target.value)} inputMode="decimal" />
        </label>
        <label>
          MD max
          <input value={mdMax} onChange={(e) => setMdMax(e.target.value)} inputMode="decimal" />
        </label>
        <label>
          Step (m)
          <select value={stepM} onChange={(e) => setStepM(e.target.value)}>
            <option value="3">3</option>
            <option value="6">6</option>
            <option value="10">10</option>
            <option value="30">30</option>
          </select>
        </label>
        <label>
          Preferred method
          <select
            value={preferredMethod}
            onChange={(e) => setPreferredMethod(e.target.value as BranchMethod | "contractor-review")}
          >
            <option value="natural">Natural</option>
            <option value="motor-navi">Motor / Navi</option>
            <option value="devidrill-dcd">DeviDrill / DCD</option>
            <option value="wedge">Wedge</option>
            <option value="contractor-review">Contractor review</option>
          </select>
        </label>
        <label>
          New daughter ID
          <input
            value={daughterId}
            onChange={(e) => setDaughterId(e.target.value)}
            disabled={readOnly}
          />
        </label>
        <label>
          Branch method
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as BranchMethod)}
            disabled={readOnly}
          >
            <option value="natural">Natural</option>
            <option value="motor-navi">Motor / Navi</option>
            <option value="devidrill-dcd">DeviDrill / DCD</option>
            <option value="wedge">Wedge</option>
            <option value="planned-sidetrack">Planned sidetrack</option>
          </select>
        </label>
      </div>

      {target && ranked.length > 0 ? (
        <>
          <div className="targetlock-validation-section">
            <h3 className="targetlock-validation-subhead">Ranked kickoff options</h3>
            <div className="branch-program-table-wrap">
              <table className="branch-program-table">
                <thead>
                  <tr>
                    <th>
                      MD{" "}
                      <InfoTip tip="Candidate kickoff measured depth on the mother hole." />
                    </th>
                    <th>
                      DLS{" "}
                      <InfoTip tip="Estimated dogleg severity (° per 30 m) to reach the daughter heading from this kickoff." />
                    </th>
                    <th>Dir. m</th>
                    <th>
                      Mother sep{" "}
                      <InfoTip tip="Minimum centre-to-centre separation from the mother hole at kickoff — planning check only." />
                    </th>
                    <th>
                      Sibling sep{" "}
                      <InfoTip tip="Minimum separation from other daughter legs at kickoff." />
                    </th>
                    <th>Feasibility</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ranked.slice(0, 12).map((r) => (
                    <tr
                      key={r.kickoffMd}
                      className={selectedMd === r.kickoffMd ? "is-selected" : undefined}
                    >
                      <td>{round(r.kickoffMd, 0)}</td>
                      <td>{round(r.requiredDls, 1)}</td>
                      <td>{round(r.directionalM, 0)}</td>
                      <td>{round(r.motherSeparationM ?? 0, 1)}</td>
                      <td>{round(r.siblingSeparationM ?? 999, 1)}</td>
                      <td>{r.feasibility}</td>
                      <td>
                        <button
                          type="button"
                          className={`targetlock-btn targetlock-btn-sm${selectedMd === r.kickoffMd ? " targetlock-btn-primary" : ""}`}
                          onClick={() => setSelectedMd(r.kickoffMd)}
                        >
                          {selectedMd === r.kickoffMd ? "Selected" : "Select"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {top3 ? (
            <div className="branch-kickoff-cards">
              {(
                [
                  ["Best control", top3.bestControl],
                  ["Shortest path", top3.shortestPath],
                  ["Lowest dogleg", top3.lowestDogleg],
                ] as const
              ).map(([title, opt]) => (
                <article
                  key={title}
                  className={`branch-kickoff-card${selectedMd === opt.kickoffMd ? " is-picked" : ""}`}
                >
                  <h4>{title}</h4>
                  <p>
                    MD {round(opt.kickoffMd, 0)} · DLS {round(opt.requiredDls, 1)}°/30 m
                  </p>
                  <button
                    type="button"
                    className={`targetlock-btn targetlock-btn-sm${selectedMd === opt.kickoffMd ? " targetlock-btn-primary" : ""}`}
                    onClick={() => setSelectedMd(opt.kickoffMd)}
                  >
                    Use this kickoff
                  </button>
                </article>
              ))}
            </div>
          ) : null}

          {previewOpt && target ? (
            <ToolfaceEstimateCard
              kickoff={previewOpt.kickoff}
              daughterDip={previewOpt.daughterDip}
              daughterAzimuth={previewOpt.daughterAzimuth}
            />
          ) : null}

          <p className="targetlock-branch-selected">
            Selected kickoff:{" "}
            <strong>{selectedMd != null ? `${round(selectedMd, 0)} m` : "—"}</strong>
          </p>
          <div className="targetlock-btn-row">
            {!readOnly ? (
              <button
                type="button"
                className="targetlock-btn targetlock-btn-primary"
                onClick={handleSave}
                disabled={selectedMd == null || !target}
              >
                Save as daughter plan (draft)
              </button>
            ) : (
              <p className="targetlock-helper m-0" role="note">
                Daughter plans are created and revised in Hole Planner for this program.
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="branch-program-muted">
          Add a target and mother actual surveys to rank kickoff options.
        </p>
      )}
    </article>
  );
}
