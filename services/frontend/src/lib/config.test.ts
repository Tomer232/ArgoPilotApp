// Tests for getConfig: every setting is required, the timeouts must be positive numbers.
import { afterEach, describe, expect, it, vi } from "vitest";
import { getConfig } from "./config";

/** Set all six settings to valid values. */
function setValidEnv() {
  vi.stubEnv("REGISTRY_URL", "http://registry");
  vi.stubEnv("WEATHER_URL", "http://weather");
  vi.stubEnv("PLANNER_URL", "http://planner");
  vi.stubEnv("REGISTRY_TIMEOUT_SECONDS", "2");
  vi.stubEnv("PLANNER_TIMEOUT_SECONDS", "20");
  vi.stubEnv("HEALTH_TIMEOUT_SECONDS", "1.5");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getConfig", () => {
  it("reads the urls as text and the timeouts as numbers", () => {
    setValidEnv();
    expect(getConfig()).toEqual({
      registryUrl: "http://registry",
      weatherUrl: "http://weather",
      plannerUrl: "http://planner",
      registryTimeoutSeconds: 2,
      plannerTimeoutSeconds: 20,
      healthTimeoutSeconds: 1.5,
    });
  });

  it("names the missing variable", () => {
    setValidEnv();
    vi.stubEnv("WEATHER_URL", "");
    expect(() => getConfig()).toThrow("WEATHER_URL is missing");
  });

  it.each(["0", "-3", "abc"])("rejects the timeout %s", (value) => {
    setValidEnv();
    vi.stubEnv("PLANNER_TIMEOUT_SECONDS", value);
    expect(() => getConfig()).toThrow("PLANNER_TIMEOUT_SECONDS must be a positive number");
  });
});
