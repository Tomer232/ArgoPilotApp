// Calls to planner-service. Field names match its API (GET /v1/plots/{id}/plan).

import { getConfig } from "./config";
import { getJson, type Result } from "./http";

export type PlanDay = {
  date: string;
  et0_mm: number;
  rain_mm: number;
  kc: number;
  stage: string;
  need_mm: number;
  irrigation_mm: number;
  litres: number;
  run_minutes: number;
  bucket_capacity_mm: number;
  trigger_mm: number;
  bucket_end_mm: number;
  stale: boolean;
};

export type Plan = {
  plot_id: string;
  crop_id: string;
  soil_id: string;
  forecast_fetched_at: string;
  days: PlanDay[];
};

/** The plot's plan for the next 7 days (the planner's default), today first. */
export function getPlan(plotId: string): Promise<Result<Plan>> {
  const config = getConfig();
  const url = `${config.plannerUrl}/v1/plots/${encodeURIComponent(plotId)}/plan`;
  return getJson<Plan>("planner-service", url, config.plannerTimeoutSeconds);
}
