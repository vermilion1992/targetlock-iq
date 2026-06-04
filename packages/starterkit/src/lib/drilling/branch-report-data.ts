import {
  analyzeDaughterBranch,
  kickoffStationFromMother,
  methodLabel,
  rankKickoffOptionsWithSeparation,
  requiredDaughterHeading,
  topKickoffComparisons,
} from "./branch-program";
import { branchPlanValidationStatus } from "./branch-program-approval";
import { daughterContextLine } from "./branch-program-library";
import type { BranchProgram, DaughterHole } from "./branch-program-types";
import { estimateToolface, TOOLFACE_DISCLAIMER } from "./branch-toolface";
import {
  formatAssumptionsSummary,
  normalizeCapabilityAssumptions,
  type CapabilityAssumptions,
} from "./capability-assumptions";
import { buildStations } from "./desurvey";
import { round } from "./format";
import { PDF_APP_VERSION } from "./pdf-brand";
import type { SavedHoleProject } from "./storage";

export type BranchReportSection = {
  id: string;
  title: string;
  lines: string[];
};

export type BranchReportData = {
  filename: string;
  reportType: "Branch Plan";
  appVersion: string;
  title: string;
  holeName: string;
  siteName: string | null;
  daughterId: string;
  generatedAt: Date;
  daughterContext: string | null;
  trajectoryImagePng: string | null;
  logoImagePng: string | null;
  summaryTarget: string;
  summaryKickoffMd: string;
  summaryRequiredDls: string;
  summarySeparation: string;
  summaryApproval: string;
  summaryKickoffLines: string[];
  summaryToolfaceOneLiner: string | null;
  sections: BranchReportSection[];
  disclaimer: string;
};

export type BranchReportOptions = {
  program: BranchProgram;
  daughter: DaughterHole;
  motherHole?: SavedHoleProject | null;
  daughterHole?: SavedHoleProject | null;
  recoveryAssumptions: CapabilityAssumptions;
  trajectoryImagePng?: string | null;
  logoImagePng?: string | null;
};

export function branchReportFilename(daughterId: string, date = new Date()): string {
  const d = date.toISOString().slice(0, 10);
  return `branch-plan-${daughterId.replace(/\s+/g, "-")}-${d}.pdf`;
}

