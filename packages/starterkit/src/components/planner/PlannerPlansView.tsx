"use client";

import type { HoleLibrary } from "@/lib/drilling/hole-library";
import type { PlannerQaReport } from "@/lib/drilling/planner-types";
import type { PlannerPlanAction } from "./PlannerPlanTable";
import { PlannerLibraryView } from "./PlannerLibraryView";

type Props = {
  library: HoleLibrary;
  selectedHoleId?: string | null;
  qaReport?: PlannerQaReport | null;
  onSelectHole: (holeId: string) => void;
  onAction: (holeId: string, action: PlannerPlanAction) => void;
  onCreateStandard: () => void;
  onCreateDaughter: () => void;
  onImportPlanned: () => void;
  onLoadDemo?: () => void;
};

export function PlannerPlansView({
  library,
  selectedHoleId,
  qaReport,
  onSelectHole,
  onAction,
  onCreateStandard,
  onCreateDaughter,
  onImportPlanned,
  onLoadDemo,
}: Props) {
  return (
    <div className="planner-plans-view">
      <PlannerLibraryView
        library={library}
        selectedHoleId={selectedHoleId}
        qaReport={qaReport}
        onSelect={onSelectHole}
        onAction={onAction}
        onCreateNew={onCreateStandard}
        onCreateDaughter={onCreateDaughter}
        onImportPlanned={onImportPlanned}
        onLoadDemo={onLoadDemo}
      />
    </div>
  );
}
