"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTargetLockConfirm } from "@/components/targetlock/TargetLockConfirmProvider";
import { ConstraintsStep } from "@/components/planner/ConstraintsStep";
import { PlannerPlansView } from "@/components/planner/PlannerPlansView";
import { PlannerCreateView } from "@/components/planner/PlannerCreateView";
import { PlannerApproveModal } from "@/components/planner/PlannerApproveModal";
import { PlannerRevisionModal } from "@/components/planner/PlannerRevisionModal";
import { PlannerReviewActionsPanel } from "@/components/planner/PlannerReviewActionsPanel";
import { CollarStep } from "@/components/planner/CollarStep";
import { PlannerImportAssistant } from "@/components/planner/PlannerImportAssistant";
import { DaughterKickoffStep } from "@/components/planner/DaughterKickoffStep";
import { PlannerGenerateStep } from "@/components/planner/PlannerGenerateStep";
import { PlanReviewStep } from "@/components/planner/PlanReviewStep";
import { PlannerActions } from "@/components/planner/PlannerActions";
import { PlannerHandoffChecklist } from "@/components/planner/PlannerHandoffChecklist";
import { PlannerExecutionStatusPanel } from "@/components/planner/PlannerExecutionStatusPanel";
import { PlannerExecutionAuditPanel } from "@/components/planner/PlannerExecutionAuditPanel";
import { PlannerCompletionPanel } from "@/components/planner/PlannerCompletionPanel";
import { PlannerLifecycleTimeline } from "@/components/planner/PlannerLifecycleTimeline";
import { PlannerRevisionGuard } from "@/components/planner/PlannerRevisionGuard";
import { PlannerCoordinatesView } from "@/components/planner/PlannerCoordinatesView";
import { PlannerPackageView } from "@/components/planner/PlannerPackageView";
import { PlannerReportPreview } from "@/components/planner/PlannerReportPreview";
import { PlannerMapView } from "@/components/planner/PlannerMapView";
import { Planner3DView } from "@/components/planner/Planner3DView";
import { PlannerPreview } from "@/components/planner/PlannerPreview";
import { PlannerProgramView } from "@/components/planner/PlannerProgramView";
import { PlannerQaView } from "@/components/planner/PlannerQaView";
import type { PlannerPlanAction } from "@/components/planner/PlannerPlanTable";
import { PlannerQaBadge } from "@/components/planner/PlannerQaBadge";
import { PlannerRevisionPanel } from "@/components/planner/PlannerRevisionPanel";
import { PlannerShell, type PlannerTab } from "@/components/planner/PlannerShell";
import { PlannerGuideTour } from "@/components/planner/PlannerGuideTour";
import { usePlannerGuide } from "@/hooks/use-planner-guide";
import { PlannerCoordinateSummary } from "@/components/planner/PlannerCoordinateSummary";
import { PlannerMethodologyView } from "@/components/planner/PlannerMethodologyView";
import { ProjectCoordinateStep } from "@/components/planner/ProjectCoordinateStep";
import { TargetStep } from "@/components/planner/TargetStep";
import {
  findHole,
  resolveProgramCoordinateSystem,
  syncProgramCoordinateSystem,
  syncProgramQaSettings,
  upsertHole,
  type HoleLibrary,
} from "@/lib/drilling/hole-library";
import {
  derivePlannerPrograms,
  holesInProgram,
} from "@/lib/drilling/planner-program";
import {
  resolvePlannerApprovalStatus,
  type PlannerApprovalSnapshot,
} from "@/lib/drilling/planner-approval";
import { resolvePlanLockStatusWithApproval } from "@/lib/drilling/plan-lock";
import { PlannerStatusBadge } from "@/components/planner/PlannerStatusBadge";
import { PlannerReadinessBadge } from "@/components/planner/ui/PlannerReadinessBadge";
import { PlannerEmptyState } from "@/components/planner/ui/PlannerEmptyState";
import { PlannerSectionHeader } from "@/components/planner/ui/PlannerSectionHeader";
import {
  buildProgramMapModel,
  capturePlannerMapPng,
} from "@/lib/drilling/planner-map-snapshot";
import {
  downloadHolePlanningPackage,
  downloadProgramPackage,
} from "@/lib/drilling/planner-export";
import { evaluateHandoffReadiness } from "@/lib/drilling/planner-handoff";
import { evaluatePlanReadiness } from "@/lib/drilling/planner-readiness";
import { resolveDefaultProgramId } from "@/lib/drilling/planner-command-center";
import { loadInstitutionalDemoProgram } from "@/lib/drilling/planner-demo-program";
import {
  downloadHolePlanningPdf,
  downloadProgramPlanningPdf,
} from "@/lib/drilling/planner-report-pdf";
import {
  downloadHolePlanningReportTxt,
  downloadProgramPlanningReportTxt,
} from "@/lib/drilling/planner-report-text";
import {
  buildProgramQaReport,
  canApprovePlannerHole,
  clearancePairSelection,
} from "@/lib/drilling/planner-qa";
import {
  downloadPlannerCsv,
  duplicatePlannerPlan,
  generatePlannerPlan,
  publishPlannerDraft,
  resolveDaughterKickoff,
  savedHoleToPlannerDraft,
} from "@/lib/drilling/planner";
import { buildActualVsPlanned } from "@/lib/drilling/actual-vs-plan";
import {
  activatePlannerHoleForExecution,
  buildPlannerExecutionContext,
  completePlannerExecution,
  openPlannerPlanInTargetLock,
} from "@/lib/drilling/execution-bridge";
import { guardLockedPlanEdit } from "@/lib/drilling/plan-lock";
import {
  downloadActualSurveysCsv,
  downloadActualVsPlanSummaryCsv,
  downloadExecutionManifest,
  downloadLockedPlanCsv,
} from "@/lib/drilling/execution-package";
import {
  createPlannerRevision as createPlannerRevisionFull,
  plannerPlanEditBlockedReason,
} from "@/lib/drilling/plan-revision";
import {
  approvePlannerPlan,
  archivePlannerPlan,
  plannerStatus,
} from "@/lib/drilling/planner-status";
import { loadLibrary, saveLibrary } from "@/lib/drilling/storage";
import {
  createEmptyPlannerDraft,
  type PlannerClearancePair,
  type PlannerDraft,
  type PlannerProjectCoordinateSystem,
  type PlannerQaSettings,
  type PlannerStepId,
} from "@/lib/drilling/planner-types";

