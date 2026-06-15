"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { findHole, type HoleLibrary } from "@/lib/drilling/hole-library";
import {
  evaluateProgramReadiness,
  resolveDefaultProgramId,
} from "@/lib/drilling/planner-command-center";
import { derivePlannerPrograms } from "@/lib/drilling/planner-program";
import { plannerStatus } from "@/lib/drilling/planner-status";
import type { PlannerQaReport } from "@/lib/drilling/planner-types";
import { PlannerStatusBadge } from "./PlannerStatusBadge";
import { PlannerReadinessBadge } from "./ui/PlannerReadinessBadge";
import { PlannerWorkspaceShell } from "./ui/PlannerWorkspaceShell";
import { TARGETLOCK_HOW_IT_WORKS_URL } from "@/lib/targetlock/section-links";

export type PlannerTab =
  | "create"
  | "coordinates"
  | "plans"
  | "program"
  | "map"
  | "scene3d"
  | "qa"
  | "review"
  | "package"
  | "methodology";

type Props = {
  activeTab: PlannerTab;
  onTabChange: (tab: PlannerTab) => void;
  library?: HoleLibrary | null;
  selectedProgramId?: string | null;
  onSelectProgram?: (programId: string) => void;
  selectedHoleId?: string | null;
  qaRiskCount?: number;
  qaReport?: PlannerQaReport | null;
  statusMessage?: string | null;
  /** False until browser storage has been read — keeps SSR markup stable. */
  hydrated?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  onOpenGuide?: () => void;
};

type NavGroup = {
  label: string;
  items: { id: PlannerTab; label: string }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Plan",
    items: [
      { id: "plans", label: "Plans" },
      { id: "create", label: "Create" },
      { id: "coordinates", label: "Coordinates" },
    ],
  },
  {
    label: "Visualise",
    items: [
      { id: "program", label: "Program" },
      { id: "map", label: "Map" },
      { id: "scene3d", label: "3D scene" },
    ],
  },
  {
    label: "Verify",
    items: [
      { id: "qa", label: "QA" },
      { id: "review", label: "Review" },
      { id: "package", label: "Package" },
    ],
  },
];

