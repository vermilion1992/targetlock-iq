"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trajectory3D } from "@/components/charts/Trajectory3D";
import { TrajectoryCanvas } from "@/components/charts/TrajectoryCanvas";
import { DecisionHistoryPanel } from "@/components/dashboard/DecisionHistoryPanel";
import { HoleLibraryPanel } from "@/components/dashboard/HoleLibraryPanel";
import { ActionPlanPanel } from "@/components/dashboard/ActionPlanPanel";
import { CapabilityAssumptionsEditor } from "@/components/dashboard/CapabilityAssumptionsEditor";
import { MathReferencePanel } from "@/components/dashboard/MathReferencePanel";
import { QaPanel } from "@/components/dashboard/QaPanel";
import { ValidationPanel } from "@/components/dashboard/ValidationPanel";
import { PlanCorridorEditor } from "@/components/dashboard/PlanCorridorEditor";
import { SurveyToolProfilePanel } from "@/components/dashboard/SurveyToolProfilePanel";
import { ScenarioLabModal } from "@/components/dashboard/ScenarioLabModal";
import { SteeringFeasibilityPanel } from "@/components/dashboard/SteeringFeasibilityPanel";
import { SupervisorApprovalPanel } from "@/components/dashboard/SupervisorApprovalPanel";
import { InfoTip } from "@/components/layout/InfoTip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GuideModal } from "@/components/pitch/GuideModal";
import { GuideTour, guideFocusClass } from "@/components/pitch/GuideTour";
import { usePitchMode } from "@/hooks/use-pitch-mode";
import { useTargetLockProject } from "@/hooks/use-targetlock-project";
import type { PitchHighlight } from "@/lib/drilling/pitch-scenario";
import { parseSurveyCsv } from "@/lib/drilling/csv";
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
import type { SyntheticHoleParams } from "@/lib/drilling/synthetic-hole-builder";
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
import type { SurveyRecord, TargetConfig } from "@/lib/drilling/types";

type AdvancedTab =
  | "trajectory"
  | "steering"
  | "qaqc"
  | "decisions"
  | "math"
  | "validation"
  | "setup";

const ADVANCED_TABS: { id: AdvancedTab; label: string }[] = [
  { id: "trajectory", label: "Trajectory" },
  { id: "steering", label: "Steering feasibility" },
  { id: "qaqc", label: "QA/QC" },
  { id: "decisions", label: "Decisions" },
  { id: "math", label: "Math reference" },
  { id: "validation", label: "Validation" },
  { id: "setup", label: "Setup / assumptions" },
];

const HIGHLIGHT_TAB: Record<string, AdvancedTab | undefined> = {
  charts: "trajectory",
  "qa-panel": "qaqc",
  history: "decisions",
};

