// Tests for the plan chart's mm axis: round ticks for every bucket size (O131, QA-4 of 2026-11-24).

import { describe, expect, it } from "vitest";

import { mmAxis } from "./chart-axis";

describe("mmAxis", () => {
  it.each([
    // largest bucket, top, ticks. Each step is the smallest of 10, 20, 25, 50, ... needing at most 5 gaps.
    [61.25, 80, [0, 20, 40, 60, 80]], // 10 needs 7 gaps, 20 needs 4
    [122.5, 125, [0, 25, 50, 75, 100, 125]], // North block: 20 needs 7, 25 needs 5
    [175, 200, [0, 50, 100, 150, 200]], // 25 needs 7, 50 needs 4
    [210, 250, [0, 50, 100, 150, 200, 250]], // 50 needs 5
  ])("gives round ticks for a %d mm bucket", (largest, top, ticks) => {
    expect(mmAxis(largest)).toEqual({ top, ticks });
  });

  it("ends exactly on a bucket that is already round", () => {
    expect(mmAxis(100)).toEqual({ top: 100, ticks: [0, 20, 40, 60, 80, 100] });
  });

  it("never gives more than five gaps for a large bucket", () => {
    const { ticks } = mmAxis(2400);
    expect(ticks.length).toBeLessThanOrEqual(6);
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(2400);
  });

  it("keeps the largest step for a bucket no step fits in five gaps", () => {
    expect(mmAxis(5000)).toEqual({ top: 5000, ticks: [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000] });
  });

  it("still draws one gap for a tiny bucket", () => {
    expect(mmAxis(3)).toEqual({ top: 10, ticks: [0, 10] });
  });
});
