"use client";

import { useState } from "react";
import { InfoTip } from "@/components/layout/InfoTip";
import {
  SUPERVISOR_DECISIONS,
  type SupervisorDecisionKind,
} from "@/lib/drilling/approval";
import type { Recommendation } from "@/lib/drilling/types";

type Props = {
  recommendation: Recommendation | null;
  onDecision: (kind: SupervisorDecisionKind, notes: string) => void;
};

export function SupervisorApprovalPanel({ recommendation, onDecision }: Props) {
  const [notes, setNotes] = useState("");
  const disabled = !recommendation;

  return (
    <article className="targetlock-panel advanced-only">
      <div className="targetlock-panel-title">
        <h2>
          Supervisor decision{" "}
          <InfoTip tip="Record geologist or supervisor approval for the shift handover log. Does not replace site sign-off." />
        </h2>
        <span className="targetlock-mini-tag">Governance</span>
      </div>
      <div className="targetlock-stack">
        <p className="targetlock-panel-copy">
          Log how the hole should proceed before export. Decisions appear in decision history and
          handover reports.
        </p>
        <label className="block">
          <span className="text-sm">Notes (optional)</span>
          <textarea
            className="targetlock-textarea targetlock-field-mt w-full"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Geologist on shift — continue with 30 m surveys"
            disabled={disabled}
            aria-label="Supervisor decision notes"
          />
        </label>
        <div className="targetlock-approval-grid" role="group" aria-label="Supervisor decisions">
        {SUPERVISOR_DECISIONS.map((option) => (
          <button
            key={option.kind}
            type="button"
            className={`targetlock-btn targetlock-approval-btn approval-${option.kind}`}
            disabled={disabled}
            onClick={() => {
              onDecision(option.kind, notes);
              setNotes("");
            }}
          >
            <strong>{option.label}</strong>
            <span>{option.description}</span>
          </button>
        ))}
        </div>
      </div>
    </article>
  );
}
