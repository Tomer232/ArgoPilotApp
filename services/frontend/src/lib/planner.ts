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
  capped: boolean;
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
  start_pct: number;
  trigger_pct: number;
  crop_trigger_pct: number;
  drip_mm_per_hour: number;
  forecast_fetched_at: string;
  days: PlanDay[];
};

/**
 * The plot's plan for the next 7 days (the planner's default), today first.
 * `startPct` (soil level) and `triggerPct` are what the grower chose, passed on as received;
 * the planner checks them. Each is added to the URL only when given.
 */
export function getPlan(plotId: string, startPct?: string, triggerPct?: string): Promise<Result<Plan>> {
  const config = getConfig();
  const params = new URLSearchParams();
  if (startPct !== undefined) {
    params.set("start_pct", startPct);
  }
  if (triggerPct !== undefined) {
    params.set("trigger_pct", triggerPct);
  }
  const query = params.size > 0 ? `?${params.toString()}` : "";
  const url = `${config.plannerUrl}/v1/plots/${encodeURIComponent(plotId)}/plan${query}`;
  return getJson<Plan>("planner-service", url, config.plannerTimeoutSeconds);
}
