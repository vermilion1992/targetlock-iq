"use client";

import { useEffect, useRef, useState } from "react";
import { ScenarioBuiltInList } from "@/components/dashboard/ScenarioBuiltInList";
import { ScenarioBranchList } from "@/components/dashboard/ScenarioBranchList";
import { ScenarioCustomBuilder } from "@/components/dashboard/ScenarioCustomBuilder";
import type { SyntheticHoleParams } from "@/lib/drilling/synthetic-hole-builder";
import { downloadCsvTestPack } from "@/lib/drilling/csv-test-pack";

type TabId = "builtin" | "custom" | "branch";

type Props = {
  open: boolean;
  onClose: () => void;
  onLoadScenario: (scenarioId: string) => Promise<boolean>;
  onLoadBranchScenario: (scenarioId: string) => Promise<boolean>;
  onGenerateScenario: (params: SyntheticHoleParams) => Promise<boolean>;
};

export function ScenarioLabModal({
  open,
  onClose,
  onLoadScenario,
  onLoadBranchScenario,
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

  const handleLoadScenario = async (scenarioId: string) => {
    if (await onLoadScenario(scenarioId)) onClose();
  };

  const handleLoadBranchScenario = async (scenarioId: string) => {
    if (await onLoadBranchScenario(scenarioId)) onClose();
  };

  const handleGenerateScenario = async (params: SyntheticHoleParams): Promise<boolean> => {
    const loaded = await onGenerateScenario(params);
    if (loaded) onClose();
    return loaded;
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
            <button
              type="button"
              role="tab"
              id="scenario-lab-tab-branch"
              aria-selected={tab === "branch"}
              aria-controls={tabPanelId("branch")}
              className={`tl-modal-segment${tab === "branch" ? " tl-modal-segment--active" : ""}`}
              onClick={() => setTab("branch")}
            >
              Branch programs
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
          <div
            role="tabpanel"
            id={tabPanelId("branch")}
            aria-labelledby="scenario-lab-tab-branch"
            hidden={tab !== "branch"}
          >
            {tab === "branch" ? (
              <ScenarioBranchList onLoad={handleLoadBranchScenario} />
            ) : null}
          </div>
        </div>
        <footer className="tl-modal-footer">
          <button
            type="button"
            className="targetlock-btn targetlock-btn-sm"
            onClick={() => downloadCsvTestPack()}
          >
            Download CSV test pack
          </button>
          <button type="button" className="targetlock-btn" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
