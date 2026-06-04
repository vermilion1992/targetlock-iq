"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trajectory3D } from "@/components/charts/Trajectory3D";
import { TrajectoryCanvas } from "@/components/charts/TrajectoryCanvas";
import { DecisionHistoryPanel } from "@/components/dashboard/DecisionHistoryPanel";
import { HoleDetailsFields } from "@/components/dashboard/HoleDetailsFields";
import { HoleLibraryPanel } from "@/components/dashboard/HoleLibraryPanel";
import { ActionPlanPanel } from "@/components/dashboard/ActionPlanPanel";
import { BranchProgramPanel } from "@/components/dashboard/BranchProgramPanel";
import { BranchProgramSimpleStrip } from "@/components/dashboard/BranchProgramSimpleStrip";
import { SurveyImportTargetModal } from "@/components/dashboard/SurveyImportTargetModal";
import {
  CsvImportAssistantModal,
  type ImportSummary,
} from "@/components/dashboard/CsvImportAssistantModal";
import {
  listImportTargets,
  type CreateDaughterInput,
} from "@/lib/drilling/branch-program-library";
import { findHole } from "@/lib/drilling/hole-library";
import { CapabilityAssumptionsEditor } from "@/components/dashboard/CapabilityAssumptionsEditor";
import { MathReferencePanel } from "@/components/dashboard/MathReferencePanel";
import { MethodPurposePanel } from "@/components/dashboard/MethodPurposePanel";
import { QaPanel } from "@/components/dashboard/QaPanel";
import { ValidationPanel } from "@/components/dashboard/ValidationPanel";
import { PlanCorridorEditor } from "@/components/dashboard/PlanCorridorEditor";
import { SurveyToolProfilePanel } from "@/components/dashboard/SurveyToolProfilePanel";
import { ScenarioLabModal } from "@/components/dashboard/ScenarioLabModal";
import { SteeringFeasibilityPanel } from "@/components/dashboard/SteeringFeasibilityPanel";
import { SupervisorApprovalPanel } from "@/components/dashboard/SupervisorApprovalPanel";
import { InfoTip } from "@/components/layout/InfoTip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GuideCenterModal } from "@/components/pitch/GuideCenterModal";
import { GuideTour } from "@/components/pitch/GuideTour";
import { useTargetLockConfirm } from "@/components/targetlock/TargetLockConfirmProvider";
import { useGuideMode } from "@/hooks/use-guide-mode";
import { useTargetLockProject } from "@/hooks/use-targetlock-project";
import { guideFocusClass, resolveGuideTab } from "@/lib/drilling/guide-flows";
import type { AdvancedTab, GuideFlowId, GuideHighlight } from "@/lib/drilling/guide-types";
import { downloadCsvTestPack } from "@/lib/drilling/csv-test-pack";
import type { ImportKind } from "@/lib/drilling/csv-import-assistant";
import type { PlanCorridorConfig } from "@/lib/drilling/plan-corridor";
import { computeHole } from "@/lib/drilling/compute";
import { buildStations } from "@/lib/drilling/desurvey";
import { round } from "@/lib/drilling/format";
import { normalizeAngle } from "@/lib/drilling/geometry";
import {
  entryForSupervisorDecision,
  suggestedNextInterval,
  type SupervisorDecisionKind,
} from "@/lib/drilling/approval";
import { entryForSurvey } from "@/lib/drilling/history";
import { buildCorridorStatus } from "@/lib/drilling/plan-corridor";
import { buildQaFlags } from "@/lib/drilling/qa";
import { assessSurveyUncertainty } from "@/lib/drilling/survey-tool-profile";
import { findBranchScenario } from "@/lib/drilling/branch-program-scenarios";
import { findScenario } from "@/lib/drilling/test-scenarios";
import type { SyntheticHoleParams } from "@/lib/drilling/synthetic-hole-builder";
import {
  confirmClearAssumptionsSignOff,
  confirmClearDecisionHistory,
  confirmImportHolePackage,
  confirmResetActiveHole as resetActiveHoleConfirm,
  confirmResetAllLocalData as resetAllLocalDataConfirm,
  confirmResetRecoveryAssumptions,
} from "@/lib/drilling/confirm-actions";
import {
  describeDestructiveScenarioLoad,
  describeGuideDemoExitConfirm,
  describeGuideDemoRestartConfirm,
  describeImportTargetCancelConfirm,
} from "@/lib/drilling/workspace-action-contract";
import {
  buildCorrectionOptions,
  planTargetFromStations,
} from "@/lib/drilling/recommendation";
import {
  assumptionsValidationStatus,
  buildPlanSanityCheck,
} from "@/lib/drilling/validation";
import { downloadReportPdf } from "@/lib/drilling/report-pdf";
import { downloadReport } from "@/lib/drilling/report";
import { TARGETLOCK_APP_VERSION } from "@/lib/drilling/app-version";
import { downloadHolePackage, readHolePackageFile } from "@/lib/drilling/hole-package";
import {
  buildImportUndoSnapshot,
  describeImportUndo,
} from "@/lib/drilling/sidebar-import-undo";
import {
  canValidateManualSurveyInput,
  hasPlanTargetAtMd,
  sanitizePlanCorridorField,
  sanitizeTargetField,
  validateManualSurvey,
} from "@/lib/drilling/sidebar-input-validation";
import type { SurveyRecord, TargetConfig } from "@/lib/drilling/types";

const ADVANCED_TABS: { id: AdvancedTab; label: string }[] = [
  { id: "trajectory", label: "Trajectory" },
  { id: "branch-program", label: "Branch program" },
  { id: "steering", label: "Steering feasibility" },
  { id: "qaqc", label: "QA/QC" },
  { id: "decisions", label: "Decisions" },
  { id: "math", label: "Math reference" },
  { id: "method-purpose", label: "Method & Purpose" },
  { id: "validation", label: "Validation" },
  { id: "setup", label: "Setup / assumptions" },
];

