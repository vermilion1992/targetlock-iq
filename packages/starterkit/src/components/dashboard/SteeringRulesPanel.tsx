"use client";

import { useState } from "react";
import { InfoTip } from "@/components/layout/InfoTip";
import { TargetLockFormCard } from "@/components/targetlock/TargetLockFormCard";
import { SettingsNumberField } from "@/components/dashboard/SettingsNumberField";
import {
  DEFAULT_STEERING_RULES,
  mergeSteeringRules,
  normalizeSteeringRule,
  type SteeringRule,
  type SteeringRuleAction,
  type SteeringRuleCondition,
  type SteeringRuleGate,
  type SteeringSettings,
} from "@/lib/drilling/steering-settings";
import type { SteeringMethodId } from "@/lib/drilling/steering-types";

type Props = {
  settings: SteeringSettings;
  onChange: (next: SteeringSettings) => void;
};

const CONDITION_OPTIONS: { id: string; label: string; build: () => SteeringRuleCondition }[] = [
  { id: "combined_angle_gte", label: "Combined dip + azi off plan ≥ (°)", build: () => ({ type: "combined_angle_gte", valueDeg: 6 }) },
  { id: "dip_deviation_gte", label: "Dip off plan ≥ (°)", build: () => ({ type: "dip_deviation_gte", valueDeg: 4 }) },
  { id: "azi_deviation_gte", label: "Azimuth off plan ≥ (°)", build: () => ({ type: "azi_deviation_gte", valueDeg: 4 }) },
  { id: "plan_offset_gte", label: "Plan offset ≥ (m)", build: () => ({ type: "plan_offset_gte", valueM: 4 }) },
  { id: "projected_miss_gt_tolerance", label: "Projected miss outside tolerance", build: () => ({ type: "projected_miss_gt_tolerance" }) },
  { id: "miss_gte_tolerance_multiple", label: "Miss ≥ N × tolerance", build: () => ({ type: "miss_gte_tolerance_multiple", multiplier: 2 }) },
  { id: "projected_miss_gte", label: "Projected miss ≥ (m)", build: () => ({ type: "projected_miss_gte", valueM: 8 }) },
  { id: "required_dls_gt_max", label: "Required DLS exceeds configured max", build: () => ({ type: "required_dls_gt_max" }) },
  { id: "required_dls_gte", label: "Required DLS ≥ (°/30 m)", build: () => ({ type: "required_dls_gte", valueDls: 2.5 }) },
  { id: "no_steering_gear_available", label: "Needs navi but motor/DeviDrill off site", build: () => ({ type: "no_steering_gear_available" }) },
  { id: "outside_corridor", label: "Outside plan corridor", build: () => ({ type: "outside_corridor" }) },
  { id: "classification_watch", label: "Classification ≥ Watch", build: () => ({ type: "classification_at_least", level: "watch" }) },
  { id: "classification_correction", label: "Classification ≥ Correction", build: () => ({ type: "classification_at_least", level: "correction" }) },
  { id: "classification_steering", label: "Classification ≥ Steering", build: () => ({ type: "classification_at_least", level: "steering" }) },
  { id: "classification_risk", label: "Classification ≥ At risk", build: () => ({ type: "classification_at_least", level: "risk" }) },
];

const GATE_OPTIONS: { id: string; label: string; build: () => SteeringRuleGate }[] = [
  { id: "any", label: "At any depth", build: () => ({ type: "any" }) },
  { id: "first_m", label: "In first (m) of hole", build: () => ({ type: "first_m", valueM: 150 }) },
  { id: "remaining_gt", label: "More than (m) to target", build: () => ({ type: "remaining_gt", valueM: 100 }) },
  { id: "remaining_lte", label: "At most (m) to target", build: () => ({ type: "remaining_lte", valueM: 60 }) },
  { id: "above_md", label: "Above MD (m)", build: () => ({ type: "above_md", valueM: 200 }) },
  { id: "below_md", label: "Below MD (m)", build: () => ({ type: "below_md", valueM: 500 }) },
];

const ACTION_OPTIONS: { id: SteeringRuleAction; label: string; short: string }[] = [
  { id: "hold", label: "Hold — continue per plan", short: "Hold" },
  { id: "watch", label: "Watch — monitor closely", short: "Watch" },
  { id: "correct_now", label: "Correct now", short: "Correct" },
  { id: "steering_review", label: "Steering review", short: "Steering" },
  { id: "wedge_branch_review", label: "Wedge / branch review", short: "Wedge" },
  { id: "supervisor_review", label: "Supervisor review — stop ahead", short: "Supervisor" },
];

