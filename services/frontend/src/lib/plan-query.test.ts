import { describe, expect, it } from "vitest";

import { hrefWith, withValidStart } from "./plan-query";

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