export default function TargetLockApp() {
  const [guidePersistenceOff, setGuidePersistenceOff] = useState(false);
  const { confirm } = useTargetLockConfirm();

  const {
    hydrated,
    holeName,
    setHoleName,
    siteName,
    setSiteName,
    mode,
    setMode,
    planRecords,
    setPlanRecords,
    actualRecords,
    setActualRecords,
    target,
    setTarget,
    history,
    pushHistory,
    logRecommendation,
    loadSampleData,
    resetHole,
    clearHistory,
    library,
    switchHole,
    createNewHole,
    duplicateCurrentHole,
    deleteCurrentHole,
    recoveryAssumptions,
    setRecoveryAssumptions,
    resetRecoveryAssumptions,
    assumptionSignOff,
    setAssumptionSignOff,
    activeScenario,
    setActiveScenario,
    loadTestScenario,
    loadBranchScenario,
    loadSyntheticHole,
    branchProgram,
    holeId,
    holeRole,
    initBranchProgram,
    branchAddTarget,
    branchUpdateTarget,
    branchRemoveTarget,
    branchSaveDaughter,
    branchSetActiveDaughter,
    branchSetDaughterStatus,
    branchArchiveDaughter,
    branchApproveDaughter,
    importSurveysToHole,
    planCorridor,
    setPlanCorridor,
    surveyToolProfile,
    setSurveyToolProfile,
    seedPlanCorridorFromPlan,
    storageHealth,
    storageError,
    resetAllLocalData,
    initFreshSampleLibrary,
    importHolePackage,
  } = useTargetLockProject(guidePersistenceOff);

  const [advancedTab, setAdvancedTab] = useState<AdvancedTab>("steering");

  const guide = useGuideMode({
    setMode,
    setAdvancedTab,
    onActiveChange: setGuidePersistenceOff,
    onRestoreSnapshot: (snap) => {
      if (snap.library) {
        importHolePackage(snap.library);
      } else {
        setPlanRecords(snap.planRecords);
        setActualRecords(snap.actualRecords);
        setTarget(snap.target);
      }
    },
  });

  const modeFromUrlApplied = useRef(false);
  useEffect(() => {
    if (!hydrated || modeFromUrlApplied.current) return;
    const modeParam = new URLSearchParams(window.location.search).get("mode");
    if (modeParam === "advanced" || modeParam === "simple") {
      setMode(modeParam);
      modeFromUrlApplied.current = true;
    }
  }, [hydrated, setMode]);
  const [pendingImport, setPendingImport] = useState<{
    type: "plan" | "actual";
    fileName: string;
    records: SurveyRecord[];
    summary?: ImportSummary;
  } | null>(null);
  const [csvAssistant, setCsvAssistant] = useState<ImportKind | null>(null);
  const [importUndo, setImportUndo] = useState<{
    kind: ImportKind;
    previousPlan: SurveyRecord[];
    previousActual: SurveyRecord[];
    previousCorridor: PlanCorridorConfig;
  } | null>(null);

  const activeHoleMeta = useMemo(() => {
    if (!library) return null;
    return findHole(library, holeId) ?? null;
  }, [library, holeId]);

  const ph = (id: GuideHighlight) =>
    guideFocusClass(guide.currentStep.highlight, id, guide.guideActive);

  useEffect(() => {
    if (!guide.guideActive) return;
    const tab = resolveGuideTab(guide.currentStep);
    if (tab) setAdvancedTab(tab);
  }, [guide.guideActive, guide.stepIndex, guide.currentStep]);

  useEffect(() => {
    if (!guide.guideActive || !guide.currentStep.highlight) return;
    const frame = requestAnimationFrame(() => {
      document.querySelector(".guide-focus")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [guide.guideActive, guide.stepIndex, guide.currentStep.highlight]);

  const [manualMd, setManualMd] = useState("");
  const [manualDip, setManualDip] = useState("");
  const [manualAzimuth, setManualAzimuth] = useState("");
  const [manualMessage, setManualMessage] = useState(
    "Add the next survey as it comes off the camera."
  );
  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const setAppMessage = useCallback((message: string | null) => {
    setDataMessage(message);
  }, []);
  const [scenarioLabOpen, setScenarioLabOpen] = useState(false);
  const { planStations, actualStations, recommendation, steering } = useMemo(
    () =>
      computeHole(
        planRecords,
        actualRecords,
        target,
        recoveryAssumptions,
        planCorridor
      ),
    [planRecords, actualRecords, target, recoveryAssumptions, planCorridor]
  );

  const corridorStatus = useMemo(
    () =>
      buildCorridorStatus(planStations, actualStations, planCorridor, recommendation),
    [planStations, actualStations, planCorridor, recommendation]
  );

  const surveyAssessment = useMemo(
    () => assessSurveyUncertainty(recommendation, surveyToolProfile),
    [recommendation, surveyToolProfile]
  );

  const correctionOptions = useMemo(
    () => (recommendation ? buildCorrectionOptions(recommendation) : []),
    [recommendation]
  );

  const qaFlags = useMemo(
    () =>
      recommendation
        ? buildQaFlags(recommendation, actualStations, corridorStatus)
        : [],
    [recommendation, actualStations, corridorStatus]
  );

  const planSanity = useMemo(
    () => buildPlanSanityCheck(planStations, target),
    [planStations, target]
  );

  const planFinalMd = planStations[planStations.length - 1]?.md;

  const canFillFromPlan = !!recommendation;
  const canUndoSurvey = actualRecords.length > 1;
  const canUsePlanTarget = hasPlanTargetAtMd(planStations, target.md);
  const canAddSurvey = canValidateManualSurveyInput(
    manualMd,
    manualDip,
    manualAzimuth,
    actualRecords,
    target.md,
    planFinalMd
  );

  const validationStatus = useMemo(
    () => assumptionsValidationStatus(assumptionSignOff, recoveryAssumptions),
    [assumptionSignOff, recoveryAssumptions]
  );

  const signOffAssumptions = useCallback(
    (validatedBy: string) => {
      setAssumptionSignOff({
        validatedBy,
        validatedAt: new Date().toISOString(),
        assumptions: recoveryAssumptions,
      });
      pushHistory({
        type: "supervisor_decision",
        summary: `Recovery assumptions validated by ${validatedBy}`,
        actionTaken: "Validate assumptions",
      });
    },
    [recoveryAssumptions, setAssumptionSignOff, pushHistory]
  );

  const clearAssumptionsSignOff = useCallback(async () => {
    if (!(await confirm(confirmClearAssumptionsSignOff()))) return;
    setAssumptionSignOff(null);
    pushHistory({
      type: "supervisor_decision",
      summary: "Recovery assumptions sign-off cleared",
      actionTaken: "Clear validation",
    });
  }, [confirm, setAssumptionSignOff, pushHistory]);

  const applyPlanTarget = useCallback(
    (requestedMd?: number) => {
      const md = requestedMd ?? target.md;
      const fromPlan = planTargetFromStations(planStations, md);
      if (!fromPlan) return;
      setTarget((prev) => ({
        ...fromPlan,
        tolerance: Number.isFinite(fromPlan.tolerance) ? fromPlan.tolerance : prev.tolerance,
        maxDls: prev.maxDls,
        nextInterval: prev.nextInterval,
      }));
      pushHistory({
        type: "use_plan_target",
        summary: `Target set from plan at MD ${round(md, 0)} m`,
        detail: `E ${round(fromPlan.e, 1)}, N ${round(fromPlan.n, 1)}, D ${round(fromPlan.d, 1)} m`,
        md,
        actionTaken: "Use planned target",
      });
    },
    [planStations, target.md, pushHistory]
  );

  const fillNextSurveyFromAim = useCallback(() => {
    if (!recommendation) {
      setManualMessage("Load a plan and actual surveys before filling the next aim.");
      return;
    }
    const nextMd = Math.min(
      recommendation.target.md,
      recommendation.current.md + recommendation.target.nextInterval
    );
    setManualMd(String(Number(nextMd.toFixed(1))));
    setManualDip(String(Number(recommendation.aimDip.toFixed(1))));
    setManualAzimuth(String(Number(recommendation.aimAzimuth.toFixed(1))));
    setManualMessage(`Filled next aim for MD ${round(nextMd, 1)} m.`);
  }, [recommendation]);

  const loadSample = useCallback(() => {
    if (
      !window.confirm(
        `Load sample plan and surveys into ${holeName}? This replaces the active hole's current plan and survey data.`
      )
    ) {
      return;
    }
    loadSampleData(true);
    setDataMessage("Sample plan and actual surveys loaded.");
    setManualMessage("Add the next survey as it comes off the camera.");
    setImportUndo(null);
    setTimeout(fillNextSurveyFromAim, 0);
  }, [fillNextSurveyFromAim, loadSampleData, holeName]);

  useEffect(() => {
    if (hydrated && recommendation && !manualMd) {
      fillNextSurveyFromAim();
    }
  }, [hydrated, recommendation, manualMd, fillNextSurveyFromAim]);

  const handleSupervisorDecision = useCallback(
    (kind: SupervisorDecisionKind, notes: string) => {
      pushHistory(entryForSupervisorDecision(kind, recommendation, notes));
      const interval = suggestedNextInterval(target.nextInterval, kind);
      if (interval != null) {
        setTarget((prev) => ({ ...prev, nextInterval: interval }));
      }
    },
    [pushHistory, recommendation, target.nextInterval, setTarget]
  );

  const finishImport = useCallback(
    (
      targetHoleId: string,
      type: "plan" | "actual",
      records: SurveyRecord[],
      fileName: string,
      summary?: ImportSummary
    ) => {
      const label = type === "plan" ? "Planned" : "Actual";
      importSurveysToHole(targetHoleId, type, records);
      setActiveScenario(null);
      if (type === "plan") {
        if (targetHoleId === holeId) seedPlanCorridorFromPlan(records);
        const stations = buildStations(records);
        const finalPlan = stations[stations.length - 1];
        pushHistory({
          type: "data_loaded",
          summary: `Planned trajectory imported (${records.length} stations)`,
          actionTaken: `File: ${fileName}`,
        });
        if (targetHoleId === holeId && finalPlan) applyPlanTarget(finalPlan.md);
      } else {
        pushHistory({
          type: "data_loaded",
          summary: `Actual surveys imported (${records.length} stations)`,
          actionTaken: `File: ${fileName} → ${targetHoleId}`,
        });
        if (targetHoleId === holeId) {
          const { recommendation: newReco } = computeHole(planRecords, records, target);
          logRecommendation(newReco, "Import survey results");
        }
      }
      const imported = summary?.stationsImported ?? records.length;
      const skipped = summary?.skippedCount ?? 0;
      let msg = `${label} CSV loaded — ${imported} station${imported === 1 ? "" : "s"} imported`;
      if (skipped > 0) {
        msg += ` (${skipped} row${skipped === 1 ? "" : "s"} skipped)`;
      }
      setDataMessage(msg);
      setPendingImport(null);
      setCsvAssistant(null);
    },
    [
      importSurveysToHole,
      holeId,
      seedPlanCorridorFromPlan,
      pushHistory,
      applyPlanTarget,
      planRecords,
      target,
      logRecommendation,
    ]
  );

  const handleCsvAssistantImport = useCallback(
    (records: SurveyRecord[], fileName: string, summary: ImportSummary) => {
      if (!csvAssistant) return;
      const type = csvAssistant;
      setImportUndo(
        buildImportUndoSnapshot({
          kind: type,
          planRecords,
          actualRecords,
          planCorridor,
        })
      );
      const targets = library ? listImportTargets(library, holeId) : [];
      if (targets.length > 1) {
        setPendingImport({ type, fileName, records, summary });
        setCsvAssistant(null);
        return;
      }
      finishImport(targets[0]?.holeId ?? holeId, type, records, fileName, summary);
    },
    [
      csvAssistant,
      planRecords,
      actualRecords,
      planCorridor,
      library,
      holeId,
      finishImport,
    ]
  );

  const undoLastImport = useCallback(() => {
    if (!importUndo) return;
    if (!window.confirm(`${describeImportUndo(importUndo)} Continue?`)) return;
    importSurveysToHole(holeId, "plan", importUndo.previousPlan);
    importSurveysToHole(holeId, "actual", importUndo.previousActual);
    setPlanCorridor(importUndo.previousCorridor);
    const kind = importUndo.kind;
    setImportUndo(null);
    setDataMessage("Import undone — previous hole surveys restored.");
    pushHistory({
      type: "data_loaded",
      summary: `Undid ${kind === "plan" ? "plan" : "actual"} CSV import`,
      actionTaken: "Undo import",
    });
  }, [importUndo, holeId, importSurveysToHole, setPlanCorridor, pushHistory]);

  const handleClearHistory = useCallback(async () => {
    if (!(await confirm(confirmClearDecisionHistory()))) return;
    clearHistory();
    setAppMessage("Decision history cleared for this hole.");
  }, [clearHistory, confirm, setAppMessage]);

  const handleResetRecoveryAssumptions = useCallback(async () => {
    if (!(await confirm(confirmResetRecoveryAssumptions()))) return;
    resetRecoveryAssumptions();
    setAppMessage("Recovery assumptions reset to defaults.");
  }, [resetRecoveryAssumptions, confirm, setAppMessage]);

  const handleBranchSaveDaughter = useCallback(
    (input: CreateDaughterInput) => {
      const daughterHoleId = branchSaveDaughter(input);
      if (daughterHoleId) {
        setAppMessage(`Daughter ${input.daughterId.trim()} saved as draft plan.`);
      } else {
        setAppMessage(
          "Could not save daughter — check mother actual surveys, target, and kickoff MD."
        );
      }
      return daughterHoleId;
    },
    [branchSaveDaughter, setAppMessage]
  );

  const addManualSurvey = () => {
    const md = Number(manualMd);
    const dip = Number(manualDip);
    const azimuth = Number(manualAzimuth);

    const validation = validateManualSurvey({
      md,
      dip,
      azimuth,
      actualRecords,
      targetMd: target.md,
      planFinalMd: planFinalMd,
    });
    if (!validation.ok) {
      setManualMessage(validation.error ?? "Invalid survey values.");
      return;
    }

    const existingIndex = validation.replacingIndex;
    if (
      existingIndex >= 0 &&
      !window.confirm(
        `Replace the existing survey at MD ${round(md, 1)} m? The previous reading will be overwritten.`
      )
    ) {
      return;
    }

    const survey: SurveyRecord = { md, dip, azimuth: normalizeAngle(azimuth) };
    let message: string;
    let next: SurveyRecord[];
    if (existingIndex >= 0) {
      next = [...actualRecords];
      next[existingIndex] = survey;
      message = `Replaced survey at MD ${round(md, 1)} m.`;
    } else {
      next = [...actualRecords, survey];
      message = `Added survey at MD ${round(md, 1)} m.`;
    }
    next.sort((a, b) => a.md - b.md);
    setActualRecords(next);
    const eventType =
      existingIndex >= 0 ? "survey_replaced" : "survey_added";
    pushHistory(
      entryForSurvey(eventType, md, dip, normalizeAngle(azimuth), "Add survey")
    );
    const { recommendation: newReco } = computeHole(planRecords, next, target);
    logRecommendation(newReco, "Add survey");
    setManualMessage(
      validation.warning ? `${message} ${validation.warning}` : message
    );
    setTimeout(fillNextSurveyFromAim, 0);
  };

  const undoLatestSurvey = () => {
    if (actualRecords.length <= 1) {
      setManualMessage("Keep at least the collar survey in the actual path.");
      return;
    }
    const removed = actualRecords[actualRecords.length - 1];
    const next = actualRecords.slice(0, -1);
    setActualRecords(next);
    pushHistory(
      entryForSurvey(
        "survey_removed",
        removed.md,
        removed.dip,
        removed.azimuth,
        "Undo last survey"
      )
    );
    const { recommendation: newReco } = computeHole(planRecords, next, target);
    logRecommendation(newReco, "Undo last survey");
    setManualMessage(`Removed latest survey at MD ${round(removed.md, 1)} m.`);
    setTimeout(fillNextSurveyFromAim, 0);
  };

  const handleLoadTestScenario = (scenarioId: string) => {
    const scenario = findScenario(scenarioId);
    const label = scenario?.name.replace(/^TEST · /, "") ?? scenarioId;
    if (
      !window.confirm(describeDestructiveScenarioLoad(label))
    ) {
      return;
    }
    const message = loadTestScenario(scenarioId);
    setAppMessage(message);
    setManualMessage("Add the next survey as it comes off the camera.");
    fillNextSurveyFromAim();
  };

  const handleLoadBranchScenario = (scenarioId: string) => {
    const scenario = findBranchScenario(scenarioId);
    const label = scenario?.name ?? scenarioId;
    if (!window.confirm(describeDestructiveScenarioLoad(label))) {
      return;
    }
    const message = loadBranchScenario(scenarioId);
    setAppMessage(message);
    setManualMessage("Branch program loaded — review Branch program tab (Advanced).");
    setMode("advanced");
    setAdvancedTab("branch-program");
    fillNextSurveyFromAim();
  };

  const handleLoadSyntheticHole = (params: SyntheticHoleParams): string => {
    const label = params.holeName.trim() || "Custom scenario";
    if (!window.confirm(describeDestructiveScenarioLoad(label))) {
      return "Load cancelled.";
    }
    const message = loadSyntheticHole(params);
    setAppMessage(message);
    setManualMessage("Synthetic hole loaded — add surveys or review action plan.");
    fillNextSurveyFromAim();
    return message;
  };

  const handleExportReport = () => {
    if (!recommendation) return;
    pushHistory({
      type: "report_exported",
      summary: `Text handover report exported at MD ${round(recommendation.current.md, 0)} m`,
      statusLabel: recommendation.classification.label,
      md: recommendation.current.md,
      actionTaken: "Export report (TXT)",
    });
    downloadReport(recommendation, actualStations, {
      holeName,
      siteName,
      history,
      steering,
      recoveryAssumptions,
      assumptionSignOff,
      testScenarioName: activeScenario?.name ?? null,
      surveyToolProfile,
      surveyAssessment,
      corridorStatus,
    });
    setDataMessage("Text handover report downloaded.");
  };

  const handleExportPdf = async () => {
    if (!recommendation) return;
    try {
      await downloadReportPdf(recommendation, actualStations, {
        holeName,
        siteName,
        history,
        steering,
        recoveryAssumptions,
        assumptionSignOff,
        testScenarioName: activeScenario?.name ?? null,
        surveyToolProfile,
        surveyAssessment,
        corridorStatus,
      });
      pushHistory({
        type: "report_exported",
        summary: `PDF handover report exported at MD ${round(recommendation.current.md, 0)} m`,
        statusLabel: recommendation.classification.label,
        md: recommendation.current.md,
        actionTaken: "Export PDF",
      });
      setDataMessage("PDF handover report downloaded.");
    } catch {
      const err = "PDF export failed. Try the text report or refresh the page.";
      setDataMessage(err);
      setManualMessage(err);
    }
  };

  const handleResetAllLocalData = async () => {
    if (!(await confirm(resetAllLocalDataConfirm()))) return;
    resetAllLocalData();
    setDataMessage("All local TargetLock data cleared. Sample hole loaded.");
  };

  const handleExportHolePackage = () => {
    if (!library) {
      setDataMessage("No hole library to export.");
      return;
    }
    downloadHolePackage(library);
    pushHistory({
      type: "report_exported",
      summary: "Full hole package exported (JSON)",
      actionTaken: "Export hole package",
    });
    setDataMessage("Hole package downloaded — keep this file as a backup.");
  };

  const handleImportHolePackage = async (file: File) => {
    const result = await readHolePackageFile(file);
    if (!result.ok) {
      setDataMessage(result.error);
      return;
    }
    const holeCount = result.package.library.holes.length;
    if (!(await confirm(confirmImportHolePackage(file.name, holeCount)))) return;
    importHolePackage(result.package.library);
    pushHistory({
      type: "data_loaded",
      summary: `Hole package imported (${result.package.library.holes.length} holes)`,
      actionTaken: `File: ${file.name}`,
    });
    setDataMessage(
      `Imported ${result.package.library.holes.length} hole(s) from package. Active hole restored.`
    );
  };

  const handleResetActiveHole = async () => {
    if (!(await confirm(resetActiveHoleConfirm(holeName)))) return;
    resetHole();
    setDataMessage(`${holeName} reset. Load a sample or import CSVs to start again.`);
    setManualMessage("Add the next survey as it comes off the camera.");
    setImportUndo(null);
  };

  const updateTargetField = (field: keyof TargetConfig, value: number) => {
    setTarget((prev) => ({
      ...prev,
      [field]: sanitizeTargetField(field, value, prev),
    }));
  };

  const handleSwitchHole = (id: string) => {
    const prev = holeName;
    const hole = library ? findHole(library, id) : null;
    switchHole(id);
    setDataMessage(hole ? `Switched to ${hole.holeName}.` : "Hole switched.");
    setImportUndo(null);
    if (hole && hole.holeName !== prev) {
      pushHistory({
        type: "data_loaded",
        summary: `Active hole switched to ${hole.holeName}`,
        actionTaken: "Select saved hole",
      });
    }
  };

  const handleNewSampleHole = () => {
    createNewHole(true);
    setDataMessage("New test hole created with sample plan and surveys.");
    setImportUndo(null);
    pushHistory({
      type: "data_loaded",
      summary: "New test hole created",
      actionTaken: "New test hole",
    });
  };

  const handleNewBlankHole = () => {
    createNewHole(false);
    setDataMessage("New blank hole created.");
    setImportUndo(null);
    pushHistory({
      type: "data_loaded",
      summary: "New blank hole created",
      actionTaken: "New blank hole",
    });
  };

  const handleDuplicateHole = () => {
    duplicateCurrentHole();
    setDataMessage(`Duplicated ${holeName}.`);
    setImportUndo(null);
    pushHistory({
      type: "data_loaded",
      summary: `Duplicated ${holeName}`,
      actionTaken: "Duplicate hole",
    });
  };

  const handleDeleteHole = useCallback(() => {
    const ok = deleteCurrentHole();
    if (ok) {
      setDataMessage("Hole deleted.");
      setImportUndo(null);
      pushHistory({
        type: "data_loaded",
        summary: "Hole removed from library",
        actionTaken: "Delete hole",
      });
    }
    return ok;
  }, [deleteCurrentHole, pushHistory, setDataMessage]);

  const buildGuideSnapshot = () => ({
    planRecords,
    actualRecords,
    target,
    mode,
    advancedTab,
    history,
    library: library ? structuredClone(library) : null,
  });

  const startSelectedGuide = () => {
    const flow = guide.pendingFlowId ?? guide.flowId;
    if (!flow) return;
    guide.startGuide(flow, buildGuideSnapshot());
  };

  const handleExitGuide = () => {
    if (guide.demoLoaded && !window.confirm(describeGuideDemoExitConfirm())) {
      return;
    }
    guide.exitGuide();
  };

  const handleRestartGuide = () => {
    if (guide.demoLoaded && !window.confirm(describeGuideDemoRestartConfirm())) {
      return;
    }
    guide.restartGuide();
  };

  const handleLoadGuideDemo = () => {
    const action = guide.currentStep.demoAction;
    if (!action) return;
    const ok = window.confirm(
      "Load a demo scenario for this guide step? Your current data will be restored when you exit or restart the guide."
    );
    if (!ok) return;
    if (action.kind === "builtin-scenario") {
      const message = loadTestScenario(action.scenarioId);
      setAppMessage(message);
    } else {
      const message = loadBranchScenario(action.scenarioId);
      setAppMessage(message);
      setMode("advanced");
      setAdvancedTab("branch-program");
    }
    guide.setDemoLoaded(true);
    fillNextSurveyFromAim();
  };

  if (!hydrated) {
    return (
      <div className="targetlock-app flex min-h-screen items-center justify-center">
        <div className="targetlock-loading" role="status" aria-live="polite">
          <span className="targetlock-spinner" aria-hidden />
          <p className="m-0 text-sm font-medium">Loading hole package…</p>
        </div>
      </div>
    );
  }

  if (storageHealth === "corrupt") {
    return (
      <div className="targetlock-app flex min-h-screen items-center justify-center p-6">
        <div className="targetlock-panel max-w-lg w-full" role="alert">
          <h1 className="text-lg font-semibold m-0">Stored data could not be loaded</h1>
          <p className="targetlock-helper mt-2">
            Browser storage for TargetLock appears damaged or incompatible. The app will not
            overwrite it automatically. Load the sample hole to start fresh, reset all local data,
            or import a previously exported hole package.
          </p>
          {storageError ? (
            <p className="targetlock-error-detail text-xs text-[var(--tl-muted)] mt-2 font-mono break-words">
              {storageError}
            </p>
          ) : null}
          <div className="targetlock-btn-row mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="targetlock-btn targetlock-btn-primary"
              onClick={() => {
                initFreshSampleLibrary();
              }}
            >
              Load sample hole
            </button>
            <button
              type="button"
              className="targetlock-btn targetlock-btn-sm targetlock-btn-danger"
              onClick={() => void handleResetAllLocalData()}
            >
              Reset all local TargetLock data
            </button>
            <label className="targetlock-btn targetlock-btn cursor-pointer">
              Import hole package
              <input
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportHolePackage(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <p className="targetlock-version-tag mt-4 mb-0">{TARGETLOCK_APP_VERSION}</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={280}>
      <div
        className={`targetlock-app targetlock-mode-${mode}${guide.guideActive ? " pitch-active" : ""}`}
        data-mode={mode}
      >
      {guide.guideActive && (
        <div className="guide-active-banner pitch-active-banner" role="status">
          {guide.demoLoaded
            ? "Guide active — demo scenario loaded (restore on exit)"
            : "Guide active — your hole data is unchanged"}
        </div>
      )}
      <GuideCenterModal
        open={guide.centerOpen}
        guideActive={guide.guideActive}
        selectedFlowId={guide.pendingFlowId ?? guide.flowId}
        onSelectFlow={(id: GuideFlowId) => guide.setPendingFlowId(id)}
        tourStep={guide.stepIndex}
        tourStepCount={guide.stepCount}
        flowTitle={guide.flowMeta?.title}
        onClose={() => guide.setCenterOpen(false)}
        onStartGuide={startSelectedGuide}
        onRestartGuide={handleRestartGuide}
        onExitGuide={handleExitGuide}
      />
      <ScenarioLabModal
        open={scenarioLabOpen}
        onClose={() => setScenarioLabOpen(false)}
        onLoadScenario={handleLoadTestScenario}
        onLoadBranchScenario={handleLoadBranchScenario}
        onGenerateScenario={handleLoadSyntheticHole}
      />
      <GuideTour
        active={guide.guideActive}
        step={guide.currentStep}
        stepIndex={guide.stepIndex}
        stepCount={guide.stepCount}
        flowTitle={guide.flowMeta?.title}
        onPrev={guide.prevStep}
        onNext={guide.nextStep}
        onExit={handleExitGuide}
        onRestart={handleRestartGuide}
        onOpenGuideCenter={() => guide.setCenterOpen(true)}
        onOpenTab={guide.openTabForCurrentStep}
        onLoadDemo={guide.currentStep.demoAction ? handleLoadGuideDemo : undefined}
      />
      <div className="targetlock-shell">
        <aside className="targetlock-sidebar">
          <div className="targetlock-brand-block">
            <img
              src="/images/targetlock/targetlocklogonew.png"
              alt="TargetLock IQ"
              className="targetlock-brand-logo"
              width={1536}
              height={1024}
              decoding="async"
            />
            <p className="targetlock-version-tag m-0 mt-2">{TARGETLOCK_APP_VERSION}</p>
          </div>

          <div className={`targetlock-project-meta advanced-only ${ph("hole-details")}`}>
            <h2 className="targetlock-sidebar-section-title">Hole details</h2>
            <HoleDetailsFields
              activeHoleId={library?.activeHoleId ?? holeId}
              holeName={holeName}
              siteName={siteName}
              onHoleNameChange={setHoleName}
              onSiteNameChange={setSiteName}
            />
          </div>

          {library ? (
            <HoleLibraryPanel
              holes={library.holes}
              activeHoleId={library.activeHoleId}
              canDelete={library.holes.length > 1}
              onSwitch={handleSwitchHole}
              onNewSample={handleNewSampleHole}
              onNewBlank={handleNewBlankHole}
              onDuplicate={handleDuplicateHole}
              onDelete={handleDeleteHole}
            />
          ) : null}

          <div className="targetlock-sidebar-setup">
          <section className="targetlock-panel targetlock-sidebar-setup-panel">
            <h2>
              Hole data{" "}
              <InfoTip tip="Upload planned trajectory and downhole survey files. CSV is a stand-in for survey-tool or HUB-IQ imports." />
            </h2>
            <div className="targetlock-stack">
              <div className="targetlock-csv-upload-grid">
                <div className={`targetlock-csv-upload-row ${ph("hole-plan-upload")}`}>
                  <div className="targetlock-csv-upload-label">
                    <span>Hole plan</span>
                    <InfoTip tip="Planned trajectory, target and tolerance data." />
                  </div>
                  <button
                    type="button"
                    className="targetlock-btn targetlock-btn-primary"
                    onClick={() => setCsvAssistant("plan")}
                    aria-label="Upload hole plan CSV"
                  >
                    Upload
                  </button>
                </div>
                <div className={`targetlock-csv-upload-row ${ph("survey-upload")}`}>
                  <div className="targetlock-csv-upload-label">
                    <span>Survey results</span>
                    <InfoTip tip="Downhole survey readings from camera/gyro." />
                  </div>
                  <button
                    type="button"
                    className="targetlock-btn targetlock-btn-primary"
                    onClick={() => setCsvAssistant("actual")}
                    aria-label="Upload survey results CSV"
                  >
                    Upload
                  </button>
                </div>
              </div>
              <div className="targetlock-sidebar-util-actions">
                <button
                  type="button"
                  className="targetlock-btn targetlock-btn-sm"
                  onClick={() => downloadCsvTestPack()}
                >
                  Download CSV test pack
                </button>
                <button
                  type="button"
                  className="targetlock-btn targetlock-btn-sm targetlock-btn-danger"
                  onClick={() => void handleResetAllLocalData()}
                  title="Remove all holes and branch programs from this browser. Export a hole package first if you need a backup."
                  aria-label="Reset all local TargetLock data"
                >
                  Reset all local data
                </button>
              </div>
              <details className="targetlock-csv-format-help">
                <summary>CSV format help</summary>
                <p className="targetlock-csv-format-help-lead">
                  Use the import assistant for templates, preview, and validation. Each file needs
                  depth (MD), dip, and azimuth in metres and degrees.
                </p>
                <ul className="targetlock-csv-format-help-links">
                  <li>
                    <a href="/templates/targetlock-plan-template.csv" download>
                      TargetLock plan template
                    </a>
                  </li>
                  <li>
                    <a href="/templates/targetlock-survey-template.csv" download>
                      TargetLock survey template
                    </a>
                  </li>
                  <li>
                    <a href="/templates/hub-iq-planned-example.csv" download>
                      HUB-IQ plan example (extended)
                    </a>
                  </li>
                  <li>
                    <a href="/templates/hub-iq-actual-example.csv" download>
                      HUB-IQ survey example (extended)
                    </a>
                  </li>
                </ul>
              </details>
              <div className={`targetlock-btn-row targetlock-btn-row--hole-actions ${ph("export")}`}>
                <button
                  type="button"
                  className="targetlock-btn"
                  onClick={loadSample}
                  title="Load demo plan and surveys into the active hole (replaces current data)"
                >
                  Load sample hole
                </button>
                <button
                  type="button"
                  className="targetlock-btn"
                  onClick={handleExportReport}
                  disabled={!recommendation}
                  title={
                    recommendation
                      ? "Download a plain-text shift handover report"
                      : "Load plan and actual surveys to enable export"
                  }
                >
                  Export TXT
                </button>
                <button
                  type="button"
                  className="targetlock-btn"
                  onClick={() => void handleExportPdf()}
                  disabled={!recommendation}
                  title={
                    recommendation
                      ? "Download a formatted PDF handover report"
                      : "Load plan and actual surveys to enable export"
                  }
                >
                  Export PDF
                </button>
                <button
                  type="button"
                  className="targetlock-btn targetlock-btn-danger"
                  onClick={() => void handleResetActiveHole()}
                  title="Clear surveys, target, corridor, and history for this hole only; other saved holes unchanged"
                  aria-label="Reset active hole"
                >
                  Reset active hole
                </button>
              </div>
              {dataMessage ? (
                <div className="csv-import-undo-row" role="status" aria-live="polite">
                  <p className="targetlock-helper m-0">{dataMessage}</p>
                  {importUndo ? (
                    <button
                      type="button"
                      className="targetlock-btn targetlock-btn-sm"
                      onClick={undoLastImport}
                      title={describeImportUndo(importUndo)}
                      aria-label={describeImportUndo(importUndo)}
                    >
                      Undo import
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          <section className={`targetlock-panel targetlock-sidebar-setup-panel ${ph("manual-survey")}`}>
            <h2>
              Add survey{" "}
              <InfoTip tip="Enter the next survey from the camera. Fill from action plan copies dip and azimuth from the current recommendation." />
            </h2>
            <div className="targetlock-form-grid">
              <label>
                <span>MD</span>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  value={manualMd}
                  onChange={(e) => setManualMd(e.target.value)}
                  aria-label="Survey measured depth in metres"
                />
              </label>
              <label>
                <span>Dip</span>
                <input
                  type="number"
                  step={0.1}
                  min={-90}
                  max={90}
                  value={manualDip}
                  onChange={(e) => setManualDip(e.target.value)}
                  aria-label="Survey dip in degrees"
                />
              </label>
              <label className="col-span-2">
                <span>Azimuth</span>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={360}
                  value={manualAzimuth}
                  onChange={(e) => setManualAzimuth(e.target.value)}
                  aria-label="Survey azimuth in degrees"
                />
              </label>
            </div>
            <div className="targetlock-btn-row">
              <button
                type="button"
                className={`targetlock-btn ${ph("fill-from-action-plan")}`}
                onClick={fillNextSurveyFromAim}
                disabled={!canFillFromPlan}
                title={
                  canFillFromPlan
                    ? "Copy next MD and aim dip/azimuth from the action plan"
                    : "Load a plan and actual surveys before filling from the action plan"
                }
              >
                Fill from action plan
              </button>
              <button
                type="button"
                className="targetlock-btn targetlock-btn-primary"
                onClick={addManualSurvey}
                disabled={!canAddSurvey}
                title={
                  canAddSurvey
                    ? "Add or replace a survey at this measured depth"
                    : "Enter valid MD, dip, and azimuth before adding"
                }
              >
                Add survey
              </button>
              <button
                type="button"
                className="targetlock-btn"
                onClick={undoLatestSurvey}
                disabled={!canUndoSurvey}
                title={
                  canUndoSurvey
                    ? "Remove the latest actual survey"
                    : "Keep at least the collar survey in the actual path"
                }
              >
                Undo last survey
              </button>
            </div>
            <p className="targetlock-helper" role="status" aria-live="polite">
              {manualMessage}
            </p>
          </section>
          </div>

          <section className="targetlock-panel targetlock-sidebar-advanced-panel advanced-only">
            <h2>
              Target setup{" "}
              <InfoTip tip="Target is an offset from the collar in this demo. Positive down means deeper below collar." />
            </h2>
            <div className="targetlock-form-grid">
              <label>
                <span>
                  Target MD{" "}
                  <InfoTip tip="Measured depth (MD) where the planned target should be reached." />
                </span>
                <input
                  type="number"
                  value={target.md}
                  step={1}
                  onChange={(e) => updateTargetField("md", Number(e.target.value))}
                />
              </label>
              <label>
                <span>East</span>
                <input
                  type="number"
                  value={target.e}
                  step={0.1}
                  onChange={(e) => updateTargetField("e", Number(e.target.value))}
                />
              </label>
              <label>
                <span>North</span>
                <input
                  type="number"
                  value={target.n}
                  step={0.1}
                  onChange={(e) => updateTargetField("n", Number(e.target.value))}
                />
              </label>
              <label>
                <span>Down</span>
                <input
                  type="number"
                  value={target.d}
                  step={0.1}
                  onChange={(e) => updateTargetField("d", Number(e.target.value))}
                />
              </label>
              <label>
                <span>
                  Tolerance m{" "}
                  <InfoTip tip="Allowed 3D distance from target before the hole is outside the target envelope." />
                </span>
                <input
                  type="number"
                  value={target.tolerance}
                  step={0.1}
                  min={0.1}
                  onChange={(e) => updateTargetField("tolerance", Number(e.target.value))}
                />
              </label>
              <label>
                <span>
                  Max DLS{" "}
                  <InfoTip tip="Maximum dogleg severity (DLS) allowed for the correction, in degrees per 30 m." />
                </span>
                <input
                  type="number"
                  value={target.maxDls}
                  step={0.1}
                  min={0.1}
                  onChange={(e) => updateTargetField("maxDls", Number(e.target.value))}
                />
              </label>
              <label className="col-span-2">
                <span>
                  Next interval{" "}
                  <InfoTip tip="Metres to drill before the next survey or review. Shorten when the hole is drifting." />
                </span>
                <input
                  type="number"
                  value={target.nextInterval}
                  step={1}
                  min={1}
                  onChange={(e) => updateTargetField("nextInterval", Number(e.target.value))}
                />
              </label>
            </div>
            <button
              type="button"
              className="targetlock-btn"
              onClick={() => applyPlanTarget()}
              disabled={!canUsePlanTarget}
              title={
                canUsePlanTarget
                  ? "Set target E/N/D from the planned trajectory at target MD"
                  : "Import a hole plan with a station at the target MD first"
              }
            >
              Use planned target
            </button>
            <div className={ph("plan-corridor")}>
              <PlanCorridorEditor
                corridor={planCorridor}
                status={corridorStatus}
                onChange={setPlanCorridor}
                sanitizeField={sanitizePlanCorridorField}
              />
            </div>
          </section>
        </aside>

        <main className="targetlock-workspace">
          <header className="targetlock-topbar">
            <div>
              <p className="targetlock-topbar-eyebrow">Rig dashboard · {holeName}</p>
              <h2>Survey-to-decision view</h2>
            </div>
            <div className="targetlock-topbar-actions">
              <button
                type="button"
                className={`guide-topbar-btn pitch-topbar-btn${guide.guideActive ? " guide-topbar-btn--active" : ""}`}
                onClick={() => {
                  if (!guide.pendingFlowId && !guide.flowId) {
                    guide.setPendingFlowId("standard");
                  }
                  guide.setCenterOpen(true);
                }}
                aria-expanded={guide.centerOpen}
              >
                {guide.guideActive && guide.flowMeta
                  ? `Guide · ${guide.flowMeta.title} · ${guide.stepIndex + 1}/${guide.stepCount}`
                  : "Guide"}
              </button>
              <button
                type="button"
                className={`scenario-lab-topbar-btn pitch-topbar-btn ${ph("scenario-lab")}`}
                data-guide-target="scenario-lab"
                onClick={() => setScenarioLabOpen(true)}
                aria-expanded={scenarioLabOpen}
              >
                Scenario lab
              </button>
              <div
                className={`targetlock-mode-switch ${ph("mode-toggle")}`}
                role="tablist"
                aria-label="Display mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "simple"}
                  className={`targetlock-mode-button ${mode === "simple" ? "active" : ""}`}
                  onClick={() => setMode("simple")}
                >
                  Simple
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "advanced"}
                  className={`targetlock-mode-button ${mode === "advanced" ? "active" : ""}`}
                  onClick={() => setMode("advanced")}
                >
                  Advanced
                </button>
              </div>
              {activeScenario ? (
                <span
                  className="targetlock-scenario-badge"
                  title={activeScenario.name}
                >
                  Simulated
                </span>
              ) : null}
              <div
                className={`targetlock-status-badge ${ph("status")} ${
                  recommendation ? recommendation.classification.className : ""
                }`}
                role="status"
                aria-live="polite"
                aria-label={
                  recommendation
                    ? `Hole status: ${recommendation.classification.label}`
                    : "Hole status: no data"
                }
              >
                {recommendation ? recommendation.classification.label : "No data"}
              </div>
            </div>
          </header>

          {dataMessage ? (
            <p
              className="targetlock-workspace-status"
              role="status"
              aria-live="polite"
            >
              {dataMessage}
            </p>
          ) : null}

          <section className={`targetlock-kpi-grid ${ph("kpis")} ${ph("miss-vector")}`}>
            <article className="targetlock-metric">
              <span>
                {recommendation ? "Latest survey" : "Survey"}{" "}
                <InfoTip
                  tip={
                    recommendation
                      ? "Measured depth of the most recent actual survey in the hole."
                      : "Load or enter surveys to show the latest survey depth here."
                  }
                />
              </span>
              <strong>{recommendation ? `${round(recommendation.current.md, 0)} m` : "--"}</strong>
            </article>
            <article className="targetlock-metric">
              <span>
                Actual dip / azi{" "}
                <InfoTip tip="Latest measured hole direction. Dip is negative downward; azimuth is clockwise from north." />
              </span>
              <strong>
                {recommendation
                  ? `${round(recommendation.current.dip, 1)} / ${round(recommendation.current.azimuth, 1)}`
                  : "--"}
              </strong>
            </article>
            <article className="targetlock-metric">
              <span>
                Offset from plan{" "}
                <InfoTip tip="3D distance between the actual hole and the planned trajectory at the latest survey depth." />
              </span>
              <strong>
                {recommendation ? `${round(recommendation.planOffset, 1)} m` : "--"}
              </strong>
            </article>
            <article
              className={`targetlock-metric ${
                recommendation ? `metric-${recommendation.classification.className}` : ""
              } ${ph("projected-miss")}`}
            >
              <span>
                Projected miss{" "}
                <InfoTip tip="Estimated 3D miss at target depth if the hole continues on the current direction without correction." />
              </span>
              <strong>{recommendation ? `${round(recommendation.miss, 1)} m` : "--"}</strong>
            </article>
          </section>

          {branchProgram ? (
            <BranchProgramSimpleStrip
              program={branchProgram}
              actualRecords={actualRecords}
              recommendation={recommendation}
              holeRole={holeRole}
              holeName={holeName}
              activeHoleId={holeId}
              parentHoleName={activeHoleMeta?.parentHoleName}
              kickoffMd={activeHoleMeta?.kickoffMd}
              branchTargetId={activeHoleMeta?.branchTargetId}
            />
          ) : null}

          <div
            className={`${ph("action-plan")} ${ph("recommendation")} ${ph("recovery-guidance")}`}
          >
            <ActionPlanPanel
              recommendation={recommendation}
              steering={steering}
              corridorStatus={corridorStatus}
              surveyAssessment={surveyAssessment}
            />
          </div>

          {/* Basic trajectory — Simple mode only (Advanced shows full set in Trajectory tab) */}
          <section className={`targetlock-charts-band targetlock-charts-band--basic simple-only ${ph("charts")}`}>
            <article className="targetlock-panel targetlock-chart-panel">
              <div className="targetlock-panel-title">
                <h2>Plan view</h2>
                <span className="targetlock-legend text-xs text-[var(--tl-muted)]">
                  <i className="plan-line" />
                  Plan <i className="actual-line" />
                  Actual
                </span>
              </div>
              <TrajectoryCanvas
                kind="plan"
                planStations={planStations}
                actualStations={actualStations}
                recommendation={recommendation}
                className="chart-canvas-wrap"
                corridorStatus={corridorStatus}
              />
            </article>
            <article className="targetlock-panel targetlock-chart-panel">
              <div className="targetlock-panel-title">
                <h2>Vertical section</h2>
                <span className="targetlock-legend text-xs text-[var(--tl-muted)]">
                  <i className="targetlock-legend plan-line" style={{ background: "#b42318", width: 8, height: 8, borderRadius: "50%" }} />
                  Target
                </span>
              </div>
              <TrajectoryCanvas
                kind="section"
                planStations={planStations}
                actualStations={actualStations}
                recommendation={recommendation}
                className="chart-canvas-wrap"
                corridorStatus={corridorStatus}
              />
            </article>
          </section>

          {/* Advanced mode — grouped tabs (Why is that the answer?) */}
          <section className="targetlock-advanced advanced-only" aria-label="Advanced detail">
            <div className="targetlock-tabs" role="tablist" aria-label="Advanced sections">
              {ADVANCED_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={advancedTab === tab.id}
                  className={`targetlock-tab ${advancedTab === tab.id ? "active" : ""}`}
                  onClick={() => setAdvancedTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {advancedTab === "trajectory" ? (
              <div className="targetlock-tabpanel" role="tabpanel">
                <section className={`targetlock-charts-band ${ph("charts")}`}>
                  <article className="targetlock-panel targetlock-chart-panel">
                    <div className="targetlock-panel-title">
                      <h2>Plan view</h2>
                      <span className="targetlock-legend text-xs text-[var(--tl-muted)]">
                        <i className="plan-line" />
                        Plan <i className="actual-line" />
                        Actual
                      </span>
                    </div>
                    <TrajectoryCanvas
                      kind="plan"
                      planStations={planStations}
                      actualStations={actualStations}
                      recommendation={recommendation}
                      className="chart-canvas-wrap"
                      corridorStatus={corridorStatus}
                    />
                  </article>
                  <article className="targetlock-panel targetlock-chart-panel">
                    <div className="targetlock-panel-title">
                      <h2>Vertical section</h2>
                      <span className="targetlock-legend text-xs text-[var(--tl-muted)]">
                        <i className="targetlock-legend plan-line" style={{ background: "#b42318", width: 8, height: 8, borderRadius: "50%" }} />
                        Target
                      </span>
                    </div>
                    <TrajectoryCanvas
                      kind="section"
                      planStations={planStations}
                      actualStations={actualStations}
                      recommendation={recommendation}
                      className="chart-canvas-wrap"
                      corridorStatus={corridorStatus}
                    />
                  </article>
                  <article className="targetlock-panel targetlock-chart-panel targetlock-chart-3d-panel">
                    <div className="targetlock-panel-title">
                      <h2>
                        3D trajectory{" "}
                        <InfoTip tip="Plan and actual paths in east, north, and down. Use zoom buttons, scroll wheel, or drag to explore." />
                      </h2>
                      <span className="targetlock-legend text-xs text-[var(--tl-muted)]">
                        <i className="plan-line" />
                        Plan <i className="actual-line" />
                        Actual
                      </span>
                    </div>
                    <Trajectory3D
                      planStations={planStations}
                      actualStations={actualStations}
                      recommendation={recommendation}
                      corridorStatus={corridorStatus}
                    />
                  </article>
                  <article className="targetlock-panel targetlock-chart-panel targetlock-chart-deviation-panel">
                    <div className="targetlock-panel-title">
                      <h2>
                        Deviation from plan{" "}
                        <InfoTip tip="3D offset from the planned path at each survey MD. The dashed line is target tolerance." />
                      </h2>
                      <span className="targetlock-mini-tag">
                        {actualStations.length
                          ? `${actualStations.length} actual surveys`
                          : "--"}
                      </span>
                    </div>
                    <TrajectoryCanvas
                      kind="deviation"
                      planStations={planStations}
                      actualStations={actualStations}
                      recommendation={recommendation}
                      className="chart-canvas-wrap"
                      corridorStatus={corridorStatus}
                    />
                  </article>
                </section>

                <section className="targetlock-panel targetlock-surveys-panel">
                  <div className="targetlock-panel-title">
                    <h2>
                      Actual surveys{" "}
                      <InfoTip tip="Desurveyed actual path using minimum curvature." />
                    </h2>
                    <span className="targetlock-mini-tag">
                      {recommendation
                        ? `Latest survey ${round(recommendation.current.md, 0)} m`
                        : "--"}
                    </span>
                  </div>
                  <div className="targetlock-table-wrap targetlock-table-wrap--surveys">
                    <table>
                      <thead>
                        <tr>
                          <th>MD</th>
                          <th>Dip</th>
                          <th>Azimuth</th>
                          <th>East</th>
                          <th>North</th>
                          <th>Down</th>
                          <th>DLS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {actualStations.map((station) => (
                          <tr key={station.md}>
                            <td>{round(station.md, 0)}</td>
                            <td>{round(station.dip, 1)}</td>
                            <td>{round(station.azimuth, 1)}</td>
                            <td>{round(station.e, 1)}</td>
                            <td>{round(station.n, 1)}</td>
                            <td>{round(station.d, 1)}</td>
                            <td>{round(station.dls, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            ) : null}

            {advancedTab === "branch-program" && branchProgram ? (
              <div className={`targetlock-tabpanel ${ph("branch-program")}`} role="tabpanel">
                <BranchProgramPanel
                  program={branchProgram}
                  guideSectionClass={ph}
                  planStations={planStations}
                  actualStations={actualStations}
                  recommendation={recommendation}
                  holeRole={holeRole}
                  activeHoleId={holeId}
                  recoveryAssumptions={recoveryAssumptions}
                  onInitProgram={holeRole === "mother" ? initBranchProgram : undefined}
                  onAddTarget={branchAddTarget}
                  onUpdateTarget={branchUpdateTarget}
                  onRemoveTarget={branchRemoveTarget}
                  onSaveDaughter={handleBranchSaveDaughter}
                  onSetActiveDaughter={branchSetActiveDaughter}
                  onArchiveDaughter={branchArchiveDaughter}
                  onStatusChange={branchSetDaughterStatus}
                  onApprove={branchApproveDaughter}
                />
              </div>
            ) : null}

            {advancedTab === "branch-program" && !branchProgram ? (
              <div className={`targetlock-tabpanel ${ph("branch-program")}`} role="tabpanel">
                <article className="targetlock-panel">
                  <div className="targetlock-panel-title">
                    <h2>Branch program</h2>
                  </div>
                  <p className="targetlock-panel-copy">
                    Start a branch program on the active mother hole, or load a preset from{" "}
                    <strong>Scenario lab → Branch programs</strong>.
                  </p>
                  {holeRole === "mother" ? (
                    <button
                      type="button"
                      className="targetlock-btn targetlock-btn-primary"
                      onClick={initBranchProgram}
                    >
                      Start branch program
                    </button>
                  ) : (
                    <p className="branch-program-muted">
                      Switch to a mother hole or load a branch scenario to begin.
                    </p>
                  )}
                </article>
              </div>
            ) : null}

            {advancedTab === "steering" ? (
              <div className={`targetlock-tabpanel ${ph("steering-panel")}`} role="tabpanel">
                {steering ? (
                  <SteeringFeasibilityPanel
                    steering={steering}
                    corridorStatus={corridorStatus}
                  />
                ) : (
                  <article className="targetlock-panel">
                    <p className="targetlock-helper">
                      Load plan and actual surveys to assess steering feasibility.
                    </p>
                  </article>
                )}

                <article className="targetlock-panel targetlock-correction-panel">
                  <div className="targetlock-panel-title">
                    <h2>
                      Correction options{" "}
                      <InfoTip tip="How much of the required turn can be achieved over different drilling intervals." />
                    </h2>
                    <span className="targetlock-mini-tag">
                      {correctionOptions.length ? `${correctionOptions.length} options` : "--"}
                    </span>
                  </div>
                  <div className="targetlock-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Interval</th>
                          <th>Aim dip</th>
                          <th>Aim azi</th>
                          <th>Turn</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {correctionOptions.map((option) => (
                          <tr key={option.interval}>
                            <td>{option.label}</td>
                            <td>{round(option.aimDip, 1)}°</td>
                            <td>{round(option.aimAzimuth, 1)}°</td>
                            <td>
                              {round(option.turn, 1)}° / {round(option.dls, 2)}°/30 m
                            </td>
                            <td
                              className={
                                option.status === "Can point at target"
                                  ? "status-ok"
                                  : "status-watch"
                              }
                            >
                              {option.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              </div>
            ) : null}

            {advancedTab === "qaqc" ? (
              <div className={`targetlock-tabpanel ${ph("qa-panel")}`} role="tabpanel">
                <QaPanel flags={qaFlags} />
              </div>
            ) : null}

            {advancedTab === "decisions" ? (
              <div className="targetlock-tabpanel" role="tabpanel">
                <SupervisorApprovalPanel
                  recommendation={recommendation}
                  onDecision={handleSupervisorDecision}
                />
                <div className={ph("history")}>
                  <DecisionHistoryPanel entries={history} onClear={handleClearHistory} />
                </div>
              </div>
            ) : null}

            {advancedTab === "math" ? (
              <div className={`targetlock-tabpanel ${ph("math-panel")}`} role="tabpanel">
                <MathReferencePanel recommendation={recommendation} steering={steering} />
              </div>
            ) : null}

            {advancedTab === "method-purpose" ? (
              <div className="targetlock-tabpanel" role="tabpanel">
                <MethodPurposePanel />
              </div>
            ) : null}

            {advancedTab === "validation" ? (
              <div className={`targetlock-tabpanel ${ph("validation-panel")}`} role="tabpanel">
                <ValidationPanel
                  sanity={planSanity}
                  planStations={planStations}
                  actualStations={actualStations}
                  status={validationStatus}
                  signOff={assumptionSignOff}
                  onSignOff={signOffAssumptions}
                  onClearSignOff={clearAssumptionsSignOff}
                />
              </div>
            ) : null}

            {advancedTab === "setup" ? (
              <div className={`targetlock-tabpanel ${ph("setup-panel")}`} role="tabpanel">
                <article className={`targetlock-panel ${ph("hole-package")}`}>
                  <div className="targetlock-panel-title">
                    <h2>
                      Hole package backup{" "}
                      <InfoTip tip="JSON backup of all holes, branch programs, and settings on this browser. Import replaces local data — export before reset or shared-machine use." />
                    </h2>
                  </div>
                  <p className="targetlock-helper">
                    Export the full multi-hole library (branch programs, daughters, approvals,
                    assumptions) as JSON. Import restores everything on this browser — decision
                    support only; validate before field use.
                  </p>
                  <div className="targetlock-btn-row">
                    <button
                      type="button"
                      className="targetlock-btn targetlock-btn-primary"
                      onClick={handleExportHolePackage}
                      disabled={!library}
                    >
                      Export full hole package
                    </button>
                    <label className="targetlock-btn targetlock-btn cursor-pointer">
                      Import hole package
                      <input
                        type="file"
                        accept=".json,application/json"
                        className="sr-only"
                        aria-label="Import hole package JSON"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleImportHolePackage(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </article>
                <CapabilityAssumptionsEditor
                  assumptions={recoveryAssumptions}
                  onChange={setRecoveryAssumptions}
                  onReset={handleResetRecoveryAssumptions}
                  validationStatus={validationStatus}
                />
                <div className={ph("survey-tool-profile")}>
                  <SurveyToolProfilePanel
                    profile={surveyToolProfile}
                    assessment={surveyAssessment}
                    onChange={setSurveyToolProfile}
                  />
                </div>
              </div>
            ) : null}
          </section>
        </main>
      </div>

      {csvAssistant ? (
        <CsvImportAssistantModal
          open
          importKind={csvAssistant}
          activeHoleId={holeId}
          activeHoleName={holeName}
          existingPlanRecords={planRecords}
          existingActualRecords={actualRecords}
          onClose={() => setCsvAssistant(null)}
          onImport={handleCsvAssistantImport}
        />
      ) : null}

      {library && pendingImport ? (
      <SurveyImportTargetModal
        open
        library={library}
        activeHoleId={holeId}
        importType={pendingImport?.type ?? "actual"}
        fileName={pendingImport?.fileName ?? ""}
        onSelect={(targetHoleId) => {
          if (!pendingImport) return;
          finishImport(
            targetHoleId,
            pendingImport.type,
            pendingImport.records,
            pendingImport.fileName,
            pendingImport.summary
          );
        }}
        onCancel={() => {
          if (importUndo && !window.confirm(describeImportTargetCancelConfirm())) {
            return;
          }
          setPendingImport(null);
          setImportUndo(null);
          setAppMessage("Import cancelled — no survey data changed.");
        }}
      />
      ) : null}
      </div>
    </TooltipProvider>
  );
}
