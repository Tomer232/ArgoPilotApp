import { describe, expect, it } from "vitest";

import { hrefWith, hrefWithout, withValidStart } from "./plan-query";

describe("withValidStart", () => {
  it("keeps a valid start time", () => {
    expect(withValidStart({ start_pct: "30", start: "07:30" })).toEqual({ start_pct: "30", start: "07:30" });
  });

  it("drops a start that is not HH:MM, so the next address does not carry it (QA-8)", () => {
    const query = withValidStart({ start_pct: "30", start: "abc" });
    expect(hrefWith(query, { trigger_pct: "40" })).toBe("?start_pct=30&trigger_pct=40");
  });

  it("leaves a query without start alone", () => {
    expect(withValidStart({ view: "chart" })).toEqual({ view: "chart" });
  });
});

describe("hrefWith and hrefWithout (the choices live in the address)", () => {
  const query = { start_pct: "62.5", trigger_pct: "50", start: "06:30", view: "chart" };

  it("changes one choice and keeps the others, including the chart view (Y26)", () => {
    // ":" is written %3A in an address.
    expect(hrefWith(query, { trigger_pct: "40" })).toBe("?start_pct=62.5&trigger_pct=40&start=06%3A30&view=chart");
  });

  it("adds a choice the address did not have", () => {
    expect(hrefWith({}, { view: "chart" })).toBe("?view=chart");
  });

  it("leaves out a choice set to undefined", () => {
    expect(hrefWith(query, { start: undefined })).toBe("?start_pct=62.5&trigger_pct=50&view=chart");
  });

  it("gives an empty query when there are no choices", () => {
    expect(hrefWith({}, {})).toBe("?");
  });

  it("removes one choice and keeps the rest", () => {
    expect(hrefWithout(query, "view")).toBe("?start_pct=62.5&trigger_pct=50&start=06%3A30");
  });
});
