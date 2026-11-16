// GET /health on the three services, for the status line.

import { getConfig } from "./config";
import { getJson } from "./http";

export type ServiceHealth = {
  name: string;
  up: boolean;
};

/** Ask one service for /health. Up means it answered 200 with {"status": "ok"} in time. */
async function isUp(service: string, baseUrl: string, timeoutSeconds: number): Promise<boolean> {
  const result = await getJson<{ status?: unknown }>(service, `${baseUrl}/health`, timeoutSeconds);
  return result.ok && result.data.status === "ok";
}

/** Check all three services at the same time. */
export async function checkServices(): Promise<ServiceHealth[]> {
  const config = getConfig();
  const timeout = config.healthTimeoutSeconds;
  const [registry, weather, planner] = await Promise.all([
    isUp("registry-service", config.registryUrl, timeout),
    isUp("weather-service", config.weatherUrl, timeout),
    isUp("planner-service", config.plannerUrl, timeout),
  ]);
  return [
    { name: "Registry", up: registry },
    { name: "Weather", up: weather },
    { name: "Planner", up: planner },
  ];
}
