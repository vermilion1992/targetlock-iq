"use client";

import { ReferenceDocSection } from "@/components/dashboard/ReferenceDocSection";
import { InfoTip } from "@/components/layout/InfoTip";

const ROLES = [
  {
    label: "Drillers",
    detail: "Clear next-survey guidance without reading raw survey files.",
  },
  {
    label: "Geologists",
    detail: "Target risk, projected miss, and trajectory context.",
  },
  {
    label: "Supervisors",
    detail: "Handover reports, decision history, and approvals.",
  },
  {
    label: "Directional contractors",
    detail: "Structured context for feasibility and correction review.",
  },
] as const;

export function MethodPurposePanel() {
  return (
    <article className="targetlock-panel targetlock-ref-panel">
      <div className="targetlock-panel-title">
        <h2>
          Method &amp; Purpose{" "}
          <InfoTip tip="TargetLock IQ is decision support only. It organizes plan, survey, and tolerance context to help teams decide what to do next — it does not certify surveys or replace site sign-off." />
        </h2>
        <span className="targetlock-mini-tag targetlock-ref-tag">Reference</span>
      </div>

      <div className="targetlock-ref-lead" role="note">
        <p className="targetlock-ref-lead-kicker">Why this section exists</p>
        <p>
          <strong>Guide Center</strong> explains how to use the app. <strong>Math reference</strong>{" "}
          explains how calculations work. This section explains why TargetLock IQ exists and what
          drilling decisions it supports.
        </p>
      </div>

      <div className="targetlock-ref-sections">
        <ReferenceDocSection title="Purpose" badge="01" variant="highlight">
          <p>
            TargetLock IQ turns hole plans and survey results into practical drilling decision
            support. It helps teams understand whether a hole is on plan, drifting, recoverable
            within tolerance, or needs technical review before the next survey or correction.
          </p>
        </ReferenceDocSection>

        <ReferenceDocSection title="What TargetLock provides" badge="02">
          <ul className="targetlock-ref-list">
            <li>Hole plan vs actual survey comparison and current position</li>
            <li>Projected target miss and offset from plan</li>
            <li>Simple action plan for the next survey interval</li>
            <li>Steering feasibility and recovery capability context</li>
            <li>QA/QC warnings on interval and target risk</li>
            <li>Plan corridor and target tolerance checks</li>
            <li>Survey tool uncertainty context (assumption-based)</li>
            <li>Decision history, supervisor sign-off, and handover reports</li>
            <li>
              Branch / daughter hole planning support{" "}
              <InfoTip tip="Structured mother-hole context, daughter targets, kickoff ranking, separation checks, and branch handover PDFs — planning aid only; field execution and contractor design remain separate." />
            </li>
          </ul>
        </ReferenceDocSection>

        <ReferenceDocSection title="Who it helps" badge="03">
          <div className="targetlock-ref-role-grid">
            {ROLES.map((role) => (
              <div key={role.label} className="targetlock-ref-role-card">
                <span className="targetlock-ref-role-label">{role.label}</span>
                <p>{role.detail}</p>
              </div>
            ))}
          </div>
        </ReferenceDocSection>

        <ReferenceDocSection title="What it does not replace" badge="04" variant="caution">
          <ul className="targetlock-ref-list">
            <li>Certified survey deliverables and independent QC systems</li>
            <li>Site geological validation and orebody interpretation</li>
            <li>Geologist and supervisor judgement on target and risk acceptance</li>
            <li>Directional drilling contractor design and tool selection approval</li>
            <li>Formal company sign-off, procedures, and regulatory obligations</li>
          </ul>
        </ReferenceDocSection>

        <ReferenceDocSection title="Why it matters" badge="05">
          <ul className="targetlock-ref-list">
            <li>Earlier drift detection before miss compounds at target depth</li>
            <li>Better shift handovers with a shared view of plan vs actual</li>
            <li>Less guesswork between surveys on whether a correction is advisable</li>
            <li>Clearer communication between field crews and technical teams</li>
            <li>Safer, more defensible decisions with traceable assumptions</li>
          </ul>
        </ReferenceDocSection>

        <ReferenceDocSection title="Directional limitations" badge="07" variant="caution">
          <p>
            TargetLock IQ does not currently calculate gravity toolface, magnetic toolface, motor
            yield, or directional-tool control settings. It provides trajectory decision support
            only. Near-vertical holes should be reviewed by the directional driller, supervisor,
            and site survey/geology team.
          </p>
        </ReferenceDocSection>

        <ReferenceDocSection title="RC2 changelog" badge="08">
          <ul className="targetlock-ref-list">
            <li>
              Reference-system conversion — plan, survey, and display north can differ; all
              azimuths convert through true north before trajectory math
            </li>
            <li>
              Reference warnings surfaced in Setup and Validation when mixed references or site
              parameters need review
            </li>
            <li>
              Near-vertical and high-angle hole advisories when steep geometry limits steering
              assumptions
            </li>
            <li>
              Recovery confidence downgrades on steep holes so reported confidence reflects hole
              mode, not just classification
            </li>
            <li>
              Directional limitations unchanged — no toolface, motor yield, or directional-tool
              control calculations
            </li>
          </ul>
        </ReferenceDocSection>

        <ReferenceDocSection title="Operating principle" badge="06" variant="highlight">
          <blockquote className="targetlock-ref-principle">
            Smart underneath, calm on top.
          </blockquote>
          <p className="targetlock-ref-muted">
            Rigorous geometry and feasibility sit behind the interface; the working view stays
            concise for field use.
          </p>
        </ReferenceDocSection>
      </div>
    </article>
  );
}