export function buildBranchReportData(opts: BranchReportOptions): BranchReportData {
  const { program, daughter, motherHole, daughterHole, recoveryAssumptions } = opts;
  const motherStations = buildStations(program.mother.actualRecords);
  const analysis = analyzeDaughterBranch(
    program.mother.actualRecords,
    daughter,
    program.targets,
    motherStations
  );
  const target = analysis.target;
  const defaults = program.persisted?.kickoffPlannerDefaults ?? program.kickoffWindow;
  const ranked =
    target && defaults
      ? rankKickoffOptionsWithSeparation(
          program.mother.actualRecords,
          target,
          defaults.mdMin,
          defaults.mdMax,
          defaults.stepM,
          {
            motherStations,
            siblingPlanRecords: program.daughters
              .filter((d) => d.daughterHoleId !== daughter.daughterHoleId)
              .map((d) => d.planRecords),
            preferredMethod: program.persisted?.kickoffPlannerDefaults?.preferredMethod,
          }
        )
      : [];
  const top3 = topKickoffComparisons(ranked);
  const validation = branchPlanValidationStatus(daughter.approval, {
    kickoffMd: daughter.kickoffMd,
    assumptions: recoveryAssumptions,
    planHash: JSON.stringify(daughter.planRecords.map((r) => [r.md, r.dip, r.azimuth])),
  });

  const contextLine =
    (daughterHole && daughterContextLine(daughterHole)) ||
    `Daughter of ${program.mother.holeId}, kicked off at MD ${Math.round(daughter.kickoffMd)} m`;

  const sections: BranchReportSection[] = [
    {
      id: "overview",
      title: "Program overview",
      lines: [
        `Program: ${program.name}`,
        `Site: ${program.site || "—"}`,
        `Mother: ${program.mother.holeId}`,
        `Daughters in program: ${program.daughters.length}`,
        `Targets: ${program.targets.length}`,
      ],
    },
    {
      id: "mother",
      title: "Mother actual trajectory summary",
      lines: [
        `Latest mother MD: ${
          motherStations.length
            ? `${round(motherStations[motherStations.length - 1]!.md, 0)} m`
            : "—"
        }`,
        `Survey count: ${program.mother.actualRecords.length}`,
      ],
    },
    {
      id: "daughter",
      title: "Selected daughter and target",
      lines: [
        contextLine,
        `Daughter ID: ${daughter.daughterId}`,
        `Target: ${target?.label ?? daughter.targetId}`,
        `Kickoff MD: ${round(daughter.kickoffMd, 0)} m`,
        `Method: ${methodLabel(daughter.method)}`,
        `Status: ${daughter.status}`,
      ],
    },
    {
      id: "kickoff-compare",
      title: "Kickoff options compared",
      lines: ranked.slice(0, 8).map(
        (r) =>
          `MD ${round(r.kickoffMd, 0)} · DLS ${round(r.requiredDls, 1)}°/30 m · dir ${round(r.directionalM, 0)} m · mother sep ${round(r.motherSeparationM ?? 0, 1)} m · sibling sep ${round(r.siblingSeparationM ?? 999, 1)} m · ${r.feasibility}`
      ),
    },
    {
      id: "approved",
      title: "Approved branch plan",
      lines:
        validation.state === "validated"
          ? [
              `Approved by ${daughter.approval!.approvedBy} (${daughter.approval!.role})`,
              `Approved kickoff MD: ${round(daughter.approval!.approvedKickoffMd, 0)} m`,
              `Approved at: ${daughter.approval!.approvedAt}`,
            ]
          : validation.state === "stale"
            ? [
                "WARNING: Current plan or assumptions differ from approval.",
                validation.detail,
              ]
            : ["Draft — not formally approved.", validation.detail],
    },
    {
      id: "heading",
      title: "Required heading and DLS",
      lines: [
        `Required DLS: ${round(analysis.requiredDls, 1)}°/30 m`,
        `Method suitability: ${analysis.methodSuitability}`,
      ],
    },
    {
      id: "assumptions",
      title: "Method and capability assumptions",
      lines: formatAssumptionsSummary(normalizeCapabilityAssumptions(recoveryAssumptions)),
    },
    {
      id: "separation",
      title: "Separation review",
      lines: analysis.separation
        ? [
            `Min separation (mother): ${round(analysis.separation.minDistanceM, 1)} m`,
            `Status: ${analysis.separation.status}`,
            `Closest approach MD: ${round(analysis.separation.closestApproachMd, 0)} m`,
          ]
        : ["Separation not computed — insufficient surveys."],
    },
    {
      id: "toolface",
      title: "Toolface estimate (planning)",
      lines: (() => {
        const kickoff = kickoffStationFromMother(program.mother.actualRecords, daughter.kickoffMd);
        if (!kickoff || !target) return ["Toolface not available — missing kickoff or target."];
        const heading = requiredDaughterHeading(kickoff, target);
        const tf = estimateToolface(kickoff, heading.dip, heading.azimuth);
        return [
          `Build/drop: ${round(tf.buildDropDeg, 1)}°`,
          `Left/right turn: ${round(tf.leftRightTurnDeg, 1)}°`,
          `Est. toolface: ${round(tf.toolfaceDeg, 0)}°`,
          tf.nearVertical ? "Near-vertical — toolface less stable." : "",
          TOOLFACE_DISCLAIMER,
        ].filter(Boolean);
      })(),
    },
    {
      id: "approval",
      title: "Approval and sign-off",
      lines: daughter.approval
        ? [
            `${daughter.approval.approvedBy} · ${daughter.approval.role}`,
            daughter.approval.notes ? `Notes: ${daughter.approval.notes}` : "",
            `Validation: ${validation.label}`,
          ].filter(Boolean)
        : ["No approval on file."],
    },
  ];

  if (top3) {
    sections[3]!.lines.push(
      "",
      `Best control: MD ${round(top3.bestControl.kickoffMd, 0)}`,
      `Shortest path: MD ${round(top3.shortestPath.kickoffMd, 0)}`,
      `Lowest dogleg: MD ${round(top3.lowestDogleg.kickoffMd, 0)}`
    );
  }

  if (motherHole?.holeName) {
    sections[0]!.lines.unshift(`Mother hole name: ${motherHole.holeName}`);
  }

  return {
    filename: branchReportFilename(daughter.daughterId),
    reportType: "Branch Plan",
    appVersion: PDF_APP_VERSION,
    title: `Branch plan — ${daughter.daughterId}`,
    holeName: program.mother.holeId,
    siteName: program.site?.trim() || null,
    daughterId: daughter.daughterId,
    generatedAt: new Date(),
    daughterContext: contextLine,
    trajectoryImagePng: opts.trajectoryImagePng ?? null,
    logoImagePng: opts.logoImagePng ?? null,
    summaryTarget: target?.label ?? daughter.targetId,
    summaryKickoffMd: `${round(daughter.kickoffMd, 0)} m`,
    summaryRequiredDls: `${round(analysis.requiredDls, 1)}°/30 m`,
    summarySeparation: analysis.separation
      ? `${round(analysis.separation.minDistanceM, 1)} m — ${analysis.separation.status}`
      : "Not computed",
    summaryApproval:
      validation.state === "validated"
        ? `Approved by ${daughter.approval!.approvedBy} (${daughter.approval!.role})`
        : validation.state === "stale"
          ? "WARNING: Approval stale — plan or assumptions changed"
          : "Draft — not formally approved",
    summaryKickoffLines: sections.find((s) => s.id === "kickoff-compare")?.lines.slice(0, 4) ?? [],
    summaryToolfaceOneLiner: (() => {
      const tfSection = sections.find((s) => s.id === "toolface");
      const line = tfSection?.lines.find((l) => l.startsWith("Est. toolface:"));
      return line ?? tfSection?.lines[0] ?? null;
    })(),
    sections,
    disclaimer:
      "Planning estimate only. Kickoff depth, required dogleg, separation, and toolface must be confirmed by the directional drilling contractor and site geologist before drilling a daughter hole. Not field instruction.",
  };
}
