import { parseSurveyCsv } from "./csv";
import { buildStations } from "./desurvey";
import { planTargetFromStations } from "./recommendation";
import type { TargetConfig } from "./types";
import { SAMPLE_PLAN_CSV } from "@/lib/sample-data";

export function defaultSampleTarget(targetMd = 600): TargetConfig {
  const plan = parseSurveyCsv(SAMPLE_PLAN_CSV);
  const stations = buildStations(plan);
  const fromPlan = planTargetFromStations(stations, targetMd);
  return {
    ...(fromPlan ?? {
      md: targetMd,
      e: 0,
      n: 0,
      d: 0,
      tolerance: 6,
    }),
    maxDls: 3,
    nextInterval: 30,
  };
}
