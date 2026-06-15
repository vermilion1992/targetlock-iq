"use client";



import { useMemo, useState } from "react";

import type { HoleLibrary } from "@/lib/drilling/hole-library";

import {

  listPlannerHoles,

  plannerHoleSummary,

} from "@/lib/drilling/planner-program";

import { buildProgramQaReport } from "@/lib/drilling/planner-qa";

import { derivePlannerPrograms } from "@/lib/drilling/planner-program";

import type {

  PlannerHoleQaSummary,

  PlannerPlanStatus,

  PlannerQaReport,

} from "@/lib/drilling/planner-types";

import { PLANNER_STATUSES } from "@/lib/drilling/planner-types";

import { PlannerPlanCard } from "./PlannerPlanCard";

import { PlannerPlanTable, type PlannerPlanAction } from "./PlannerPlanTable";

import { PlannerEmptyState } from "./ui/PlannerEmptyState";

import { PlannerSectionHeader } from "./ui/PlannerSectionHeader";



type Props = {

  library: HoleLibrary;

  selectedHoleId?: string | null;

  qaReport?: PlannerQaReport | null;

  onSelect: (holeId: string) => void;

  onAction: (holeId: string, action: PlannerPlanAction) => void;

  onCreateNew: () => void;

  onCreateDaughter?: () => void;

  onImportPlanned?: () => void;

  onLoadDemo?: () => void;

};



export function PlannerLibraryView({

  library,

  selectedHoleId,

  onSelect,

  onAction,

  onCreateNew,

  qaReport,

  onCreateDaughter,

  onImportPlanned,

  onLoadDemo,

}: Props) {

  const [statusFilter, setStatusFilter] = useState<PlannerPlanStatus | "all">("all");

  const [programFilter, setProgramFilter] = useState<string>("all");

  const [typeFilter, setTypeFilter] = useState<"all" | "standard" | "daughter">("all");



  const holes = useMemo(() => listPlannerHoles(library, { includeArchived: true }), [library]);



  const programs = useMemo(() => {

    const names = new Set<string>();

    for (const h of holes) {

      names.add(h.plannerMeta?.programName ?? "Unassigned");

    }

    return [...names].sort();

  }, [holes]);



  const qaByHoleId = useMemo(() => {

    const map = new Map<string, PlannerHoleQaSummary>();

    if (qaReport) {

      for (const summary of qaReport.holeSummaries) {

        map.set(summary.holeId, summary);

      }

      return map;

    }

    const programs = derivePlannerPrograms(library);

    for (const program of programs) {

      const report = buildProgramQaReport(library, program.programId);

      if (!report) continue;

      for (const summary of report.holeSummaries) {

        map.set(summary.holeId, summary);

      }

    }

    return map;

  }, [library, qaReport]);



  const rows = useMemo(() => {

    return holes

      .map((h) => plannerHoleSummary(h, library))

      .filter((row) => {

        if (statusFilter !== "all" && row.status !== statusFilter) return false;

        if (programFilter !== "all" && (row.programName ?? "Unassigned") !== programFilter) {

          return false;

        }

        if (typeFilter === "standard" && row.planType === "daughter") return false;

        if (typeFilter === "daughter" && row.planType !== "daughter") return false;

        return true;

      });

  }, [holes, library, statusFilter, programFilter, typeFilter]);



  return (

    <div className="planner-library-view">

      <article className="targetlock-panel">

        <PlannerSectionHeader

          title="Plans"

          subtitle="Dense program library — status, readiness, QA, and actions per row."

          actions={

            <div className="targetlock-btn-row">

              <button

                type="button"

                className="targetlock-btn targetlock-btn-sm targetlock-btn-primary"

                onClick={onCreateNew}

              >

                New standard

              </button>

              {onCreateDaughter ? (

                <button

                  type="button"

                  className="targetlock-btn targetlock-btn-sm"

                  onClick={onCreateDaughter}

                >

                  Daughter

                </button>

              ) : null}

              {onImportPlanned ? (

                <button

                  type="button"

                  className="targetlock-btn targetlock-btn-sm"

                  onClick={onImportPlanned}

                >

                  Import

                </button>

              ) : null}

              {onLoadDemo ? (

                <button

                  type="button"

                  className="targetlock-btn targetlock-btn-sm"

                  onClick={onLoadDemo}

                >

                  Demo program

                </button>

              ) : null}

            </div>

          }

        />



        <div className="planner-library-filters">

          <label className="targetlock-survey-field">

            <span>Status</span>

            <select

              value={statusFilter}

              onChange={(e) =>

                setStatusFilter(e.target.value as PlannerPlanStatus | "all")

              }

            >

              <option value="all">All statuses</option>

              {PLANNER_STATUSES.map((s) => (

                <option key={s} value={s}>

                  {s}

                </option>

              ))}

            </select>

          </label>

          <label className="targetlock-survey-field">

            <span>Program</span>

            <select

              value={programFilter}

              onChange={(e) => setProgramFilter(e.target.value)}

            >

              <option value="all">All programs</option>

              {programs.map((p) => (

                <option key={p} value={p}>

                  {p}

                </option>

              ))}

            </select>

          </label>

          <label className="targetlock-survey-field">

            <span>Type</span>

            <select

              value={typeFilter}

              onChange={(e) =>

                setTypeFilter(e.target.value as "all" | "standard" | "daughter")

              }

            >

              <option value="all">All types</option>

              <option value="standard">Standard</option>

              <option value="daughter">Daughter</option>

            </select>

          </label>

        </div>



        {!rows.length ? (

          <PlannerEmptyState

            message="No planner holes yet. Load the demo program to explore, or create a standard hole, daughter hole, or import a program."

            actions={

              <>

                {onLoadDemo ? (

                  <button

                    type="button"

                    className="targetlock-btn targetlock-btn-primary"

                    onClick={onLoadDemo}

                  >

                    Load demo program

                  </button>

                ) : null}

                <button

                  type="button"

                  className={`targetlock-btn${onLoadDemo ? "" : " targetlock-btn-primary"}`}

                  onClick={onCreateNew}

                >

                  Create plan

                </button>

              </>

            }

          />

        ) : (

          <>

            <div className="planner-library-table-desktop">

              <PlannerPlanTable

                rows={rows}

                selectedHoleId={selectedHoleId}

                qaByHoleId={qaByHoleId}

                library={library}

                onSelect={onSelect}

                onAction={onAction}

              />

            </div>

            <div className="planner-library-cards-mobile">

              {rows.map((row) => (

                <PlannerPlanCard

                  key={row.holeId}

                  row={row}

                  selected={selectedHoleId === row.holeId}

                  qaBadge={qaByHoleId.get(row.holeId)?.badge}

                  onSelect={onSelect}

                  onAction={onAction}

                />

              ))}

            </div>

          </>

        )}

      </article>

    </div>

  );

}