const METHOD_OPTIONS: { id: SteeringMethodId; label: string }[] = [
  { id: "natural", label: "Natural" },
  { id: "parameter", label: "Parameter" },
  { id: "motor_navi", label: "Motor / Navi" },
  { id: "devidrill", label: "DeviDrill" },
  { id: "wedge_branch", label: "Wedge / branch" },
];

const ACTION_CLASS: Record<SteeringRuleAction, string> = {
  hold: "rule-action-hold",
  watch: "rule-action-watch",
  correct_now: "rule-action-correct",
  steering_review: "rule-action-steer",
  wedge_branch_review: "rule-action-wedge",
  supervisor_review: "rule-action-supervisor",
};

function conditionTypeId(c: SteeringRuleCondition): string {
  if (c.type === "classification_at_least") return `classification_${c.level}`;
  return c.type;
}

function gateTypeId(g: SteeringRuleGate): string {
  return g.type;
}

function conditionValueField(rule: SteeringRule): number | undefined {
  const c = rule.condition;
  if (c.type === "plan_offset_gte") return c.valueM;
  if (c.type === "projected_miss_gte") return c.valueM;
  if (c.type === "required_dls_gte") return c.valueDls;
  if (c.type === "dip_deviation_gte") return c.valueDeg;
  if (c.type === "azi_deviation_gte") return c.valueDeg;
  if (c.type === "combined_angle_gte") return c.valueDeg;
  if (c.type === "miss_gte_tolerance_multiple") return c.multiplier;
  return undefined;
}

function gateValueField(rule: SteeringRule): number | undefined {
  const g = rule.gate;
  if (g.type === "any") return undefined;
  return g.valueM;
}

function setConditionValue(rule: SteeringRule, value: number): SteeringRule {
  const c = rule.condition;
  if (c.type === "plan_offset_gte") return { ...rule, condition: { ...c, valueM: value } };
  if (c.type === "projected_miss_gte") return { ...rule, condition: { ...c, valueM: value } };
  if (c.type === "required_dls_gte") return { ...rule, condition: { ...c, valueDls: value } };
  if (c.type === "dip_deviation_gte") return { ...rule, condition: { ...c, valueDeg: value } };
  if (c.type === "azi_deviation_gte") return { ...rule, condition: { ...c, valueDeg: value } };
  if (c.type === "combined_angle_gte") return { ...rule, condition: { ...c, valueDeg: value } };
  if (c.type === "miss_gte_tolerance_multiple") return { ...rule, condition: { ...c, multiplier: value } };
  return rule;
}

function setGateValue(rule: SteeringRule, value: number): SteeringRule {
  const g = rule.gate;
  if (g.type === "any") return rule;
  return { ...rule, gate: { ...g, valueM: value } as SteeringRuleGate };
}

export function formatRuleSentence(rule: SteeringRule): string {
  const cond = CONDITION_OPTIONS.find((o) => o.id === conditionTypeId(rule.condition));
  const gate = GATE_OPTIONS.find((o) => o.id === gateTypeId(rule.gate));
  const action = ACTION_OPTIONS.find((o) => o.id === rule.action);
  const cv = conditionValueField(rule);
  const gv = gateValueField(rule);
  let condText = cond?.label ?? "—";
  if (cv != null) {
    condText = condText
      .replace(" (m)", ` ${cv} m`)
      .replace(" (°)", ` ${cv}°`)
      .replace(" (°/30 m)", ` ${cv}°/30 m`)
      .replace("N × tolerance", `${cv}× tolerance`);
  }
  const gateText = gv != null ? `${gate?.label ?? ""} ${gv}`.trim() : gate?.label ?? "—";
  return `${condText} · ${gateText} → ${action?.short ?? rule.action}`;
}

function defaultRuleFor(id: string): SteeringRule | undefined {
  const def = DEFAULT_STEERING_RULES.find((r) => r.id === id);
  return def ? { ...def } : undefined;
}

