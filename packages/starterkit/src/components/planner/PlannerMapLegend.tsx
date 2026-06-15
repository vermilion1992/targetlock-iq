"use client";

import type { PlannerMapLayerToggle } from "@/lib/drilling/planner-spatial";

type Props = {
  toggles: PlannerMapLayerToggle;
  onChange: (patch: Partial<PlannerMapLayerToggle>) => void;
};

const TOGGLE_ITEMS: { key: keyof PlannerMapLayerToggle; label: string }[] = [
  { key: "standardHoles", label: "Standard holes" },
  { key: "daughterHoles", label: "Daughter holes" },
  { key: "archivedHoles", label: "Archived holes" },
  { key: "targets", label: "Targets" },
  { key: "labels", label: "Labels" },
  { key: "localGrid", label: "Local grid" },
];

export function PlannerMapLegend({ toggles, onChange }: Props) {
  return (
    <article className="targetlock-panel planner-map-legend">
      <div className="targetlock-panel-title">
        <h3>Layers</h3>
      </div>
      <ul className="planner-map-legend-toggles">
        {TOGGLE_ITEMS.map((item) => (
          <li key={item.key}>
            <label className="planner-map-toggle">
              <input
                type="checkbox"
                checked={toggles[item.key]}
                onChange={(e) => onChange({ [item.key]: e.target.checked })}
              />
              <span>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="planner-map-legend-symbols">
        <div className="planner-map-legend-item">
          <span className="planner-map-swatch planner-map-swatch--standard" />
          <span>Standard trace</span>
        </div>
        <div className="planner-map-legend-item">
          <span className="planner-map-swatch planner-map-swatch--daughter" />
          <span>Daughter trace</span>
        </div>
        <div className="planner-map-legend-item">
          <span className="planner-map-swatch planner-map-swatch--mother" />
          <span>Mother path</span>
        </div>
        <div className="planner-map-legend-item">
          <span className="planner-map-swatch planner-map-swatch--kickoff" />
          <span>Kickoff</span>
        </div>
        <div className="planner-map-legend-item">
          <span className="planner-map-swatch planner-map-swatch--target" />
          <span>Target</span>
        </div>
      </div>
    </article>
  );
}
