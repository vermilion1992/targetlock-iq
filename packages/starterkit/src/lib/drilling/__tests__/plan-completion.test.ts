import { describe, expect, it } from "vitest";
import { createLibraryWithHole, buildBlankProject } from "../hole-library";
import { activatePlannerPlanForExecution } from "../execution-bridge";
import { completePlannerExecution } from "../plan-completion";
import { buildPlannerExecutionReportContext } from "../execution-bridge";
import type { PlannerProjectMetadata } from "../planner-types";
import type { SavedHoleProject } from "../storage";

function plannerHole(
  overrides: Partial<SavedHoleProject> & { holeId: string; holeName: string }
): SavedHoleProject {
  const meta: PlannerProjectMetadata = {
    coordinateMode: "collar-relative",
    northReference: "grid",
    plannedAt: "2026-01-01T00:00:00.000Z",
    createdFromPlanner: true,
    status: "planned",
    planRevision: 1,
    ...(overrides.plannerMeta ?? {}),
  };
  return {
    ...buildBlankProject(overrides.holeName, "Site", overrides.holeId),
    planRecords: overrides.planRecords ?? [
      { md: 0, dip: -60, azimuth: 90 },
      { md: 300, dip: -62, azimuth: 92 },
    ],
    actualRecords: overrides.actualRecords ?? [{ md: 0, dip: -60, azimuth: 90 }],
    plannerMeta: meta,
    ...overrides,
  };
}

describe("plan-completion", () => {
  it("completing active planner hole sets status completed", () => {
    const hole = plannerHole({
      holeId: "c1",
      holeName: "C1",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    let lib = createLibraryWithHole(hole);
    lib = activatePlannerPlanForExecution(lib, "c1")!;
    const result = completePlannerExecution(lib, "c1", {
      completedBy: "Driller",
      completedAt: "2026-06-10T00:00:00.000Z",
    });
    expect(result).not.toBeNull();
    expect(result!.completedHole.plannerMeta?.status).toBe("completed");
    expect(result!.completedHole.plannerMeta?.executionStatus?.state).toBe(
      "completed"
    );
  });

  it("completion preserves lockedPlan and actualRecords", () => {
    const hole = plannerHole({
      holeId: "c2",
      holeName: "C2",
      actualRecords: [
        { md: 0, dip: -60, azimuth: 90 },
        { md: 80, dip: -61, azimuth: 91 },
      ],
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    let lib = createLibraryWithHole(hole);
    lib = activatePlannerPlanForExecution(lib, "c2")!;
    const lockedHash = lib.holes[0]!.plannerMeta!.lockedPlan!.planHash;
    const result = completePlannerExecution(lib, "c2");
    expect(result!.completedHole.plannerMeta?.lockedPlan?.planHash).toBe(
      lockedHash
    );
    expect(result!.completedHole.actualRecords).toHaveLength(2);
    expect(lib.activeHoleId).toBe("c2");
    expect(result!.library.activeHoleId).toBe("c2");
  });

  it("completion snapshot includes final actual MD and survey count", () => {
    const hole = plannerHole({
      holeId: "c3",
      holeName: "C3",
      actualRecords: [
        { md: 0, dip: -60, azimuth: 90 },
        { md: 120, dip: -60.5, azimuth: 90.5 },
      ],
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    let lib = createLibraryWithHole(hole);
    lib = activatePlannerPlanForExecution(lib, "c3")!;
    const result = completePlannerExecution(lib, "c3");
    const snap = result!.completedHole.plannerMeta?.completionSnapshot;
    expect(snap).toBeTruthy();
    expect(snap!.actualSurveyCount).toBe(2);
    expect(snap!.finalActualMd).toBe(120);
    expect(snap!.lockedPlanHash).toBeTruthy();
    expect(snap!.planRevision).toBe(1);
  });

  it("completing non-planner or unlocked hole returns null", () => {
    const nonPlanner = buildBlankProject("NP", "Site", "np1");
    let lib = createLibraryWithHole(nonPlanner);
    expect(completePlannerExecution(lib, "np1")).toBeNull();

    const unlocked = plannerHole({
      holeId: "c4",
      holeName: "C4",
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    lib = createLibraryWithHole(unlocked);
    expect(completePlannerExecution(lib, "c4")).toBeNull();
  });

  it("reports include completion context", () => {
    const hole = plannerHole({
      holeId: "c5",
      holeName: "C5",
      actualRecords: [
        { md: 0, dip: -60, azimuth: 90 },
        { md: 50, dip: -60, azimuth: 90 },
      ],
      plannerMeta: {
        coordinateMode: "collar-relative",
        northReference: "grid",
        plannedAt: "2026-01-01T00:00:00.000Z",
        createdFromPlanner: true,
        status: "approved",
      },
    });
    let lib = createLibraryWithHole(hole);
    lib = activatePlannerPlanForExecution(lib, "c5")!;
    const result = completePlannerExecution(lib, "c5", { completedBy: "Geo" });
    const completed = result!.completedHole;
    const report = buildPlannerExecutionReportContext(completed, result!.library, {
      finalActualMd: 50,
    });
    expect(report?.completionSnapshot?.completedBy).toBe("Geo");
    expect(report?.executionState).toBe("completed");
    expect(report?.finalActualMd).toBe(50);
  });
});
