import { CSV_IMPORT_TEMPLATES } from "./csv-import-assistant";
import { findScenario } from "./test-scenarios";
import { SAMPLE_ACTUAL_CSV, SAMPLE_PLAN_CSV } from "@/lib/sample-data";

/** Representative daughter survey leg for pilot CSV test pack. */
const BRANCH_DAUGHTER_SURVEY_CSV = `hole_id,md_m,dip_deg,azimuth_deg
DDH-0247A,450,-62.5,128.0
DDH-0247A,480,-63.0,129.5
DDH-0247A,510,-63.8,131.0
DDH-0247A,540,-64.5,132.8
DDH-0247A,570,-65.2,134.5
DDH-0247A,600,-66.0,136.0`;

export type CsvTestPackFile = {
  filename: string;
  content: string;
  description: string;
};

export function getCsvTestPackFiles(): CsvTestPackFile[] {
  const onPlan = findScenario("on-plan");
  const drift = findScenario("gradual-drift");
  const invalid = findScenario("invalid-import");

  return [
    {
      filename: "on-plan-hole-plan.csv",
      content: onPlan?.planCsv ?? SAMPLE_PLAN_CSV,
      description: "Valid planned trajectory (on-plan scenario)",
    },
    {
      filename: "on-plan-survey.csv",
      content: onPlan?.actualCsv ?? SAMPLE_ACTUAL_CSV,
      description: "Valid actual surveys matching plan closely",
    },
    {
      filename: "drift-survey.csv",
      content: drift?.actualCsv ?? SAMPLE_ACTUAL_CSV,
      description: "Actual surveys with gradual drift off plan",
    },
    {
      filename: "invalid-example.csv",
      content:
        invalid?.invalidCsv ??
        "depth;inclination;bearing\n0;-60;125\n30;-59;126",
      description: "Malformed CSV (wrong delimiter, missing required columns)",
    },
    {
      filename: "branch-daughter-survey.csv",
      content: BRANCH_DAUGHTER_SURVEY_CSV,
      description: "Example daughter-hole survey CSV with hole_id column",
    },
    {
      filename: "targetlock-simple-template.csv",
      content: CSV_IMPORT_TEMPLATES.simplePlan,
      description: "Minimal md_m / dip_deg / azimuth_deg template",
    },
  ];
}

const TEST_PACK_README = `TargetLock IQ — CSV test pack (RC1 pilot)

Files in this pack:
- on-plan-hole-plan.csv — upload via Hole plan
- on-plan-survey.csv — upload via Survey results
- drift-survey.csv — drift scenario actual surveys
- invalid-example.csv — should fail validation in CSV Import Assistant
- branch-daughter-survey.csv — daughter leg example (use import target picker when branch loaded)
- targetlock-simple-template.csv — blank template format

Units: metres (MD), degrees (dip negative downward, azimuth clockwise from north).
`;

export function downloadCsvTestPack(): void {
  const files = getCsvTestPackFiles();
  let delay = 0;
  const trigger = (filename: string, content: string, mime: string) => {
    setTimeout(() => {
      const blob = new Blob([content], { type: `${mime};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, delay);
    delay += 200;
  };

  trigger("README-targetlock-csv-test-pack.txt", TEST_PACK_README, "text/plain");
  for (const f of files) {
    trigger(f.filename, f.content, "text/csv");
  }
}

export function downloadCsvTestPackFile(filename: string): void {
  const file = getCsvTestPackFiles().find((f) => f.filename === filename);
  if (!file) return;
  const blob = new Blob([file.content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.filename;
  a.click();
  URL.revokeObjectURL(url);
}
