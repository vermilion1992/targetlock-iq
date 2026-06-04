import type { ImportKind } from "./csv-import-assistant";
import type { PlanCorridorConfig } from "./plan-corridor";
import type { SurveyRecord } from "./types";

export type ImportUndoSnapshot = {
  kind: ImportKind;
  previousPlan: SurveyRecord[];
  previousActual: SurveyRecord[];
  previousCorridor: PlanCorridorConfig;
};

export function buildImportUndoSnapshot(params: {
  kind: ImportKind;
  planRecords: SurveyRecord[];
  actualRecords: SurveyRecord[];
  planCorridor: PlanCorridorConfig;
}): ImportUndoSnapshot {
  return {
    kind: params.kind,
    previousPlan: [...params.planRecords],
    previousActual: [...params.actualRecords],
    previousCorridor: { ...params.planCorridor },
  };
}

export function describeImportUndo(snapshot: ImportUndoSnapshot): string {
  const label = snapshot.kind === "plan" ? "hole plan" : "survey results";
  return `Restore previous ${label} and surveys for this hole.`;
}
