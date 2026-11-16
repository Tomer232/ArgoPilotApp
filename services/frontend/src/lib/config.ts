// Settings from .env.local (see .env.example). Only the Next.js server reads them.

export type Config = {
  registryUrl: string;
  weatherUrl: string;
  plannerUrl: string;
  registryTimeoutSeconds: number;
  plannerTimeoutSeconds: number;
  healthTimeoutSeconds: number;
};

/** Read one required variable, or stop with a message that says how to fix it. */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing. Copy .env.example to .env.local and set it.`);
  }
  return value;
}

/** Read a required variable that holds a positive number of seconds. */
function requireSeconds(name: string): number {
  const seconds = Number(requireEnv(name));
  if (!(seconds > 0)) {
    throw new Error(`${name} must be a positive number of seconds.`);
  }
  return seconds;
}

/** All settings, read and checked from the environment. */
export function getConfig(): Config {
  return {
    registryUrl: requireEnv("REGISTRY_URL"),
    weatherUrl: requireEnv("WEATHER_URL"),
    plannerUrl: requireEnv("PLANNER_URL"),
    registryTimeoutSeconds: requireSeconds("REGISTRY_TIMEOUT_SECONDS"),
    plannerTimeoutSeconds: requireSeconds("PLANNER_TIMEOUT_SECONDS"),
    healthTimeoutSeconds: requireSeconds("HEALTH_TIMEOUT_SECONDS"),
  };
}
