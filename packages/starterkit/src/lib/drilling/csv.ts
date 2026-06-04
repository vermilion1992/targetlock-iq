import { parseSurveyCsvDetailed } from "./csv-import-assistant";
import type { SurveyRecord } from "./types";

export function parseSurveyCsv(text: string): SurveyRecord[] {
  return parseSurveyCsvDetailed(text).records;
}

export function surveysToCsv(
  rows: Pick<SurveyRecord, "md" | "dip" | "azimuth">[]
): string {
  return [
    "md,dip,azimuth",
    ...rows.map((r) => `${r.md},${r.dip.toFixed(1)},${r.azimuth.toFixed(1)}`),
  ].join("\n");
}
