// Calls to registry-service. Field names match its API (GET /v1/farms, /v1/plots, the catalogues).

import { getConfig } from "./config";
import { getJson, type Result } from "./http";

export type Farm = {
  id: string;
  name: string;
};

export type Crop = {
  id: string;
  name: string;
};

export type Soil = {
  id: string;
  name: string;
  available_water_mm_per_m: number;
};

export type Emitter = {
  id: string;
  name: string;
  flow_lph: number;
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

/** Every crop, for showing a crop's name instead of its id. */
export function listCrops(): Promise<Result<Crop[]>> {
  return getFromRegistry<Crop[]>("/v1/crops");
}

/** Every soil, with the water it holds per metre of root depth. */
export function listSoils(): Promise<Result<Soil[]>> {
  return getFromRegistry<Soil[]>("/v1/soils");
}

/** Every emitter, with its flow in litres per hour. */
export function listEmitters(): Promise<Result<Emitter[]>> {
  return getFromRegistry<Emitter[]>("/v1/emitters");
}

/** Every plot, of every farm. */
export function listPlots(): Promise<Result<Plot[]>> {
  return getFromRegistry<Plot[]>("/v1/plots");
}

/** One plot by id. An unknown id comes back as a Problem with status 404. */
export function getPlot(plotId: string): Promise<Result<Plot>> {
  return getFromRegistry<Plot>(`/v1/plots/${encodeURIComponent(plotId)}`);
}
