// Tests for getJson: every way a call can fail comes back as a Problem, never as an exception.
import { afterEach, describe, expect, it, vi } from "vitest";
import { getJson } from "./http";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Make fetch answer with a status and a body (a string is sent as is, anything else as JSON). */
function stubAnswer(status: number, body: unknown) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  const fetchMock = vi.fn().mockResolvedValue(new Response(text, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("getJson", () => {
  it("returns the data of a 200 answer and asks for no caching", async () => {
    const fetchMock = stubAnswer(200, { a: 1 });
    const result = await getJson("svc", "http://x/y", 2);
    expect(result).toEqual({ ok: true, data: { a: 1 } });
    expect(fetchMock.mock.calls[0][0]).toBe("http://x/y");
    expect(fetchMock.mock.calls[0][1].cache).toBe("no-store");
  });

  it("names the service when it is not reachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const result = await getJson("svc", "http://x", 2);
    expect(result).toEqual({
      ok: false,
      problem: { status: null, code: null, detail: "svc is not reachable" },
    });
  });

  it("says so when the call timed out", async () => {
    const timeout = new DOMException("timed out", "TimeoutError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeout));
    const result = await getJson("svc", "http://x", 3);
    expect(result).toEqual({
      ok: false,
      problem: { status: null, code: null, detail: "svc did not answer within 3 s" },
    });
  });

  it("uses the detail and code of a problem+json answer", async () => {
    stubAnswer(404, { detail: "No such plot", code: "not_found" });
    const result = await getJson("svc", "http://x", 2);
    expect(result).toEqual({
      ok: false,
      problem: { status: 404, code: "not_found", detail: "No such plot" },
    });
  });

  it("falls back to a plain sentence when detail and code are not text", async () => {
    stubAnswer(500, { detail: 5, code: 7 });
    const result = await getJson("svc", "http://x", 2);
    expect(result).toEqual({
      ok: false,
      problem: { status: 500, code: null, detail: "svc answered with status 500" },
    });
  });

  it("falls back when the error body is not JSON", async () => {
    stubAnswer(502, "<html>bad gateway</html>");
    const result = await getJson("svc", "http://x", 2);
    expect(result).toEqual({
      ok: false,
      problem: { status: 502, code: null, detail: "svc answered with status 502" },
    });
  });

  it("falls back when the error body is JSON null", async () => {
    stubAnswer(503, "null");
    const result = await getJson("svc", "http://x", 2);
    expect(result).toEqual({
      ok: false,
      problem: { status: 503, code: null, detail: "svc answered with status 503" },
    });
  });

  it("reports a 200 answer that is not JSON", async () => {
    stubAnswer(200, "hello");
    const result = await getJson("svc", "http://x", 2);
    expect(result).toEqual({
      ok: false,
      problem: { status: 200, code: null, detail: "svc sent an answer that is not JSON" },
    });
  });
});
