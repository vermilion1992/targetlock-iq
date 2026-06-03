import { SAMPLE_ACTUAL_CSV, SAMPLE_PLAN_CSV } from "@/lib/sample-data";
import { parseSurveyCsv } from "../csv";
import { buildStations } from "../desurvey";
import { defaultSampleTarget } from "../sample-target";

export const samplePlan = parseSurveyCsv(SAMPLE_PLAN_CSV);
export const sampleActual = parseSurveyCsv(SAMPLE_ACTUAL_CSV);
export const samplePlanStations = buildStations(samplePlan);
export const sampleActualStations = buildStations(sampleActual);

export const sampleTarget = defaultSampleTarget;
