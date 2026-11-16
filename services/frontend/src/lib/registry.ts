// Calls to registry-service. Field names match its API (GET /v1/farms, /v1/plots).

import { getConfig } from "./config";
import { getJson, type Result } from "./http";

export type Farm = {
  id: string;
  name: string;
};

export type Plot = {
  id: string;
  farm_id: string;
  name: string;
  area_m2: number;
  crop_id: string;
  planting_date: string;
  soil_id: string;
  row_spacing_m: number;
  emitter_spacing_m: number;
  emitter_id: string;
  lat: number;
  lon: number;
};

/** Build a registry URL and GET it. */
function getFromRegistry<T>(path: string): Promise<Result<T>> {
  const config = getConfig();
  return getJson<T>("registry-service", config.registryUrl + path, config.registryTimeoutSeconds);
}

/** Every farm. */
export function listFarms(): Promise<Result<Farm[]>> {
  return getFromRegistry<Farm[]>("/v1/farms");
}

/** Every plot, of every farm. */
export function listPlots(): Promise<Result<Plot[]>> {
  return getFromRegistry<Plot[]>("/v1/plots");
}

/** One plot by id. An unknown id comes back as a Problem with status 404. */
export function getPlot(plotId: string): Promise<Result<Plot>> {
  return getFromRegistry<Plot>(`/v1/plots/${encodeURIComponent(plotId)}`);
}
