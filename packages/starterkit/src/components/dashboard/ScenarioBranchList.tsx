"use client";

import { ALL_BRANCH_PROGRAM_SCENARIOS } from "@/lib/drilling/branch-program-scenarios";

type Props = {
  onLoad: (scenarioId: string) => void;
};

function displayName(name: string): string {
  return name.replace(/^TEST · /, "");
}

export function ScenarioBranchList({ onLoad }: Props) {
  return (
    <div className="scenario-lab-builtin">
      <p className="scenario-lab-branch-lead">
        Mother hole + daughter branches for kickoff, DLS, separation, and Phase 2 planning
        workflow demos. Opens the Advanced <strong>Branch program</strong> tab.
      </p>
      <ul className="scenario-lab-card-grid" role="list">
        {ALL_BRANCH_PROGRAM_SCENARIOS.map((scenario) => (
          <li key={scenario.id}>
            <article className="scenario-lab-card">
              <h3 className="scenario-lab-card-title">{displayName(scenario.name)}</h3>
              <p className="scenario-lab-card-desc">{scenario.description}</p>
              <dl className="scenario-lab-card-meta">
                <div>
                  <dt>Insight</dt>
                  <dd>{scenario.expectedInsight}</dd>
                </div>
                <div>
                  <dt>Inspect</dt>
                  <dd>{scenario.inspect}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="targetlock-btn targetlock-btn-sm targetlock-btn-primary scenario-lab-card-action"
                onClick={() => onLoad(scenario.id)}
                aria-label={`Load branch scenario: ${displayName(scenario.name)}`}
              >
                Load scenario
              </button>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