const STEP_ORDER: PlannerStepId[] = [
  "project",
  "collar",
  "target",
  "constraints",
  "generate",
  "review",
  "publish",
];

function stepsForPlanType(planType: PlannerDraft["planType"]): PlannerStepId[] {
  if (planType === "import") {
    return ["project", "target", "generate", "review", "publish"];
  }
  return STEP_ORDER;
}

function resolveInitialPlannerTab(
  holeIdFromUrl: string | null,
  tabFromUrl: string | null
): PlannerTab {
  if (holeIdFromUrl) return "review";
  if (tabFromUrl === "methodology") return "methodology";
  // First-run users land on Plans: the empty state offers the demo program
  // and Create side by side instead of dropping them into the wizard.
  return "plans";
}

export default function PlannerApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm } = useTargetLockConfirm();
  const holeIdFromUrl = searchParams.get("holeId");
  const tabFromUrl = searchParams.get("tab");
  const initialTabResolved = useRef(false);
  const [activeTab, setActiveTab] = useState<PlannerTab>(() =>
    resolveInitialPlannerTab(holeIdFromUrl, tabFromUrl)
  );
  const [draft, setDraft] = useState<PlannerDraft>(createEmptyPlannerDraft);
  const [step, setStep] = useState<PlannerStepId>("project");
  const [library, setLibrary] = useState<HoleLibrary | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [selectedHoleId, setSelectedHoleId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [highlightedClearancePair, setHighlightedClearancePair] =
    useState<PlannerClearancePair | null>(null);
  const [importAssistantOpen, setImportAssistantOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionSourceHoleId, setRevisionSourceHoleId] = useState<string | null>(null);
  const plannerGuide = usePlannerGuide({ onTabChange: setActiveTab });

  const refreshLibrary = useCallback(() => {
    // Fall back to an empty in-memory library on fresh browsers so the
    // planner renders its empty states instead of a perpetual loading panel.
    const lib = loadLibrary() ?? { version: 1, activeHoleId: "pending", holes: [] };
    setLibrary(lib);
    setHydrated(true);
    return lib;
  }, []);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  useEffect(() => {
    if (selectedProgramId || !library) return;
    const defaultId = resolveDefaultProgramId(library);
    if (defaultId) setSelectedProgramId(defaultId);
  }, [library, selectedProgramId]);

  useEffect(() => {
    if (initialTabResolved.current || !library) return;
    initialTabResolved.current = true;
    if (!holeIdFromUrl) {
      setActiveTab(resolveInitialPlannerTab(null, searchParams.get("tab")));
    }
  }, [library, holeIdFromUrl, searchParams]);

  useEffect(() => {
    const holeId = searchParams.get("holeId");
    const tab = searchParams.get("tab");
    if (holeId) {
      setSelectedHoleId(holeId);
      setActiveTab("review");
      return;
    }
    if (tab === "methodology") {
      setActiveTab("methodology");
    }
  }, [searchParams]);

  const persistLibrary = useCallback((nextLib: HoleLibrary) => {
    saveLibrary(nextLib);
    setLibrary(nextLib);
  }, []);

  const qaReport = useMemo(
    () =>
      library && selectedProgramId
        ? buildProgramQaReport(library, selectedProgramId)
        : null,
    [library, selectedProgramId]
  );

  const motherHoles = useMemo(
    () =>
      (library?.holes ?? []).filter(
        (h) => h.actualRecords.length > 0 && h.holeRole !== "daughter"
      ),
    [library]
  );

  const selectedHole = useMemo(
    () => (library && selectedHoleId ? findHole(library, selectedHoleId) : null),
    [library, selectedHoleId]
  );

  const selectedExecutionContext = useMemo(() => {
    if (!selectedHole || !library) return null;
    const status = plannerStatus(selectedHole);
    if (status !== "active" && status !== "completed") return null;
    return buildPlannerExecutionContext(selectedHole, library);
  }, [selectedHole, library]);

  const selectedActualVsPlanned = useMemo(() => {
    if (!selectedHole || !library || !selectedExecutionContext) return null;
    return buildActualVsPlanned(
      selectedHole,
      selectedHole.actualRecords,
      selectedHole.planCorridor,
      null,
      library
    );
  }, [selectedHole, library, selectedExecutionContext]);

  const patchDraft = useCallback((patch: Partial<PlannerDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  /**
   * Project coordinate system for the draft being created: the draft's own
   * PCS when editing, otherwise the resolved PCS of the program the draft
   * will join (matched by id, falling back to the typed program name).
   */
  const draftProgramPcs = useMemo(() => {
    if (draft.projectCoordinateSystem) return draft.projectCoordinateSystem;
    if (!library) return undefined;
    const typedName = draft.programName?.trim().toLowerCase();
    const programId =
      draft.programId ??
      (typedName
        ? derivePlannerPrograms(library).find(
            (p) => p.name.trim().toLowerCase() === typedName
          )?.programId
        : undefined);
    if (!programId) return undefined;
    return resolveProgramCoordinateSystem(holesInProgram(library, programId, true));
  }, [draft.projectCoordinateSystem, draft.programId, draft.programName, library]);

  const handleKickoffMdChange = useCallback(
    (motherHoleId: string, kickoffMd: number) => {
      const mother = library?.holes.find((h) => h.holeId === motherHoleId);
      if (!mother) return;
      const kickoff = resolveDaughterKickoff(
        mother.actualRecords,
        kickoffMd,
        mother.holeId,
        mother.holeName
      );
      patchDraft({
        holeName: draft.holeName || `${mother.holeName}A`,
        daughterKickoff: kickoff ?? undefined,
      });
    },
    [library, patchDraft, draft.holeName]
  );

  const handleGenerate = useCallback(() => {
    const generated = generatePlannerPlan(draft, library);
    setDraft(generated);
    setStep("review");
    setStatusMessage(
      generated.planRecords.length
        ? `Generated ${generated.planRecords.length} planned stations.`
        : "Plan generation completed with warnings."
    );
  }, [draft, library]);

  const ensureLibrary = useCallback((): HoleLibrary => {
    if (library) return library;
    const empty: HoleLibrary = {
      version: 1,
      activeHoleId: "pending",
      holes: [],
    };
    setLibrary(empty);
    return empty;
  }, [library]);

  const handlePublish = useCallback(
    (mode: "plans" | "review" = "plans") => {
      if (!draft.planRecords.length) {
        setStatusMessage("Generate a plan before saving.");
        return;
      }
      if (draft.editingHoleId && library) {
        const existing = findHole(library, draft.editingHoleId);
        if (existing) {
          const guard = plannerPlanEditBlockedReason(existing);
          if (guard) {
            setStatusMessage(guard);
            return;
          }
        }
      }
      const lib = ensureLibrary();
      // Carry the resolved program PCS onto new holes so the declination /
      // convergence bridge into the hole reference system applies on publish.
      const draftForPublish =
        !draft.projectCoordinateSystem && draftProgramPcs
          ? { ...draft, projectCoordinateSystem: draftProgramPcs }
          : draft;
      const result = publishPlannerDraft(draftForPublish, lib, { activate: false });
      if (!result) {
        setStatusMessage("Could not save planned hole — check warnings and inputs.");
        return;
      }
      persistLibrary(result.library);
      setSelectedHoleId(result.holeId);
      setStatusMessage(`Saved ${draft.holeName ?? result.holeId} to planning library.`);
      setActiveTab(mode === "review" ? "review" : "plans");
    },
    [draft, draftProgramPcs, ensureLibrary, library, persistLibrary]
  );

  const handleExportCsv = useCallback(
    (holeId?: string) => {
      const hole =
        holeId && library ? findHole(library, holeId) : null;
      const records = hole?.planRecords ?? draft.planRecords;
      if (!records.length) {
        setStatusMessage("No plan stations to export.");
        return;
      }
      const name = (hole?.holeName ?? draft.holeName ?? "planned-hole").replace(
        /[^\w.-]+/g,
        "-"
      );
      downloadPlannerCsv(records, `${name}-plan.csv`);
      setStatusMessage("Plan CSV downloaded.");
    },
    [draft, library]
  );

  const handleCreateRevision = useCallback(
    (reason?: string, sourceHoleId?: string) => {
      const holeId = sourceHoleId ?? selectedHoleId;
      if (!library || !holeId) return;
      const result = createPlannerRevisionFull(library, holeId, { reason });
      if (result) {
        persistLibrary(result.library);
        setSelectedHoleId(result.revisionHole.holeId);
        setActiveTab("review");
        setStatusMessage(
          `Created revision ${result.revisionHole.holeName} (R${result.revisionHole.plannerMeta?.planRevision ?? "?"}).`
        );
      }
    },
    [library, selectedHoleId, persistLibrary]
  );

  const handlePlanAction = useCallback(
    async (holeId: string, action: PlannerPlanAction) => {
      if (!library) return;
      const hole = findHole(library, holeId);
      if (!hole) return;

      setSelectedHoleId(holeId);

      switch (action) {
        case "open": {
          const lockGuard = guardLockedPlanEdit(hole, "plannerMeta");
          const editGuard = plannerPlanEditBlockedReason(hole);
          if (lockGuard || editGuard) {
            setStatusMessage(lockGuard ?? editGuard ?? "Create a revision to edit this plan.");
            break;
          }
          setDraft(savedHoleToPlannerDraft(hole));
          setStep("project");
          setActiveTab("create");
          setStatusMessage(`Editing ${hole.holeName} in planner.`);
          break;
        }
        case "review": {
          setActiveTab("review");
          break;
        }
        case "duplicate": {
          const next = duplicatePlannerPlan(library, holeId);
          if (next) {
            persistLibrary(next);
            setStatusMessage(`Duplicated ${hole.holeName}.`);
          }
          break;
        }
        case "revision": {
          setRevisionSourceHoleId(holeId);
          setRevisionModalOpen(true);
          break;
        }
        case "archive": {
          const ok = await confirm({
            title: `Archive ${hole.holeName}?`,
            description:
              "This plan will be hidden from default library views.",
            confirmLabel: "Archive",
            variant: "warning",
          });
          if (!ok) return;
          const next = archivePlannerPlan(library, holeId);
          if (next) {
            persistLibrary(next);
            setStatusMessage(`Archived ${hole.holeName}.`);
          }
          break;
        }
        default:
          break;
      }
    },
    [library, persistLibrary, confirm]
  );

  const handleArchiveSelectedPlan = useCallback(async () => {
    if (!library || !selectedHoleId) return;
    const hole = findHole(library, selectedHoleId);
    if (!hole) return;
    const ok = await confirm({
      title: `Archive ${hole.holeName}?`,
      description: "This plan will be hidden from default library views.",
      confirmLabel: "Archive",
      variant: "warning",
    });
    if (!ok) return;
    const next = archivePlannerPlan(library, selectedHoleId);
    if (next) {
      persistLibrary(next);
      setStatusMessage(`Archived ${hole.holeName}.`);
    }
  }, [library, selectedHoleId, persistLibrary, confirm]);

  const handleMarkActiveAndOpen = useCallback(() => {
    if (!library || !selectedHoleId) return;
    const result = activatePlannerHoleForExecution(library, selectedHoleId);
    if (!result) {
      setStatusMessage("Could not activate plan — it must be approved first.");
      return;
    }
    persistLibrary(result.library);
    if (result.warnings.length) {
      setStatusMessage(result.warnings.join(" "));
    }
    router.push("/targetlock");
  }, [library, selectedHoleId, persistLibrary, router]);

  const handleCompletePlan = useCallback(
    (completedBy: string, notes?: string) => {
      if (!library || !selectedHoleId) return;
      const result = completePlannerExecution(library, selectedHoleId, {
        completedBy,
        completionNotes: notes,
      });
      if (!result) {
        setStatusMessage("Could not mark plan completed.");
        return;
      }
      persistLibrary(result.library);
      const warn =
        result.warnings.length > 0 ? ` ${result.warnings.join(" ")}` : "";
      setStatusMessage(`Plan marked completed.${warn}`);
    },
    [library, selectedHoleId, persistLibrary]
  );

  const handleOpenTargetLock = useCallback(() => {
    if (!library || !selectedHoleId) return;
    const next = openPlannerPlanInTargetLock(library, selectedHoleId);
    if (!next) return;
    persistLibrary(next);
    router.push("/targetlock");
  }, [library, selectedHoleId, persistLibrary, router]);

  const handleExportProgramPackage = useCallback(
    (programId: string, programName: string) => {
      if (!library) return;
      downloadProgramPackage(library, programId, programName);
      setStatusMessage(`Exported program package for ${programName}.`);
    },
    [library]
  );

  const captureProgramMapPng = useCallback(
    async (programId: string) => {
      if (!library) return undefined;
      const model = buildProgramMapModel(library, programId);
      if (!model) return undefined;
      const png = await capturePlannerMapPng(model);
      return png ?? undefined;
    },
    [library]
  );

  const handleExportHolePdf = useCallback(async () => {
    if (!library || !selectedHoleId) return;
    const hole = findHole(library, selectedHoleId);
    const programId = hole?.plannerMeta?.programId;
    const planViewImageBase64 = programId
      ? await captureProgramMapPng(programId)
      : undefined;
    await downloadHolePlanningPdf(library, selectedHoleId, { planViewImageBase64 });
    setStatusMessage("Planning PDF downloaded.");
  }, [library, selectedHoleId, captureProgramMapPng]);

  const handleExportHoleTxt = useCallback(() => {
    if (!library || !selectedHoleId) return;
    downloadHolePlanningReportTxt(library, selectedHoleId);
    setStatusMessage("Planning TXT downloaded.");
  }, [library, selectedHoleId]);

  const handleExportHolePackage = useCallback(async () => {
    if (!library || !selectedHoleId) return;
    const hole = findHole(library, selectedHoleId);
    const programId = hole?.plannerMeta?.programId;
    const planViewImageBase64 = programId
      ? await captureProgramMapPng(programId)
      : undefined;
    downloadHolePlanningPackage(library, selectedHoleId, {
      includePdf: true,
      planViewImageBase64,
    });
    setStatusMessage("Hole planning package downloaded.");
  }, [library, selectedHoleId, captureProgramMapPng]);

  const handleExportProgramPdf = useCallback(
    async (programId: string, _programName: string) => {
      if (!library) return;
      const programMapImageBase64 = await captureProgramMapPng(programId);
      const program = library.holes.find(
        (h) => h.plannerMeta?.programId === programId
      );
      const name = program?.plannerMeta?.programName ?? "program";
      await downloadProgramPlanningPdf(library, programId, name, {
        programMapImageBase64,
      });
      setStatusMessage("Program planning PDF downloaded.");
    },
    [library, captureProgramMapPng]
  );

  const handleExportExecutionPackage = useCallback(
    (holeId: string) => {
      if (!library) return;
      const hole = findHole(library, holeId);
      if (!hole) return;
      const exported = [
        downloadExecutionManifest(hole, library),
        downloadLockedPlanCsv(hole),
        downloadActualSurveysCsv(hole),
        downloadActualVsPlanSummaryCsv(hole, library),
      ].some(Boolean);
      setStatusMessage(
        exported
          ? `Execution evidence exported for ${hole.holeName}.`
          : "Execution evidence not available for this plan."
      );
    },
    [library]
  );

  const handleExportProgramTxt = useCallback(
    (programId: string, programName: string) => {
      if (!library) return;
      downloadProgramPlanningReportTxt(library, programId, programName);
      setStatusMessage("Program planning TXT downloaded.");
    },
    [library]
  );

  const handleApprovePlan = useCallback(
    async (opts: {
      approvedBy: string;
      role?: string;
      notes?: string;
      snapshot: PlannerApprovalSnapshot;
    }) => {
      if (!library || !selectedHoleId) return;
      const hole = findHole(library, selectedHoleId);
      if (!hole) return;
      const approval = canApprovePlannerHole(hole, library);
      if (!approval.allowed) {
        setStatusMessage(approval.blockers.join(" "));
        return;
      }
      if (approval.requiresConfirmation) {
        const ok = await confirm({
          title: `Approve ${hole.holeName} with QA warnings?`,
          description: approval.warnings.join("\n"),
          confirmLabel: "Approve anyway",
          variant: "warning",
        });
        if (!ok) return;
      }
      let nextLib = library;
      if (opts.notes !== undefined) {
        nextLib = upsertHole(nextLib, {
          ...hole,
          plannerMeta: {
            ...hole.plannerMeta!,
            plannerNotes: opts.notes.trim() || undefined,
          },
        });
      }
      const next = approvePlannerPlan(nextLib, selectedHoleId, {
        approvedBy: opts.approvedBy,
        role: opts.role,
        snapshot: opts.snapshot,
      });
      if (next) {
        persistLibrary(next);
        setStatusMessage(`Approved ${hole.holeName}.`);
      }
    },
    [library, selectedHoleId, persistLibrary, confirm]
  );

  const handleSaveQaSettings = useCallback(
    (programId: string, settings: PlannerQaSettings) => {
      if (!library) return;
      const { library: next, skippedProtected } = syncProgramQaSettings(
        library,
        programId,
        settings
      );
      persistLibrary(next);
      setStatusMessage(
        skippedProtected > 0
          ? `QA thresholds saved. ${skippedProtected} protected plan(s) were not updated — create a revision to change them.`
          : "QA thresholds saved for program."
      );
    },
    [library, persistLibrary]
  );

  const handleViewClearanceOnMap = useCallback(
    (pair: PlannerClearancePair) => {
      const selection = clearancePairSelection(pair);
      setSelectedProgramId(qaReport?.programId ?? selectedProgramId);
      setSelectedHoleId(selection.holeIds[0] ?? null);
      setHighlightedClearancePair(pair);
      setActiveTab("map");
    },
    [qaReport?.programId, selectedProgramId]
  );

  const handleSaveProjectCoordinates = useCallback(
    (programId: string, pcs: PlannerProjectCoordinateSystem | undefined) => {
      if (!library) return;
      const { library: next, skippedProtected } = syncProgramCoordinateSystem(
        library,
        programId,
        pcs
      );
      persistLibrary(next);
      setStatusMessage(
        skippedProtected > 0
          ? `Coordinates saved. ${skippedProtected} protected plan(s) were not updated — create a revision to change them.`
          : "Project coordinate system saved for program."
      );
    },
    [library, persistLibrary]
  );

  const handleNewPlan = useCallback(() => {
    setDraft(createEmptyPlannerDraft());
    setStep("project");
    setActiveTab("create");
    setStatusMessage(null);
  }, []);

  const handleNewDaughterPlan = useCallback(() => {
    const next = createEmptyPlannerDraft();
    next.planType = "daughter";
    setDraft(next);
    setStep("project");
    setActiveTab("create");
    setStatusMessage(null);
  }, []);

  const handleImportPlanned = useCallback(() => {
    setImportAssistantOpen(true);
  }, []);

  const handleLoadDemoProgram = useCallback(async () => {
    if (!library) return;
    const ok = await confirm({
      title: "Load institutional demo program?",
      description:
        "Adds the RC2 Institutional Demo Program as new holes. Your existing data is not removed.",
      confirmLabel: "Load demo",
    });
    if (!ok) return;
    const next = loadInstitutionalDemoProgram(library);
    persistLibrary(next);
    const demoHole = next.holes.find(
      (h) => h.plannerMeta?.programName === "RC2 Institutional Demo Program"
    );
    if (demoHole?.plannerMeta?.programId) {
      setSelectedProgramId(demoHole.plannerMeta.programId);
    }
    setActiveTab("plans");
    setStatusMessage("Institutional demo program loaded.");
  }, [library, persistLibrary, confirm]);

  const visibleSteps = stepsForPlanType(draft.planType);
  const stepIndex = visibleSteps.indexOf(step);

  const goNext = () => {
    const next = visibleSteps[stepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    const prev = visibleSteps[stepIndex - 1];
    if (prev) setStep(prev);
  };

  const renderCreateStepContent = () => {
    if (draft.editingHoleId && library) {
      const editing = findHole(library, draft.editingHoleId);
      const blocked = editing ? plannerPlanEditBlockedReason(editing) : null;
      if (blocked) {
        return (
          <PlannerRevisionGuard
            blockedReason={blocked}
            onCreateRevision={() => handleCreateRevision(undefined, draft.editingHoleId)}
          />
        );
      }
    }
    switch (step) {
      case "project":
        return (
          <ProjectCoordinateStep
            draft={draft}
            onChange={patchDraft}
            onImportFile={(text) => patchDraft({ importCsvText: text })}
          />
        );
      case "collar":
        return draft.planType === "daughter" ? (
          <DaughterKickoffStep
            draft={draft}
            motherHoles={motherHoles}
            onChange={patchDraft}
            onKickoffMdChange={handleKickoffMdChange}
          />
        ) : (
          <CollarStep draft={draft} pcs={draftProgramPcs} onChange={patchDraft} />
        );
      case "target":
        return <TargetStep draft={draft} onChange={patchDraft} />;
      case "constraints":
        return <ConstraintsStep draft={draft} onChange={patchDraft} />;
      case "generate":
        return (
          <PlannerGenerateStep
            draft={draft}
            library={library}
            onGenerate={handleGenerate}
          />
        );
      case "review":
        return <PlanReviewStep draft={draft} />;
      case "publish":
        return (
          <PlannerActions
            disabled={!draft.planRecords.length}
            onSave={() => handlePublish("plans")}
            onSaveAndReview={() => handlePublish("review")}
          />
        );
      default:
        return null;
    }
  };

  const showCoordinateAside =
    step !== "project" ||
    draft.collar !== undefined ||
    draft.target.e !== 0 ||
    draft.target.n !== 0 ||
    draft.target.d !== 0 ||
    draft.daughterKickoff !== undefined;

  const renderCreateFooter = () => {
    if (!(showCoordinateAside || draft.planRecords.length)) return null;
    return (
      <>
        <PlannerCoordinateSummary mode="draft" draft={draft} />
        {draft.planRecords.length && step !== "generate" ? (
          <article className="targetlock-panel">
            <div className="targetlock-panel-title">
              <h3>Plan preview</h3>
            </div>
            <PlannerPreview planRecords={draft.planRecords} />
          </article>
        ) : null}
      </>
    );
  };

  const renderCreateTab = () => (
    <PlannerCreateView
      currentStep={step}
      planType={draft.planType}
      onStepClick={setStep}
      stepContent={renderCreateStepContent()}
      footer={renderCreateFooter()}
    />
  );

  const renderReviewTab = () => {
    const reviewDraft = selectedHole
      ? savedHoleToPlannerDraft(selectedHole)
      : draft.planRecords.length
        ? draft
        : null;

    const reviewQaSummary =
      selectedHole && selectedHole.plannerMeta?.programId && library
        ? buildProgramQaReport(library, selectedHole.plannerMeta.programId)
            ?.holeSummaries.find((s) => s.holeId === selectedHole.holeId)
        : null;

    const reviewApproval =
      selectedHole && library
        ? canApprovePlannerHole(selectedHole, library)
        : null;

    const handoffReadiness =
      selectedHole && library
        ? evaluateHandoffReadiness(selectedHole, library)
        : null;

    const planReadiness =
      selectedHole && library
        ? evaluatePlanReadiness(selectedHole, library)
        : null;

    const reviewApprovalStatus =
      selectedHole && library
        ? resolvePlannerApprovalStatus(selectedHole, library)
        : null;

    const reviewLockStatus =
      selectedHole && library
        ? resolvePlanLockStatusWithApproval(selectedHole, library)
        : null;

    if (!reviewDraft) {
      return (
        <article className="targetlock-panel">
          <PlannerSectionHeader
            title="Plan review"
            eyebrow="Verify"
            subtitle="Pick a plan to review readiness, approval, and handoff."
          />
          <PlannerEmptyState
            title="No plan selected"
            message="Select a plan from Plans or finish creating one to review readiness, approval, and handoff here."
            actions={
              <>
                <button
                  type="button"
                  className="targetlock-btn"
                  onClick={() => setActiveTab("plans")}
                >
                  Open Plans
                </button>
                <button
                  type="button"
                  className="targetlock-btn targetlock-btn-primary"
                  onClick={handleNewPlan}
                >
                  New plan
                </button>
              </>
            }
          />
        </article>
      );
    }

    return (
      <div className="planner-review-tab">
        <header className="planner-review-decision-head targetlock-panel">
          <div className="planner-review-decision-id">
            <h2 className="planner-review-decision-title">
              {selectedHole ? selectedHole.holeName : "Plan review"}
            </h2>
            {selectedHole && library ? (
              <PlannerStatusBadge
                status={plannerStatus(selectedHole)}
                library={library}
                holeId={selectedHole.holeId}
              />
            ) : null}
          </div>
          {selectedHole ? (
            <dl className="planner-review-decision-states">
              {planReadiness ? (
                <div className="planner-review-decision-state">
                  <dt>Readiness</dt>
                  <dd>
                    <PlannerReadinessBadge
                      state={planReadiness.state}
                      score={planReadiness.score}
                    />
                  </dd>
                </div>
              ) : null}
              {reviewQaSummary ? (
                <div className="planner-review-decision-state">
                  <dt>QA</dt>
                  <dd>
                    <PlannerQaBadge badge={reviewQaSummary.badge} />
                  </dd>
                </div>
              ) : null}
              {reviewApprovalStatus ? (
                <div className="planner-review-decision-state">
                  <dt>Approval</dt>
                  <dd>
                    <span
                      className={`planner-approval-badge planner-approval-badge--${reviewApprovalStatus.state}`}
                    >
                      {reviewApprovalStatus.label}
                    </span>
                  </dd>
                </div>
              ) : null}
              {reviewLockStatus && reviewLockStatus.state !== "no-lock" ? (
                <div className="planner-review-decision-state">
                  <dt>Execution lock</dt>
                  <dd>
                    <span
                      className={`planner-lock-badge planner-lock-badge--${reviewLockStatus.state}`}
                    >
                      {reviewLockStatus.label}
                    </span>
                  </dd>
                </div>
              ) : null}
              {handoffReadiness ? (
                <div className="planner-review-decision-state">
                  <dt>Handoff</dt>
                  <dd>
                    <span
                      className={`planner-handoff-ready planner-handoff-ready--${handoffReadiness.ready ? "yes" : "no"}`}
                    >
                      {handoffReadiness.ready ? "Ready" : "Not ready"}
                    </span>
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="planner-review-hero-copy">
              Reviewing the current unsaved draft — save it from Create to track readiness
              and approval.
            </p>
          )}
          {planReadiness ? (
            <p className="planner-review-decision-next">
              <strong>Next:</strong>{" "}
              {planReadiness.blockers[0] ?? planReadiness.nextAction}
            </p>
          ) : null}
          {!handoffReadiness?.ready && handoffReadiness?.blockers[0] ? (
            <p className="planner-review-qa-blocker">{handoffReadiness.blockers[0]}</p>
          ) : null}
        </header>
        <div className="planner-review-main">
          <div className="planner-review-layout">
            {reviewQaSummary || reviewApproval?.blockers.length ? (
              <article className="targetlock-panel planner-review-qa-strip">
                <div className="targetlock-panel-title">
                  <h3>Planning QA</h3>
                  {reviewQaSummary ? (
                    <PlannerQaBadge badge={reviewQaSummary.badge} />
                  ) : null}
                </div>
                {reviewApproval?.blockers.map((b) => (
                  <p key={b} className="planner-review-qa-blocker">
                    {b}
                  </p>
                ))}
              </article>
            ) : null}
            <PlanReviewStep draft={reviewDraft} />
            <PlannerPreview planRecords={reviewDraft.planRecords} />
          </div>
        </div>
        <aside className="planner-review-sidebar">
          <PlannerReviewActionsPanel
            hole={selectedHole ?? null}
            library={library ?? { version: 1, activeHoleId: "", holes: [] }}
            onTabChange={setActiveTab}
            onOpenApprove={() => setApproveModalOpen(true)}
            onMarkActiveAndOpen={handleMarkActiveAndOpen}
            onOpenTargetLock={handleOpenTargetLock}
            onCreateRevision={() => {
              setRevisionSourceHoleId(selectedHoleId);
              setRevisionModalOpen(true);
            }}
            onArchive={handleArchiveSelectedPlan}
            onExportPackage={() => void handleExportHolePackage()}
          />
          {library && selectedHole ? (
            <PlannerLifecycleTimeline
              library={library}
              hole={selectedHole}
              onSelectHole={(id) => {
                setSelectedHoleId(id);
                setActiveTab("review");
              }}
            />
          ) : null}
          <PlannerHandoffChecklist
            hole={selectedHole ?? null}
            library={library ?? { version: 1, activeHoleId: "", holes: [] }}
            onMarkActiveAndOpen={handleMarkActiveAndOpen}
          />
          {selectedExecutionContext && selectedActualVsPlanned ? (
            <PlannerExecutionStatusPanel
              context={selectedExecutionContext}
              actualVsPlanned={selectedActualVsPlanned}
            />
          ) : null}
          {selectedHole &&
          selectedExecutionContext &&
          selectedActualVsPlanned ? (
            <PlannerExecutionAuditPanel
              hole={selectedHole}
              library={library ?? { version: 1, activeHoleId: "", holes: [] }}
              context={selectedExecutionContext}
              actualVsPlanned={selectedActualVsPlanned}
            />
          ) : null}
          {selectedHole &&
          (plannerStatus(selectedHole) === "active" ||
            plannerStatus(selectedHole) === "completed") ? (
            <PlannerCompletionPanel
              hole={selectedHole}
              onComplete={handleCompletePlan}
              onCreateRevision={() => {
                setRevisionSourceHoleId(selectedHoleId);
                setRevisionModalOpen(true);
              }}
            />
          ) : null}
          <PlannerRevisionPanel
            library={library ?? { version: 1, activeHoleId: "", holes: [] }}
            hole={selectedHole ?? null}
            onCreateRevision={(reason) => handleCreateRevision(reason)}
            onSelectHole={(id) => {
              setSelectedHoleId(id);
              setActiveTab("review");
            }}
          />
        </aside>
      </div>
    );
  };

  const renderMain = () => {
    if (!library) {
      return (
        <article className="targetlock-panel">
          <p className="targetlock-panel-copy">Loading planning library…</p>
        </article>
      );
    }

    switch (activeTab) {
      case "coordinates":
        return (
          <PlannerCoordinatesView
            library={library}
            programId={selectedProgramId}
            selectedHoleId={selectedHoleId}
            onSaveProjectCoordinates={handleSaveProjectCoordinates}
            onSelectHole={(holeId) => {
              setSelectedHoleId(holeId);
            }}
            onOpenReview={(holeId) => {
              setSelectedHoleId(holeId);
              setActiveTab("review");
            }}
            onImportPlanned={handleImportPlanned}
          />
        );
      case "plans":
        return (
          <PlannerPlansView
            library={library}
            selectedHoleId={selectedHoleId}
            qaReport={qaReport}
            onSelectHole={(holeId) => {
              setSelectedHoleId(holeId);
              setActiveTab("review");
            }}
            onAction={handlePlanAction}
            onCreateStandard={handleNewPlan}
            onCreateDaughter={handleNewDaughterPlan}
            onImportPlanned={handleImportPlanned}
            onLoadDemo={handleLoadDemoProgram}
          />
        );
      case "program":
        return (
          <PlannerProgramView
            library={library}
            selectedProgramId={selectedProgramId}
            qaReport={qaReport}
            selectedHoleId={selectedHoleId}
            onSaveProjectCoordinates={handleSaveProjectCoordinates}
            onOpenReview={(holeId) => {
              setSelectedHoleId(holeId);
              setActiveTab("review");
            }}
          />
        );
      case "map":
        return (
          <PlannerMapView
            library={library}
            selectedProgramId={selectedProgramId}
            selectedHoleId={selectedHoleId}
            qaReport={qaReport}
            highlightedClearancePair={highlightedClearancePair}
            onSelectHole={(id) => setSelectedHoleId(id || null)}
            onOpenReview={(holeId) => {
              setSelectedHoleId(holeId);
              setActiveTab("review");
            }}
            onCreatePlan={handleNewPlan}
          />
        );
      case "scene3d":
        return (
          <Planner3DView
            library={library}
            selectedProgramId={selectedProgramId}
            selectedHoleId={selectedHoleId}
            qaReport={qaReport}
          />
        );
      case "qa":
        return (
          <PlannerQaView
            library={library}
            selectedProgramId={selectedProgramId}
            selectedHoleId={selectedHoleId}
            onSelectHole={(id) => {
              setSelectedHoleId(id);
              setActiveTab("review");
            }}
            onViewOnMap={handleViewClearanceOnMap}
            onSaveQaSettings={handleSaveQaSettings}
          />
        );
      case "create":
        return renderCreateTab();
      case "review":
        return renderReviewTab();
      case "methodology":
        return <PlannerMethodologyView library={library} />;
      case "package":
        return (
          <>
            <PlannerPackageView
              library={library}
              programId={selectedProgramId}
              programName={
                library.holes.find((h) => h.plannerMeta?.programId === selectedProgramId)
                  ?.plannerMeta?.programName ?? null
              }
              selectedHoleId={selectedHoleId}
              onExportProgramPackage={handleExportProgramPackage}
              onExportProgramPdf={handleExportProgramPdf}
              onExportProgramTxt={handleExportProgramTxt}
              onExportHolePdf={() => void handleExportHolePdf()}
              onExportHoleTxt={handleExportHoleTxt}
              onExportHoleCsv={(id) => handleExportCsv(id)}
              onExportHolePackage={() => void handleExportHolePackage()}
              onExportExecutionPackage={handleExportExecutionPackage}
            />
            {library && selectedHoleId ? (
              <PlannerReportPreview
                mode="hole"
                library={library}
                holeId={selectedHoleId}
              />
            ) : null}
            {library && selectedProgramId ? (
              <PlannerReportPreview
                mode="program"
                library={library}
                programId={selectedProgramId}
              />
            ) : null}
          </>
        );
      default:
        return null;
    }
  };

  const showWizardFooter = activeTab === "create";

  return (
    <PlannerShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      library={library}
      hydrated={hydrated}
      selectedProgramId={selectedProgramId}
      onSelectProgram={setSelectedProgramId}
      selectedHoleId={selectedHoleId}
      statusMessage={statusMessage}
      qaRiskCount={qaReport?.programSummary.riskCount ?? 0}
      qaReport={qaReport}
      onOpenGuide={plannerGuide.start}
      footer={
        showWizardFooter ? (
          <>
            <button
              type="button"
              className="targetlock-btn targetlock-btn-secondary"
              disabled={stepIndex <= 0}
              onClick={goBack}
            >
              Back
            </button>
            <div className="planner-footer-status">
              {statusMessage ? (
                <span className="planner-status-message" role="status">
                  {statusMessage}
                </span>
              ) : null}
              {step !== "publish" && step !== "review" ? (
                <button
                  type="button"
                  className="targetlock-btn targetlock-btn-primary"
                  onClick={() => {
                    if (step === "generate") {
                      handleGenerate();
                    } else {
                      goNext();
                    }
                  }}
                >
                  {step === "generate" ? "Generate" : "Next"}
                </button>
              ) : step === "review" ? (
                <button
                  type="button"
                  className="targetlock-btn targetlock-btn-primary"
                  onClick={() => setStep("publish")}
                >
                  Continue to publish
                </button>
              ) : null}
            </div>
          </>
        ) : null
      }
    >
      {renderMain()}
      <PlannerGuideTour
        active={plannerGuide.active}
        step={plannerGuide.currentStep}
        stepIndex={plannerGuide.stepIndex}
        stepCount={plannerGuide.stepCount}
        onPrev={plannerGuide.prev}
        onNext={plannerGuide.next}
        onExit={plannerGuide.exit}
        onRestart={plannerGuide.restart}
      />
      {library ? (
        <PlannerImportAssistant
          library={library}
          open={importAssistantOpen}
          onClose={() => setImportAssistantOpen(false)}
          onImported={(nextLib, programId) => {
            persistLibrary(nextLib);
            setSelectedProgramId(programId);
            setActiveTab("plans");
            setStatusMessage("Imported planner program.");
          }}
        />
      ) : null}
      {selectedHole && library && approveModalOpen ? (
        <PlannerApproveModal
          open={approveModalOpen}
          hole={selectedHole}
          library={library}
          onClose={() => setApproveModalOpen(false)}
          onApprove={handleApprovePlan}
        />
      ) : null}
      {revisionModalOpen && library ? (
        <PlannerRevisionModal
          open={revisionModalOpen}
          holeName={
            findHole(library, revisionSourceHoleId ?? selectedHoleId ?? "")?.holeName ??
            "plan"
          }
          onClose={() => {
            setRevisionModalOpen(false);
            setRevisionSourceHoleId(null);
          }}
          onConfirm={(reason) => {
            handleCreateRevision(reason, revisionSourceHoleId ?? selectedHoleId ?? undefined);
            setRevisionSourceHoleId(null);
          }}
        />
      ) : null}
    </PlannerShell>
  );
}
