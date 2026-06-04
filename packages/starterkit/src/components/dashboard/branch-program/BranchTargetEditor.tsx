"use client";

import { useState } from "react";
import { InfoTip } from "@/components/layout/InfoTip";
import type { BranchTarget, BranchTargetPurpose } from "@/lib/drilling/branch-program-types";
import {
  sanitizeBranchCoordField,
  sanitizeBranchToleranceM,
} from "@/lib/drilling/workspace-action-contract";

type Props = {
  targets: BranchTarget[];
  onAdd: (t: Omit<BranchTarget, "id">) => void;
  onUpdate: (id: string, patch: Partial<BranchTarget>) => void;
  onRemove: (id: string) => void;
};

const PURPOSES: BranchTargetPurpose[] = [
  "resource-definition",
  "step-out",
  "infill",
  "extension",
  "wedge-recovery",
  "geotechnical",
];

function purposeLabel(p: BranchTargetPurpose): string {
  return p.replace(/-/g, " ");
}

export function BranchTargetEditor({ targets, onAdd, onUpdate, onRemove }: Props) {
  const [label, setLabel] = useState("New target");
  const [e, setE] = useState("0");
  const [n, setN] = useState("0");
  const [d, setD] = useState("0");
  const [toleranceM, setToleranceM] = useState("8");

  const handleAdd = () => {
    onAdd({
      label: label.trim() || "Target",
      e: sanitizeBranchCoordField(e, 0),
      n: sanitizeBranchCoordField(n, 0),
      d: sanitizeBranchCoordField(d, 0),
      type: "point",
      priority: targets.length + 1,
      toleranceM: sanitizeBranchToleranceM(toleranceM, 8),
      purpose: "resource-definition",
    });
  };

  return (
    <article className="targetlock-panel">
      <div className="targetlock-panel-title">
        <h2>
          Target library{" "}
          <InfoTip tip="Point targets with tolerance envelopes for daughter planning. Coordinates use the same E/N/D convention as the mother hole." />
        </h2>
        <span className="targetlock-mini-tag">{targets.length} targets</span>
      </div>
      <p className="targetlock-panel-copy">
        Define branch targets before ranking kickoff options in the planner below.
      </p>

      {targets.length === 0 ? (
        <p className="branch-program-muted">No targets yet — add one using the form below.</p>
      ) : (
        <ul className="targetlock-branch-card-list">
          {targets.map((t) => (
            <li key={t.id} className="targetlock-branch-card">
              <div className="targetlock-branch-card-main">
                <strong>{t.label}</strong>
                <span className="targetlock-branch-coords">
                  E {t.e.toFixed(1)} · N {t.n.toFixed(1)} · D {t.d.toFixed(1)} · ±
                  {t.toleranceM ?? 8} m
                </span>
              </div>
              <div className="targetlock-branch-card-actions">
                <select
                  value={t.purpose ?? "resource-definition"}
                  onChange={(ev) =>
                    onUpdate(t.id, { purpose: ev.target.value as BranchTargetPurpose })
                  }
                  aria-label={`Purpose for ${t.label}`}
                >
                  {PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {purposeLabel(p)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="targetlock-btn targetlock-btn-sm"
                  onClick={() => onRemove(t.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="targetlock-validation-section">
        <h3 className="targetlock-validation-subhead">Add target</h3>
        <div className="targetlock-branch-form-grid">
          <label>
            Label
            <input value={label} onChange={(ev) => setLabel(ev.target.value)} placeholder="Label" />
          </label>
          <label>
            East (m)
            <input
              value={e}
              onChange={(ev) =>
                setE(String(sanitizeBranchCoordField(ev.target.value, Number(e) || 0)))
              }
              inputMode="decimal"
            />
          </label>
          <label>
            North (m)
            <input
              value={n}
              onChange={(ev) =>
                setN(String(sanitizeBranchCoordField(ev.target.value, Number(n) || 0)))
              }
              inputMode="decimal"
            />
          </label>
          <label>
            Down (m)
            <input
              value={d}
              onChange={(ev) =>
                setD(String(sanitizeBranchCoordField(ev.target.value, Number(d) || 0)))
              }
              inputMode="decimal"
            />
          </label>
          <label>
            Tolerance (m)
            <input
              value={toleranceM}
              onChange={(ev) =>
                setToleranceM(
                  String(sanitizeBranchToleranceM(ev.target.value, Number(toleranceM) || 8))
                )
              }
              inputMode="decimal"
            />
          </label>
        </div>
        <div className="targetlock-btn-row">
          <button
            type="button"
            className="targetlock-btn targetlock-btn-primary targetlock-btn-sm"
            onClick={handleAdd}
          >
            Add target
          </button>
        </div>
      </div>
    </article>
  );
}