export function PlannerShell({
  activeTab,
  onTabChange,
  library,
  selectedProgramId,
  onSelectProgram,
  selectedHoleId,
  qaRiskCount = 0,
  qaReport,
  statusMessage,
  hydrated = true,
  children,
  footer,
  onOpenGuide,
}: Props) {
  const programs = useMemo(
    () => (library ? derivePlannerPrograms(library) : []),
    [library]
  );

  const activeProgramId =
    selectedProgramId ??
    (library ? resolveDefaultProgramId(library) : null) ??
    programs[0]?.programId ??
    null;

  const selectedHole =
    library && selectedHoleId ? findHole(library, selectedHoleId) : null;

  const programReadiness = useMemo(
    () =>
      library && activeProgramId
        ? evaluateProgramReadiness(library, activeProgramId)
        : null,
    [library, activeProgramId]
  );

  const programSelectDisabled = !hydrated || programs.length === 0;
  const programSelectValue = hydrated ? (activeProgramId ?? "") : "";

  const header = (
    <div className="planner-context-row">
      <div className="planner-context-left">
        <label className="targetlock-survey-field planner-context-program">
          <span className="sr-only">Program</span>
          <select
            value={programSelectValue}
            disabled={programSelectDisabled}
            aria-label="Active program"
            onChange={(e) => onSelectProgram?.(e.target.value)}
          >
            {!hydrated ? (
              <option value="">Loading programs…</option>
            ) : !programs.length ? (
              <option value="">No programs yet</option>
            ) : (
              programs.map((p) => (
                <option key={p.programId} value={p.programId}>
                  {p.name} ({p.holeCount})
                </option>
              ))
            )}
          </select>
        </label>
        {!hydrated ? (
          <span className="planner-context-hint">Loading library…</span>
        ) : selectedHole ? (
          <span className="planner-context-plan">
            {selectedHole.holeName}
            <PlannerStatusBadge
              status={plannerStatus(selectedHole)}
              library={library ?? undefined}
              holeId={selectedHole.holeId}
            />
          </span>
        ) : (
          <span className="planner-context-hint">No plan selected</span>
        )}
        {statusMessage ? (
          <span className="planner-context-status" role="status">
            {statusMessage}
          </span>
        ) : null}
      </div>
      <div className="planner-context-right">
        <button
          type="button"
          className={`targetlock-btn targetlock-btn-sm planner-guide-btn${
            activeTab === "methodology" ? " planner-guide-btn--active" : ""
          }`}
          onClick={() => onTabChange("methodology")}
          aria-pressed={activeTab === "methodology"}
        >
          How it works
        </button>
        {onOpenGuide ? (
          <button
            type="button"
            className="targetlock-btn targetlock-btn-sm planner-guide-btn"
            onClick={onOpenGuide}
            aria-label="Open planner guide"
            aria-haspopup="dialog"
          >
            Guide
          </button>
        ) : null}
        <Link href={TARGETLOCK_HOW_IT_WORKS_URL} className="targetlock-btn targetlock-btn-sm">
          Open TargetLock
        </Link>
      </div>
    </div>
  );

  const sidebar = (
    <div className="planner-sidebar">
      <Link href={TARGETLOCK_HOW_IT_WORKS_URL} className="planner-sidebar-brand" aria-label="TargetLock home">
        <img
          src="/images/targetlock/targetlocklogonew.png"
          alt="TargetLock IQ"
          className="targetlock-brand-logo"
          width={1536}
          height={1024}
          decoding="async"
        />
      </Link>

      <div
        className="planner-nav-groups"
        role="tablist"
        aria-label="Planner sections"
        aria-orientation="vertical"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="planner-nav-group">
            <span className="planner-nav-group-label">{group.label}</span>
            <div className="planner-nav-list">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === item.id}
                  className={`planner-nav-item${activeTab === item.id ? " active" : ""}`}
                  onClick={() => onTabChange(item.id)}
                >
                  <span className="planner-nav-item-label">{item.label}</span>
                  {item.id === "qa" && qaRiskCount > 0 ? (
                    <span className="planner-tab-badge">{qaRiskCount}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="planner-sidebar-status">
        {programReadiness ? (
          <div className="planner-sidebar-status-block">
            <span className="planner-sidebar-status-label">Program readiness</span>
            <PlannerReadinessBadge
              state={programReadiness.state}
              score={programReadiness.score}
            />
            {qaReport ? (
              <dl className="planner-sidebar-counts">
                <div>
                  <dt>Holes</dt>
                  <dd>{qaReport.holeSummaries.length}</dd>
                </div>
                <div>
                  <dt>Risks</dt>
                  <dd className={qaReport.programSummary.riskCount > 0 ? "is-risk" : "is-ok"}>
                    {qaReport.programSummary.riskCount}
                  </dd>
                </div>
                <div>
                  <dt>Warnings</dt>
                  <dd className={qaReport.programSummary.watchCount > 0 ? "is-watch" : ""}>
                    {qaReport.programSummary.watchCount}
                  </dd>
                </div>
              </dl>
            ) : null}
          </div>
        ) : null}
        {selectedHole ? (
          <div className="planner-sidebar-status-block">
            <span className="planner-sidebar-status-label">Selected plan</span>
            <span className="planner-sidebar-plan-name">{selectedHole.holeName}</span>
            <PlannerStatusBadge
              status={plannerStatus(selectedHole)}
              library={library ?? undefined}
              holeId={selectedHole.holeId}
            />
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="targetlock-app planner-app">
      <PlannerWorkspaceShell header={header} nav={sidebar} footer={footer}>
        {children}
      </PlannerWorkspaceShell>
    </div>
  );
}
