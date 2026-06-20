"use client";

import { useState } from "react";
import {
  buildApprovalSnapshot,
  branchPlanValidationStatus,
  hashDaughterPlan,
  nextBranchStatus,
} from "@/lib/drilling/branch-program-approval";
import type { BranchProgram, DaughterHole, DaughterStatus } from "@/lib/drilling/branch-program-types";
import { DAUGHTER_STATUS_LABELS } from "@/lib/drilling/branch-program-types";
import { analyzeDaughterBranch } from "@/lib/drilling/branch-program";
import { buildStations } from "@/lib/drilling/desurvey";
import type { CapabilityAssumptions } from "@/lib/drilling/capability-assumptions";
import type { BranchApprovalSnapshot } from "@/lib/drilling/branch-program-approval";
import { InfoTip } from "@/components/layout/InfoTip";

type Props = {
  program: BranchProgram;
  daughter: DaughterHole;
  recoveryAssumptions: CapabilityAssumptions;
  readOnly?: boolean;
  onApprove: (daughterHoleId: string, snapshot: BranchApprovalSnapshot) => void;
  onStatusChange: (daughterHoleId: string, status: DaughterStatus) => void;
};

export function BranchApprovalPanel({
  program,
  daughter,
  recoveryAssumptions,
  readOnly = false,
  onApprove,
  onStatusChange,
}: Props) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Directional coordinator");
  const [notes, setNotes] = useState("");

  const motherStations = buildStations(program.mother.actualRecords);
  const analysis = analyzeDaughterBranch(
    program.mother.actualRecords,
    daughter,
    program.targets,
    motherStations
  );

  const validation = branchPlanValidationStatus(daughter.approval, {
    kickoffMd: daughter.kickoffMd,
    assumptions: recoveryAssumptions,
    planHash: hashDaughterPlan(daughter.planRecords),
  });

  const handleApprove = () => {
    if (!analysis.kickoff || !name.trim()) return;
    const snapshot = buildApprovalSnapshot({
      approvedBy: name,
      role,
      notes,
      approvedMethod: daughter.method,
      approvedKickoffMd: daughter.kickoffMd,
      approvedTargetId: daughter.targetId,
      assumptions: recoveryAssumptions,
      kickoff: analysis.kickoff,
      requiredDls: analysis.requiredDls,
      planRecords: daughter.planRecords,
    });
    onApprove(daughter.daughterHoleId, snapshot);
    onStatusChange(daughter.daughterHoleId, "approved");
  };

  const advanceStatus = () => {
    const next = nextBranchStatus(daughter.status);
    if (next) onStatusChange(daughter.daughterHoleId, next);
  };

  return (
    <article className="targetlock-panel">
      <div className="targetlock-panel-title">
        <h2>Approval — {daughter.daughterId}</h2>
        <span className={`branch-status branch-status--${daughter.status}`}>
          {DAUGHTER_STATUS_LABELS[daughter.status] ?? daughter.status}
        </span>
      </div>
      <div className={`branch-validation branch-validation--${validation.state}`}>
        <strong>{validation.label}</strong> — {validation.detail}{" "}
        <InfoTip tip="If recovery assumptions or the daughter plan change after approval, the sign-off may be stale — re-approve before field use." />
      </div>
      {readOnly ? (
        <p className="targetlock-panel-copy">
          Planner-managed daughters use Hole Planner approval and execution lock. Review the
          execution banner and Execution tab for the institutional sign-off trail.
        </p>
      ) : (
        <>
          <div className="targetlock-branch-signoff targetlock-validation-section">
            <h3 className="targetlock-validation-subhead">Sign-off</h3>
            <div className="targetlock-branch-form-grid">
              <label>
                Approver name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Approver name"
                />
              </label>
              <label>
                Role
                <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" />
              </label>
            </div>
            <label>
              Notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for the handover record"
                rows={2}
              />
            </label>
          </div>
          <div className="targetlock-btn-row">
            <button type="button" className="targetlock-btn targetlock-btn-sm" onClick={advanceStatus}>
              Advance review step
            </button>
            <button
              type="button"
              className="targetlock-btn targetlock-btn-primary targetlock-btn-sm"
              onClick={handleApprove}
              disabled={!name.trim() || !analysis.kickoff}
            >
              Approve branch plan
            </button>
          </div>
        </>
      )}
    </article>
  );
}
