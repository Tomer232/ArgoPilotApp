// Tests for getPlan: the grower's choices are added to the url only when given.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPlan } from "./planner";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv("REGISTRY_URL", "http://registry");
  vi.stubEnv("WEATHER_URL", "http://weather");
  vi.stubEnv("PLANNER_URL", "http://planner");
  vi.stubEnv("REGISTRY_TIMEOUT_SECONDS", "2");
  vi.stubEnv("PLANNER_TIMEOUT_SECONDS", "20");
  vi.stubEnv("HEALTH_TIMEOUT_SECONDS", "1");
  fetchMock = vi.fn().mockImplementation(async () => new Response('{"plot_id":"p"}', { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("getPlan", () => {
  it("sends no query when nothing was chosen", async () => {
    const result = await getPlan("p1");
    expect(result).toEqual({ ok: true, data: { plot_id: "p" } });
    expect(fetchMock.mock.calls[0][0]).toBe("http://planner/v1/plots/p1/plan");
  });

  it("sends only start_pct when only it was chosen", async () => {
    await getPlan("p1", "40");
    expect(fetchMock.mock.calls[0][0]).toBe("http://planner/v1/plots/p1/plan?start_pct=40");
  });

  it("sends only trigger_pct when only it was chosen", async () => {
    await getPlan("p1", undefined, "55");
    expect(fetchMock.mock.calls[0][0]).toBe("http://planner/v1/plots/p1/plan?trigger_pct=55");
  });

  it("sends both as received and encodes the plot id", async () => {
    await getPlan("a/b", "x", "y");
    expect(fetchMock.mock.calls[0][0]).toBe("http://planner/v1/plots/a%2Fb/plan?start_pct=x&trigger_pct=y");
  });
});
