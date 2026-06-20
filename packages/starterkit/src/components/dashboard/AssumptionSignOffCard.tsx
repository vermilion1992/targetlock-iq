"use client";

import { useState } from "react";
import { InfoTip } from "@/components/layout/InfoTip";
import type { AssumptionSignOff, AssumptionValidationStatus } from "@/lib/drilling/validation";

type Props = {
  status: AssumptionValidationStatus;
  signOff: AssumptionSignOff | null;
  onSignOff: (validatedBy: string) => void;
  onClearSignOff: () => void;
};

function statusClass(state: AssumptionValidationStatus["state"]): string {
  if (state === "validated") return "validation-ok";
  if (state === "stale") return "validation-stale";
  return "validation-unvalidated";
}

export function AssumptionSignOffCard({
  status,
  signOff,
  onSignOff,
  onClearSignOff,
}: Props) {
  const [name, setName] = useState("");

  return (
    <article className="targetlock-settings-form-card targetlock-assumption-signoff-card">
      <header className="targetlock-settings-form-card-head">
        <div className="targetlock-form-card-head-text">
          <p className="targetlock-settings-form-card-kicker">Governance</p>
          <h3 className="targetlock-settings-form-card-title">
            Assumption sign-off{" "}
            <InfoTip tip="Record who reviewed recovery capability assumptions before they influence steering decisions. Editing assumptions afterwards marks sign-off stale." />
          </h3>
        </div>
        <span className={`targetlock-validation-pill ${statusClass(status.state)}`}>
          {status.label}
        </span>
      </header>

      <div className="targetlock-settings-form-card-body">
        {status.state !== "validated" ? (
          <div className={`targetlock-validation-warning ${statusClass(status.state)}`} role="note">
            <strong>{status.state === "stale" ? "Re-validate assumptions" : "Assumptions not signed off"}</strong>
            <p>{status.detail}</p>
          </div>
        ) : null}

        {signOff && status.state !== "unvalidated" ? (
          <div className="targetlock-validation-signoff">
            <dl className="targetlock-validation-values">
              <div>
                <dt>Validated by</dt>
                <dd>{signOff.validatedBy}</dd>
              </div>
              <div>
                <dt>Signed</dt>
                <dd>{new Date(signOff.validatedAt).toLocaleString("en-AU")}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="targetlock-btn targetlock-btn-sm"
              onClick={() => void onClearSignOff()}
            >
              Clear sign-off
            </button>
          </div>
        ) : (
          <div className="targetlock-validation-signoff">
            <label className="targetlock-validation-name">
              <span>Reviewer name / role</span>
              <input
                type="text"
                value={name}
                placeholder="e.g. J. Smith — Senior Geologist"
                onChange={(e) => setName(e.target.value)}
                aria-label="Reviewer name and role"
              />
            </label>
            <button
              type="button"
              className="targetlock-btn targetlock-btn-primary targetlock-btn-sm"
              disabled={name.trim().length < 2}
              onClick={() => {
                onSignOff(name.trim());
                setName("");
              }}
            >
              Mark assumptions validated
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
