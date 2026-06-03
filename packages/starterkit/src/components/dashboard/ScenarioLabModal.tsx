"use client";

import { useEffect, useRef, useState } from "react";
import { ScenarioBuiltInList } from "@/components/dashboard/ScenarioBuiltInList";
import { ScenarioCustomBuilder } from "@/components/dashboard/ScenarioCustomBuilder";
import type { SyntheticHoleParams } from "@/lib/drilling/synthetic-hole-builder";

type TabId = "builtin" | "custom";

type Props = {
  open: boolean;
  onClose: () => void;
  onLoadScenario: (scenarioId: string) => void;
  onGenerateScenario: (params: SyntheticHoleParams) => string;
};

export function ScenarioLabModal({
  open,
  onClose,
  onLoadScenario,
  onGenerateScenario,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<TabId>("builtin");

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleLoadScenario = (scenarioId: string) => {
    onLoadScenario(scenarioId);
    onClose();
  };

  const handleGenerateScenario = (params: SyntheticHoleParams) => {
    const message = onGenerateScenario(params);
    onClose();
    return message;
  };

  const tabPanelId = (id: TabId) => `scenario-lab-panel-${id}`;

  return (
    <div
      className="tl-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scenario-lab-modal-title"
      onClick={onClose}
    >
      <div
        className="tl-modal tl-modal--scenario-lab"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="tl-modal-header tl-modal-header--tabs">
          <div className="tl-modal-header-top">
            <div className="tl-modal-header-text">
              <h2 id="scenario-lab-modal-title">Scenario lab</h2>
              <p className="tl-modal-lead">
                Synthetic holes for training and validation — not live drilling records.
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              className="tl-modal-close"
              onClick={onClose}
              aria-label="Close scenario lab"
            >
              Close
            </button>
          </div>
          <div className="tl-modal-segmented" role="tablist" aria-label="Scenario lab sections">
            <button
              type="button"
              role="tab"
              id="scenario-lab-tab-builtin"
              aria-selected={tab === "builtin"}
              aria-controls={tabPanelId("builtin")}
              className={`tl-modal-segment${tab === "builtin" ? " tl-modal-segment--active" : ""}`}
              onClick={() => setTab("builtin")}
            >
              Built-in scenarios
            </button>
            <button
              type="button"
              role="tab"
              id="scenario-lab-tab-custom"
              aria-selected={tab === "custom"}
              aria-controls={tabPanelId("custom")}
              className={`tl-modal-segment${tab === "custom" ? " tl-modal-segment--active" : ""}`}
              onClick={() => setTab("custom")}
            >
              Custom scenario
            </button>
          </div>
        </header>

        <div className="tl-modal-body tl-modal-body--flush">
          <div
            role="tabpanel"
            id={tabPanelId("builtin")}
            aria-labelledby="scenario-lab-tab-builtin"
            hidden={tab !== "builtin"}
          >
            {tab === "builtin" ? (
              <ScenarioBuiltInList onLoad={handleLoadScenario} />
            ) : null}
          </div>
          <div
            role="tabpanel"
            id={tabPanelId("custom")}
            aria-labelledby="scenario-lab-tab-custom"
            hidden={tab !== "custom"}
          >
            {tab === "custom" ? (
              <ScenarioCustomBuilder onGenerate={handleGenerateScenario} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
