// Tests for checkServices: a service is up only if /health answers 200 with {"status": "ok"}.
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkServices } from "./health";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** Set the settings and make fetch answer per service url: a body, or "down" for no answer. */
function stubServices(answers: Record<string, unknown>) {
  vi.stubEnv("REGISTRY_URL", "http://registry");
  vi.stubEnv("WEATHER_URL", "http://weather");
  vi.stubEnv("PLANNER_URL", "http://planner");
  vi.stubEnv("REGISTRY_TIMEOUT_SECONDS", "2");
  vi.stubEnv("PLANNER_TIMEOUT_SECONDS", "2");
  vi.stubEnv("HEALTH_TIMEOUT_SECONDS", "1");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const answer = answers[url];
      if (answer === "down") {
        throw new TypeError("fetch failed");
      }
      return new Response(JSON.stringify(answer), { status: 200 });
    }),
  );
}

describe("checkServices", () => {
  it("marks every service up when all say ok", async () => {
    stubServices({
      "http://registry/health": { status: "ok" },
      "http://weather/health": { status: "ok" },
      "http://planner/health": { status: "ok" },
    });
    expect(await checkServices()).toEqual([
      { name: "Registry", up: true },
      { name: "Weather", up: true },
      { name: "Planner", up: true },
    ]);
  });

  it("marks a service that is down or says something else as not up", async () => {
    stubServices({
      "http://registry/health": "down",
      "http://weather/health": { status: "degraded" },
      "http://planner/health": { status: "ok" },
    });
    expect(await checkServices()).toEqual([
      { name: "Registry", up: false },
      { name: "Weather", up: false },
      { name: "Planner", up: true },
    ]);
  });
});