function RuleTile({
  rule,
  index,
  selected,
  onSelect,
  onUpdate,
}: {
  rule: SteeringRule;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<SteeringRule>) => void;
}) {
  return (
    <article
      className={`targetlock-settings-rule-tile ${rule.enabled ? "" : "targetlock-settings-rule-tile--off"} ${selected ? "targetlock-settings-rule-tile--selected" : ""}`}
    >
      <div className="targetlock-settings-rule-tile-face">
        <label
          className="targetlock-settings-rule-tile-enable"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={rule.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            aria-label={`Enable rule ${rule.label}`}
          />
        </label>
        <button
          type="button"
          className="targetlock-settings-rule-tile-trigger"
          onClick={onSelect}
          aria-expanded={selected}
          aria-controls={selected ? "targetlock-settings-rule-editor" : undefined}
        >
          <span className="targetlock-settings-rule-tile-index">#{index + 1}</span>
          <span className={`targetlock-settings-rule-tile-action ${ACTION_CLASS[rule.action]}`}>
            {ACTION_OPTIONS.find((a) => a.id === rule.action)?.short ?? rule.action}
          </span>
          <span className="targetlock-settings-rule-tile-name">{rule.label || "Untitled rule"}</span>
          <span className="targetlock-settings-rule-tile-sentence">{formatRuleSentence(rule)}</span>
        </button>
      </div>
    </article>
  );
}

function RuleEditor({
  rule,
  index,
  onUpdate,
  onReset,
  onClose,
}: {
  rule: SteeringRule;
  index: number;
  onUpdate: (patch: Partial<SteeringRule>) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <section
      id="targetlock-settings-rule-editor"
      className="targetlock-settings-rule-editor"
      aria-label={`Edit rule ${rule.label}`}
    >
      <header className="targetlock-settings-rule-editor-head">
        <div>
          <p className="targetlock-settings-rule-editor-kicker">Editing rule #{index + 1}</p>
          <h4 className="targetlock-settings-rule-editor-title">{rule.label || "Untitled rule"}</h4>
          <p className="targetlock-settings-rule-editor-summary">{formatRuleSentence(rule)}</p>
        </div>
        <div className="targetlock-settings-rule-editor-head-actions">
          <span className={`targetlock-settings-rule-tile-action ${ACTION_CLASS[rule.action]}`}>
            {ACTION_OPTIONS.find((a) => a.id === rule.action)?.short ?? rule.action}
          </span>
          <button type="button" className="targetlock-btn targetlock-btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </header>

      <div className="targetlock-settings-rule-editor-body">
        <fieldset className="targetlock-settings-form-group">
          <legend>Rule details</legend>
          <label className="targetlock-settings-text-field">
            <span className="targetlock-settings-field-label">Rule name</span>
            <div className="targetlock-settings-field-control targetlock-settings-field-control--text">
              <input
                type="text"
                className="targetlock-settings-text-input"
                value={rule.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
              />
            </div>
          </label>
        </fieldset>

        <fieldset className="targetlock-settings-form-group">
          <legend>Condition</legend>
          <div className="targetlock-settings-rule-flow">
          <div className="targetlock-settings-rule-flow-step">
            <span className="targetlock-settings-rule-flow-label">If</span>
            <select
              value={conditionTypeId(rule.condition)}
              onChange={(e) => {
                const opt = CONDITION_OPTIONS.find((o) => o.id === e.target.value);
                if (opt) onUpdate({ condition: opt.build() });
              }}
            >
              {CONDITION_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            {conditionValueField(rule) != null ? (
              <input
                type="number"
                step={0.1}
                className="targetlock-settings-rule-value"
                value={conditionValueField(rule)}
                onChange={(e) => onUpdate(setConditionValue(rule, Number(e.target.value)))}
              />
            ) : null}
          </div>
          <div className="targetlock-settings-rule-flow-step">
            <span className="targetlock-settings-rule-flow-label">Before</span>
            <select
              value={gateTypeId(rule.gate)}
              onChange={(e) => {
                const opt = GATE_OPTIONS.find((o) => o.id === e.target.value);
                if (opt) onUpdate({ gate: opt.build() });
              }}
            >
              {GATE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            {gateValueField(rule) != null ? (
              <input
                type="number"
                step={1}
                className="targetlock-settings-rule-value"
                value={gateValueField(rule)}
                onChange={(e) => onUpdate(setGateValue(rule, Number(e.target.value)))}
              />
            ) : null}
          </div>
          <div className="targetlock-settings-rule-flow-step">
            <span className="targetlock-settings-rule-flow-label">Then</span>
            <select
              value={rule.action}
              onChange={(e) => onUpdate({ action: e.target.value as SteeringRuleAction })}
            >
              {ACTION_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          </div>
        </fieldset>

        <fieldset className="targetlock-settings-form-group">
          <legend>Action &amp; messaging</legend>
          <label className="targetlock-settings-gear-row">
            <input
              type="checkbox"
              checked={rule.nextIntervalM != null}
              onChange={(e) =>
                onUpdate({ nextIntervalM: e.target.checked ? 15 : undefined })
              }
            />
            <span>Override next survey interval when this rule matches</span>
          </label>
          {rule.nextIntervalM != null ? (
            <SettingsNumberField
              label="Next interval override"
              unit="m"
              value={rule.nextIntervalM}
              min={5}
              max={60}
              step={1}
              onChange={(v) => onUpdate({ nextIntervalM: v })}
            />
          ) : null}
          <label className="targetlock-settings-text-field">
            <span className="targetlock-settings-field-label">Action plan message</span>
            <div className="targetlock-settings-field-control targetlock-settings-field-control--text">
              <input
                type="text"
                className="targetlock-settings-text-input"
                value={rule.message ?? ""}
                placeholder="Shown to drillers when this rule matches"
                onChange={(e) => onUpdate({ message: e.target.value })}
              />
            </div>
          </label>
        </fieldset>

        <fieldset className="targetlock-settings-form-group">
          <legend>Method filter</legend>
          <div className="targetlock-settings-methods">
          {METHOD_OPTIONS.map((m) => {
            const checked = rule.allowedMethods?.includes(m.id) ?? false;
            return (
              <label key={m.id}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const current = rule.allowedMethods ?? [];
                    const next = e.target.checked ? [...current, m.id] : current.filter((id) => id !== m.id);
                    onUpdate({ allowedMethods: next.length ? next : undefined });
                  }}
                />
                {m.label}
              </label>
            );
          })}
          </div>
        </fieldset>

        <div className="targetlock-btn-row">
          <button type="button" className="targetlock-btn targetlock-btn-sm" onClick={onReset}>
            Reset to default
          </button>
        </div>
      </div>
    </section>
  );
}

export function SteeringRulesPanel({ settings, onChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const updateRules = (rules: SteeringRule[]) => {
    onChange({ ...settings, rules: mergeSteeringRules(rules) });
  };

  const updateRule = (id: string, patch: Partial<SteeringRule>) => {
    updateRules(settings.rules.map((r) => (r.id === id ? normalizeSteeringRule({ ...r, ...patch }) : r)));
  };

  const resetRule = (id: string) => {
    const def = defaultRuleFor(id);
    if (!def) return;
    updateRules(settings.rules.map((r) => (r.id === id ? def : r)));
  };

  const resetAllRules = () => {
    setExpandedId(null);
    onChange({
      ...settings,
      rules: DEFAULT_STEERING_RULES.map((r) => ({ ...r })),
    });
  };

  const expandedIndex = expandedId ? settings.rules.findIndex((r) => r.id === expandedId) : -1;
  const expandedRule = expandedIndex >= 0 ? settings.rules[expandedIndex] : null;

  return (
    <TargetLockFormCard
      kicker="Escalation playbooks"
      title="Steering rules"
      className="targetlock-settings-rules-card"
      actions={
        <button type="button" className="targetlock-btn targetlock-btn-sm" onClick={resetAllRules}>
          Reset all to defaults
        </button>
      }
    >
      <p className="targetlock-form-card-copy">
        {DEFAULT_STEERING_RULES.length} standard rules — first match wins.{" "}
        <InfoTip tip="Rules can escalate the action plan but never soften a worse geometric classification." />
      </p>

      <div className="targetlock-settings-rules-grid">
        {settings.rules.map((rule, index) => (
          <RuleTile
            key={rule.id}
            rule={rule}
            index={index}
            selected={expandedId === rule.id}
            onSelect={() => setExpandedId((id) => (id === rule.id ? null : rule.id))}
            onUpdate={(patch) => updateRule(rule.id, patch)}
          />
        ))}
      </div>

      {expandedRule ? (
        <RuleEditor
          rule={expandedRule}
          index={expandedIndex}
          onUpdate={(patch) => updateRule(expandedRule.id, patch)}
          onReset={() => resetRule(expandedRule.id)}
          onClose={() => setExpandedId(null)}
        />
      ) : null}
    </TargetLockFormCard>
  );
}
