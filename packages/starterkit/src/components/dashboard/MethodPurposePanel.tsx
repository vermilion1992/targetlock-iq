"use client";

import type { ReactNode } from "react";
import { InfoTip } from "@/components/layout/InfoTip";

function MethodSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="targetlock-method-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function MethodPurposePanel() {
  return (
    <article className="targetlock-panel targetlock-method-panel">
      <div className="targetlock-panel-title">
        <h2>
          Method &amp; Purpose{" "}
          <InfoTip tip="TargetLock IQ is decision support only. It organizes plan, survey, and tolerance context to help teams decide what to do next — it does not certify surveys or replace site sign-off." />
        </h2>
        <span className="targetlock-mini-tag">Reference</span>
      </div>
      <p className="targetlock-panel-copy">
        Guide Center explains how to use the app. Math reference explains how calculations work.
        This tab explains why TargetLock IQ exists and what drilling decisions it supports.
      </p>

      <div className="targetlock-method-sections">
        <MethodSection title="Purpose">
          <p>
            TargetLock IQ turns hole plans and survey results into practical drilling decision
            support. It helps teams understand whether a hole is on plan, drifting, recoverable
            within tolerance, or needs technical review before the next survey or correction.
          </p>
        </MethodSection>

        <MethodSection title="What TargetLock provides">
          <ul>
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
        </MethodSection>

        <MethodSection title="Who it helps">
          <ul>
            <li>
              <strong>Drillers</strong> — clear next-survey guidance without reading raw survey
              files
            </li>
            <li>
              <strong>Geologists</strong> — target risk, projected miss, and trajectory context
            </li>
            <li>
              <strong>Supervisors</strong> — handover reports, decision history, and approvals
            </li>
            <li>
              <strong>Directional contractors</strong> — structured context for feasibility and
              correction review
            </li>
          </ul>
        </MethodSection>

        <MethodSection title="What it does not replace">
          <ul>
            <li>Certified survey deliverables and independent QC systems</li>
            <li>Site geological validation and orebody interpretation</li>
            <li>Geologist and supervisor judgement on target and risk acceptance</li>
            <li>Directional drilling contractor design and tool selection approval</li>
            <li>Formal company sign-off, procedures, and regulatory obligations</li>
          </ul>
        </MethodSection>

        <MethodSection title="Why it matters">
          <ul>
            <li>Earlier drift detection before miss compounds at target depth</li>
            <li>Better shift handovers with a shared view of plan vs actual</li>
            <li>Less guesswork between surveys on whether a correction is advisable</li>
            <li>Clearer communication between field crews and technical teams</li>
            <li>Safer, more defensible decisions with traceable assumptions</li>
          </ul>
        </MethodSection>

        <MethodSection title="Operating principle">
          <blockquote className="targetlock-method-principle">
            Smart underneath, calm on top.
          </blockquote>
          <p className="targetlock-panel-footnote">
            Rigorous geometry and feasibility sit behind the interface; the working view stays
            concise for field use.
          </p>
        </MethodSection>
      </div>
    </article>
  );
}
