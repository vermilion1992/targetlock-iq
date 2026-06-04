export type TargetLockConfirmVariant = "danger" | "warning" | "default";

export type TargetLockConfirmRequest = {
  title: string;
  description: string;
  details?: string[];
  notice?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: TargetLockConfirmVariant;
};

export function confirmDeleteHole(holeName: string): TargetLockConfirmRequest {
  return {
    title: `Delete ${holeName}?`,
    description: "This hole will be removed from the library on this browser.",
    details: [
      "Surveys, targets, branch linkage, and decision history for this hole are deleted.",
      "Other saved holes in the library are not affected.",
    ],
    confirmLabel: "Delete hole",
    variant: "danger",
  };
}

export function confirmResetActiveHole(holeName: string): TargetLockConfirmRequest {
  return {
    title: `Reset ${holeName}?`,
    description: "Clear working data for the active hole and start again on this device.",
    details: [
      "Surveys, target, plan corridor, branch linkage, and decision history for this hole are cleared.",
      "Other saved holes in the library are not affected.",
    ],
    notice: "This cannot be undone. Export a hole package first if you need a backup.",
    confirmLabel: "Reset hole",
    variant: "danger",
  };
}

export function confirmResetAllLocalData(): TargetLockConfirmRequest {
  return {
    title: "Reset all local TargetLock data?",
    description:
      "Every saved hole, branch program, history entry, and setting on this browser will be removed.",
    details: [
      "A fresh sample hole will load after reset.",
      "Other tabs or users on this machine are not affected — only this browser profile.",
    ],
    notice:
      "This cannot be undone. Export a hole package first if you need a backup.",
    confirmLabel: "Reset all data",
    variant: "danger",
  };
}

export function confirmClearDecisionHistory(): TargetLockConfirmRequest {
  return {
    title: "Clear decision history?",
    description: "Remove the chronological log for this hole on this browser.",
    details: [
      "Survey data, targets, plan corridor, and branch context are not changed.",
    ],
    confirmLabel: "Clear history",
    variant: "warning",
  };
}

export function confirmResetRecoveryAssumptions(): TargetLockConfirmRequest {
  return {
    title: "Reset recovery assumptions?",
    description: "Restore site-default DLS capability ranges for this hole.",
    details: [
      "Steering feasibility wording will use default natural, parameter, motor/Navi, and DeviDrill bands.",
      "Any validation sign-off for assumptions may need to be renewed.",
    ],
    confirmLabel: "Reset to defaults",
    variant: "warning",
  };
}

export function confirmClearAssumptionsSignOff(): TargetLockConfirmRequest {
  return {
    title: "Clear assumptions sign-off?",
    description: "Remove supervisor validation for recovery capability assumptions on this hole.",
    details: ["Assumption values are not changed — only the sign-off record is cleared."],
    confirmLabel: "Clear sign-off",
    variant: "warning",
  };
}

export function confirmLoadScenario(label: string): TargetLockConfirmRequest {
  const display = label.replace(/^TEST · /, "").trim();
  return {
    title: `Load “${display}”?`,
    description:
      "Replace the active hole’s plan, surveys, target, and branch context with test data.",
    details: [
      "Synthetic scenario for training and validation on this browser.",
      "Export a hole package first if you need to keep the current hole state.",
    ],
    notice: "Not a live drilling record — validate conclusions against real surveys before field use.",
    confirmLabel: "Load scenario",
    variant: "warning",
  };
}

export function confirmImportHolePackage(fileName: string, holeCount: number): TargetLockConfirmRequest {
  return {
    title: "Import hole package?",
    description: `Replace all TargetLock holes stored on this browser with ${fileName}.`,
    details: [
      `${holeCount} hole(s) from the package will become the library.`,
      "Export a package first if you need to keep the current library.",
    ],
    confirmLabel: "Import package",
    variant: "warning",
  };
}