export default function TargetLockApp() {
  const [pitchPersistenceOff, setPitchPersistenceOff] = useState(false);

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
    loadSyntheticHole,
    planCorridor,
    setPlanCorridor,
    surveyToolProfile,
    setSurveyToolProfile,
    seedPlanCorridorFromPlan,
  } = useTargetLockProject(pitchPersistenceOff);

  const pitch = usePitchMode({
    setPlanRecords,
    setActualRecords,
    setTarget,
    setMode,
    onActiveChange: setPitchPersistenceOff,
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

  const [advancedTab, setAdvancedTab] = useState<AdvancedTab>("steering");

  const ph = (id: PitchHighlight) =>
    guideFocusClass(pitch.currentStep.highlight, id, pitch.pitchActive);

  useEffect(() => {
    if (!pitch.pitchActive) return;
    const tab = HIGHLIGHT_TAB[pitch.currentStep.highlight ?? ""];
    if (tab) setAdvancedTab(tab);
  }, [pitch.pitchActive, pitch.pitchStepIndex, pitch.currentStep.highlight]);

  useEffect(() => {
    if (!pitch.pitchActive || !pitch.currentStep.highlight) return;
    const frame = requestAnimationFrame(() => {
      document.querySelector(".guide-focus")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [pitch.pitchActive, pitch.pitchStepIndex, pitch.currentStep.highlight]);

  const [manualMd, setManualMd] = useState("");
  const [manualDip, setManualDip] = useState("");
  const [manualAzimuth, setManualAzimuth] = useState("");
  const [manualMessage, setManualMessage] = useState(
    "Add the next survey as it comes off the camera."
  );
  const [dataMessage, setDataMessage] = useState<string | null>(null);
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

  const clearAssumptionsSignOff = useCallback(() => {
    setAssumptionSignOff(null);
    pushHistory({
      type: "supervisor_decision",
      summary: "Recovery assumptions sign-off cleared",
      actionTaken: "Clear validation",
    });
  }, [setAssumptionSignOff, pushHistory]);

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
    loadSampleData(true);
    setManualMessage("Sample plan and actual surveys loaded.");
    setTimeout(fillNextSurveyFromAim, 0);
  }, [fillNextSurveyFromAim, loadSampleData]);

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

  const addManualSurvey = () => {
    const md = Number(manualMd);
    const dip = Number(manualDip);
    const azimuth = Number(manualAzimuth);

    if (!Number.isFinite(md) || !Number.isFinite(dip) || !Number.isFinite(azimuth)) {
      setManualMessage("Enter MD, dip, and azimuth before adding a survey.");
      return;
    }

    const last = actualRecords[actualRecords.length - 1];
    const existingIndex = actualRecords.findIndex(
      (record) => Math.abs(record.md - md) < 0.001
    );
    if (existingIndex === -1 && last && md <= last.md) {
      setManualMessage(
        `Next survey MD must be greater than the current ${round(last.md, 1)} m survey.`
      );
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
    setManualMessage(message);
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

  const readCsvFile = async (file: File, type: "plan" | "actual") => {
    const label = type === "plan" ? "Planned" : "Actual";
    let text: string;
    try {
      text = await file.text();
    } catch {
      setDataMessage(`Could not read ${file.name}. Check the file and try again.`);
      return;
    }
    const records = parseSurveyCsv(text);
    if (records.length === 0) {
      setDataMessage(
        `No valid surveys found in ${file.name}. Expected columns: MD, dip, azimuth (see the example template).`
      );
      return;
    }
    if (type === "plan") {
      setPlanRecords(records);
      setActiveScenario(null);
      seedPlanCorridorFromPlan(records);
      const stations = buildStations(records);
      const finalPlan = stations[stations.length - 1];
      pushHistory({
        type: "data_loaded",
        summary: `Planned trajectory imported (${records.length} stations)`,
        actionTaken: `File: ${file.name}`,
      });
      if (finalPlan) applyPlanTarget(finalPlan.md);
    } else {
      setActualRecords(records);
      setActiveScenario(null);
      pushHistory({
        type: "data_loaded",
        summary: `Actual surveys imported (${records.length} stations)`,
        actionTaken: `File: ${file.name}`,
      });
      const { recommendation: newReco } = computeHole(planRecords, records, target);
      logRecommendation(newReco, "Import actual CSV");
    }
    setDataMessage(`${label} CSV loaded — ${records.length} survey${records.length === 1 ? "" : "s"}.`);
  };

  const handleLoadTestScenario = (scenarioId: string) => {
    const message = loadTestScenario(scenarioId);
    setDataMessage(message);
    setManualMessage("Add the next survey as it comes off the camera.");
    fillNextSurveyFromAim();
  };

  const handleLoadSyntheticHole = (params: SyntheticHoleParams): string => {
    const message = loadSyntheticHole(params);
    setDataMessage(message);
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
    } catch {
      setManualMessage("PDF export failed. Try the text report or refresh the page.");
    }
  };

  const confirmResetHole = () => {
    if (
      !window.confirm(
        "Reset the active hole? Surveys, target, and decision history will be cleared. This cannot be undone."
      )
    ) {
      return;
    }
    resetHole();
    setDataMessage("Hole reset. Load a sample or import CSVs to start again.");
    setManualMessage("Add the next survey as it comes off the camera.");
  };

  const updateTargetField = (field: keyof TargetConfig, value: number) => {
    setTarget((prev) => ({ ...prev, [field]: value }));
  };

  const startPitchWalkthrough = () => {
    pitch.startPitch({
      planRecords,
      actualRecords,
      target,
      mode,
      history,
    });
  };

  return (
    <TooltipProvider delayDuration={280}>
      <div
        className={`targetlock-app targetlock-mode-${mode}${pitch.pitchActive ? " pitch-active" : ""}`}
        data-mode={mode}
      >
      {pitch.pitchActive && (
        <div className="guide-active-banner pitch-active-banner" role="status">
          Guided tour — sample data only (not saved to your hole)
        </div>
      )}
      <GuideModal
        open={pitch.summaryOpen}
        tourActive={pitch.pitchActive}
        tourStep={pitch.pitchStepIndex}
        tourStepCount={pitch.pitchStepCount}
        onClose={() => pitch.setSummaryOpen(false)}
        onStartTour={startPitchWalkthrough}
      />
      <ScenarioLabModal
        open={scenarioLabOpen}
        onClose={() => setScenarioLabOpen(false)}
        onLoadScenario={handleLoadTestScenario}
        onGenerateScenario={handleLoadSyntheticHole}
      />
      <GuideTour
        active={pitch.pitchActive}
        step={pitch.currentStep}
        stepIndex={pitch.pitchStepIndex}
        stepCount={pitch.pitchStepCount}
        onPrev={pitch.prevPitchStep}
        onNext={pitch.nextPitchStep}
        onExit={pitch.exitPitch}
        onOpenGuide={() => pitch.setSummaryOpen(true)}
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
          </div>

          <div className="targetlock-project-meta advanced-only">
            <h2 className="targetlock-sidebar-section-title">Hole details</h2>
            <label>
              <span>Hole ID / name</span>
              <input
                type="text"
                value={holeName}
                onChange={(e) => setHoleName(e.target.value)}
                aria-label="Hole ID or name"
              />
            </label>
            <label>
              <span>Site / project</span>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. North Camp — Phase 2"
                aria-label="Site or project name"
              />
            </label>
          </div>

          {library ? (
            <HoleLibraryPanel
              holes={library.holes}
              activeHoleId={library.activeHoleId}
              onSwitch={switchHole}
              onNewSample={() => createNewHole(true)}
              onNewBlank={() => createNewHole(false)}
              onDuplicate={duplicateCurrentHole}
              onDelete={deleteCurrentHole}
            />
          ) : null}

          <div className="targetlock-sidebar-setup">
          <section className="targetlock-panel targetlock-sidebar-setup-panel">
            <h2>
              Hole data{" "}
              <InfoTip tip="Upload planned trajectory and downhole survey files. CSV is a stand-in for survey-tool or HUB-IQ imports." />
            </h2>
            <div className="targetlock-stack">
              <label>
                <span>
                  Hole plan{" "}
                  <InfoTip tip="Planned trajectory, target and tolerance data." />
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  aria-label="Hole plan CSV file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void readCsvFile(file, "plan");
                  }}
                />
              </label>
              <label>
                <span>
                  Survey results{" "}
                  <InfoTip tip="Downhole survey readings from camera/gyro." />
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  aria-label="Survey results CSV file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void readCsvFile(file, "actual");
                  }}
                />
              </label>
              <details className="targetlock-csv-format-help">
                <summary>CSV format help</summary>
                <p className="targetlock-csv-format-help-lead">
                  Each file needs depth (MD), dip, and azimuth. Common HUB-IQ column names are
                  accepted.
                </p>
                <ul className="targetlock-csv-format-help-links">
                  <li>
                    <a href="/templates/hub-iq-planned-example.csv" download>
                      Hole plan example CSV
                    </a>
                  </li>
                  <li>
                    <a href="/templates/hub-iq-actual-example.csv" download>
                      Survey results example CSV
                    </a>
                  </li>
                </ul>
              </details>
              <div className={`targetlock-btn-row ${ph("export")}`}>
                <button
                  type="button"
                  className="targetlock-btn targetlock-btn-primary"
                  onClick={loadSample}
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
                  className="targetlock-btn targetlock-btn-primary"
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
                  className="targetlock-btn targetlock-btn-secondary"
                  onClick={confirmResetHole}
                  title="Clear surveys, target, and history for the active hole only"
                >
                  Reset active hole
                </button>
              </div>
              {dataMessage ? (
                <p className="targetlock-helper" role="status" aria-live="polite">
                  {dataMessage}
                </p>
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
                  value={manualMd}
                  onChange={(e) => setManualMd(e.target.value)}
                />
              </label>
              <label>
                <span>Dip</span>
                <input
                  type="number"
                  step={0.1}
                  value={manualDip}
                  onChange={(e) => setManualDip(e.target.value)}
                />
              </label>
              <label className="col-span-2">
                <span>Azimuth</span>
                <input
                  type="number"
                  step={0.1}
                  value={manualAzimuth}
                  onChange={(e) => setManualAzimuth(e.target.value)}
                />
              </label>
            </div>
            <div className="targetlock-btn-row">
              <button type="button" className="targetlock-btn" onClick={fillNextSurveyFromAim}>
                Fill from action plan
              </button>
              <button
                type="button"
                className="targetlock-btn targetlock-btn-primary"
                onClick={addManualSurvey}
              >
                Add survey
              </button>
              <button type="button" className="targetlock-btn" onClick={undoLatestSurvey}>
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
                  onChange={(e) =>
                    updateTargetField("tolerance", Math.max(0.1, Number(e.target.value)))
                  }
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
                  onChange={(e) =>
                    updateTargetField("maxDls", Math.max(0.1, Number(e.target.value)))
                  }
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
                  onChange={(e) =>
                    updateTargetField("nextInterval", Math.max(1, Number(e.target.value)))
                  }
                />
              </label>
            </div>
            <button
              type="button"
              className="targetlock-btn"
              onClick={() => applyPlanTarget()}
            >
              Use planned target
            </button>
            <PlanCorridorEditor
              corridor={planCorridor}
              status={corridorStatus}
              onChange={setPlanCorridor}
            />
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
                className={`guide-topbar-btn pitch-topbar-btn${pitch.pitchActive ? " guide-topbar-btn--active" : ""}`}
                onClick={() => pitch.setSummaryOpen(true)}
                aria-expanded={pitch.summaryOpen}
              >
                {pitch.pitchActive
                  ? `Guide · step ${pitch.pitchStepIndex + 1}/${pitch.pitchStepCount}`
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
              <div className="targetlock-mode-switch" role="tablist" aria-label="Display mode">
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

          <div className={`${ph("recommendation")} ${ph("recovery-guidance")}`}>
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

            {advancedTab === "steering" ? (
              <div className="targetlock-tabpanel" role="tabpanel">
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
                  <DecisionHistoryPanel entries={history} onClear={clearHistory} />
                </div>
              </div>
            ) : null}

            {advancedTab === "math" ? (
              <div className="targetlock-tabpanel" role="tabpanel">
                <MathReferencePanel recommendation={recommendation} steering={steering} />
              </div>
            ) : null}

            {advancedTab === "validation" ? (
              <div className="targetlock-tabpanel" role="tabpanel">
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
              <div className="targetlock-tabpanel" role="tabpanel">
                <CapabilityAssumptionsEditor
                  assumptions={recoveryAssumptions}
                  onChange={setRecoveryAssumptions}
                  onReset={resetRecoveryAssumptions}
                  validationStatus={validationStatus}
                />
                <SurveyToolProfilePanel
                  profile={surveyToolProfile}
                  assessment={surveyAssessment}
                  onChange={setSurveyToolProfile}
                />
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}
