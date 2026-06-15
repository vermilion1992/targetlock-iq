"use client";

import type { PlannerRelationshipNode } from "@/lib/drilling/planner-types";
import { PlannerStatusBadge } from "./PlannerStatusBadge";

type Props = {
  nodes: PlannerRelationshipNode[];
};

function TreeNode({ node }: { node: PlannerRelationshipNode }) {
  const isDaughter = node.planType === "daughter";
  return (
    <li className="planner-tree-node">
      <div className="planner-tree-node-row">
        <span
          className={`planner-tree-dot planner-tree-dot--${
            isDaughter ? "daughter" : "standard"
          }`}
          aria-hidden="true"
        />
        <span className="planner-tree-node-name">{node.holeName}</span>
        <span
          className={`planner-tree-node-type planner-tree-node-type--${
            isDaughter ? "daughter" : "standard"
          }`}
        >
          {isDaughter ? "Daughter" : "Standard"}
        </span>
        <PlannerStatusBadge status={node.status} />
        {node.warning ? (
          <span className="planner-tree-warning">{node.warning}</span>
        ) : null}
      </div>
      {node.children.length ? (
        <ul className="planner-tree-children">
          {node.children.map((child) => (
            <TreeNode key={child.holeId} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function PlannerRelationshipTree({ nodes }: Props) {
  if (!nodes.length) {
    return (
      <p className="targetlock-panel-copy">No holes in this program yet.</p>
    );
  }

  return (
    <ul className="planner-relationship-tree">
      {nodes.map((node) => (
        <TreeNode key={node.holeId} node={node} />
      ))}
    </ul>
  );
}
