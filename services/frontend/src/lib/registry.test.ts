// Tests for the registry calls: each one asks the right url.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPlot, listCrops, listEmitters, listFarms, listPlots, listSoils } from "./registry";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv("REGISTRY_URL", "http://registry");
  vi.stubEnv("WEATHER_URL", "http://weather");
  vi.stubEnv("PLANNER_URL", "http://planner");
  vi.stubEnv("REGISTRY_TIMEOUT_SECONDS", "2");
  vi.stubEnv("PLANNER_TIMEOUT_SECONDS", "2");
  vi.stubEnv("HEALTH_TIMEOUT_SECONDS", "1");
  fetchMock = vi.fn().mockImplementation(async () => new Response('[{"id":"a"}]', { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("registry calls", () => {
  it.each([
    ["listFarms", listFarms, "http://registry/v1/farms"],
    ["listCrops", listCrops, "http://registry/v1/crops"],
    ["listSoils", listSoils, "http://registry/v1/soils"],
    ["listEmitters", listEmitters, "http://registry/v1/emitters"],
    ["listPlots", listPlots, "http://registry/v1/plots"],
  ])("%s asks %s", async (_name, call, url) => {
    const result = await call();
    expect(result).toEqual({ ok: true, data: [{ id: "a" }] });
    expect(fetchMock.mock.calls[0][0]).toBe(url);
  });

  it("getPlot encodes the id into the url", async () => {
    await getPlot("a b/c");
    expect(fetchMock.mock.calls[0][0]).toBe("http://registry/v1/plots/a%20b%2Fc");
  });
});
