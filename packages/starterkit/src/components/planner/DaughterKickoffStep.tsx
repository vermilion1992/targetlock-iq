"use client";

import { SettingsNumberField } from "@/components/dashboard/SettingsNumberField";
import { SettingsSelectField } from "@/components/dashboard/SettingsSelectField";
import { normalizePlannerCollar } from "@/lib/drilling/coordinate-system";
import { round } from "@/lib/drilling/format";
import type { PlannerDraft } from "@/lib/drilling/planner-types";
import type { SavedHoleProject } from "@/lib/drilling/storage";
import { PlannerStepCard } from "./PlannerStepCard";

type Props = {
  draft: PlannerDraft;
  motherHoles: SavedHoleProject[];
  onChange: (patch: Partial<PlannerDraft>) => void;
  onKickoffMdChange: (motherId: string, kickoffMd: number) => void;
};

export function DaughterKickoffStep({
  draft,
  motherHoles,
  onChange,
  onKickoffMdChange,
}: Props) {
  const kickoff = draft.daughterKickoff;
  const selectedMother = motherHoles.find((h) => h.holeId === kickoff?.motherHoleId);
  const motherMissingSurveys =
    selectedMother !== undefined && selectedMother.actualRecords.length === 0;
  const maxMd = selectedMother?.actualRecords.at(-1)?.md ?? 600;
  const motherCollar = selectedMother
    ? normalizePlannerCollar(selectedMother.plannerMeta?.collar)
    : undefined;
  const gridKickoff =
    kickoff && motherCollar
      ? {
          e: motherCollar.easting + kickoff.e,
          n: motherCollar.northing + kickoff.n,
          rl: motherCollar.elevation - kickoff.d,
        }
      : null;

  return (
    <PlannerStepCard
      kicker="Branch kickoff"
      title="Mother + kickoff"
      copy="Kickoff is calculated from the mother hole actual survey path, not the plan. Resolved kickoff coordinates feed the daughter target step."
      className="planner-coordinate-step"
    >
      {motherHoles.length === 0 ? (
        <p className="planner-warning-banner" role="status">
          No mother holes in the library. Create or load a mother hole in the TargetLock
          dashboard first, then return here.
        </p>
      ) : null}

      <fieldset className="targetlock-settings-form-group">
        <legend>Kickoff selection</legend>
        <div className="targetlock-settings-form-grid targetlock-settings-form-grid--2">
          <SettingsSelectField
            label="Mother hole"
            value={kickoff?.motherHoleId ?? ""}
            onChange={(motherId) => {
              const hole = motherHoles.find((h) => h.holeId === motherId);
              if (!hole) return;
              const defaultMd = hole.actualRecords.at(-1)?.md
                ? Math.round(hole.actualRecords.at(-1)!.md * 0.7)
                : 300;
              onKickoffMdChange(hole.holeId, defaultMd);
            }}
          >
            <option value="">Select mother hole…</option>
            {motherHoles.map((hole) => (
              <option key={hole.holeId} value={hole.holeId}>
                {hole.holeName}
                {hole.actualRecords.length ? "" : " (no actual surveys)"}
              </option>
            ))}
          </SettingsSelectField>
          <SettingsNumberField
            label="Kickoff MD"
            unit="m"
            value={kickoff?.kickoffMd ?? 0}
            min={0}
            max={maxMd}
            step={1}
            disabled={!kickoff?.motherHoleId}
            onChange={(v) => {
              if (!kickoff?.motherHoleId) return;
              onKickoffMdChange(kickoff.motherHoleId, v);
            }}
          />
        </div>
      </fieldset>

      {motherMissingSurveys ? (
        <p className="planner-warning-banner" role="status">
          Mother actual path is missing — kickoff cannot be resolved from surveys. Import or
          record mother actual surveys before planning the daughter leg.
        </p>
      ) : null}

      {kickoff ? (
        <fieldset className="targetlock-settings-form-group">
          <legend>Resolved kickoff</legend>
          <dl className="planner-kickoff-preview">
            <div>
              <dt>Resolved kickoff local E / N / D</dt>
              <dd>
                {round(kickoff.e, 1)} / {round(kickoff.n, 1)} / {round(kickoff.d, 1)} m
              </dd>
            </div>
            <div>
              <dt>Kickoff dip / azimuth</dt>
              <dd>
                {round(kickoff.dip, 1)}° / {round(kickoff.azimuth, 1)}°
              </dd>
            </div>
            {gridKickoff ? (
              <div>
                <dt>Resolved kickoff grid E / N / RL</dt>
                <dd>
                  E {round(gridKickoff.e, 1)} / N {round(gridKickoff.n, 1)} / RL{" "}
                  {round(gridKickoff.rl, 1)} m
                </dd>
              </div>
            ) : (
              <div>
                <dt>Grid kickoff</dt>
                <dd>— (mother collar grid coordinates not set)</dd>
              </div>
            )}
          </dl>
        </fieldset>
      ) : null}
    </PlannerStepCard>
  );
}
