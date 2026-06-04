"use client";

import { TEST_SCENARIOS } from "@/lib/drilling/test-scenarios";
import { canLoadBuiltInScenario } from "@/lib/drilling/workspace-action-contract";

type Props = {
  onLoad: (scenarioId: string) => void;
};

function displayScenarioName(name: string): string {
  return name.replace(/^TEST · /, "");
}

function demonstratesForScenario(scenario: (typeof TEST_SCENARIOS)[number]): string {
  if (scenario.kind === "invalid-import") {
    return scenario.expectedAction;
  }
  return scenario.inspect;
}

export function ScenarioBuiltInList({ onLoad }: Props) {
  return (
    <div className="scenario-lab-builtin">
      <ul className="scenario-lab-card-grid" role="list">
        {TEST_SCENARIOS.map((scenario) => {
          const loadable = canLoadBuiltInScenario(scenario);
          return (
          <li key={scenario.id}>
            <article className="scenario-lab-card">
              <h3 className="scenario-lab-card-title">{displayScenarioName(scenario.name)}</h3>
              <p className="scenario-lab-card-desc">{scenario.description}</p>
              <dl className="scenario-lab-card-meta">
                <div>
                  <dt>Expected outcome</dt>
                  <dd>{scenario.expectedStatus}</dd>
                </div>
                <div>
                  <dt>Demonstrates</dt>
                  <dd>{demonstratesForScenario(scenario)}</dd>
                </div>
              </dl>
              {scenario.kind === "invalid-import" ? (
                <p className="scenario-lab-card-note">
                  Download the CSV test pack and upload invalid-example.csv via Upload hole plan or
                  Survey results to see the Import Assistant validation messages.
                </p>
              ) : null}
              {loadable ? (
                <button
                  type="button"
                  className="targetlock-btn targetlock-btn-sm targetlock-btn-primary scenario-lab-card-action"
                  onClick={() => onLoad(scenario.id)}
                  aria-label={`Load scenario: ${displayScenarioName(scenario.name)}`}
                >
                  Load scenario
                </button>
              ) : (
                <p className="scenario-lab-card-note scenario-lab-card-action-hint">
                  Use <strong>Download CSV test pack</strong> in the footer, then import via the
                  sidebar Upload controls.
                </p>
              )}
            </article>
          </li>
        );
        })}
      </ul>
    </div>
  );
}
