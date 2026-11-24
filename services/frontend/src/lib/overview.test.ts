// Tests for the overview headline: plots that need water today, and plots with no plan (O105, O125).

import { describe, expect, it } from "vitest";

import type { Result } from "./http";
import { todaySummary } from "./overview";
import type { Plan } from "./planner";

/** A plan whose first day runs `minutes` (only the fields the headline reads matter). */
function planned(minutes: number): Result<Plan> {
  return { ok: true, data: { days: [{ run_minutes: minutes }] } as Plan };
}

/** A plot the planner could not plan, with the planner's reason. */
function failed(detail: string): Result<Plan> {
  return { ok: false, problem: { detail } } as Result<Plan>;
}

describe("todaySummary", () => {
  it("says there are no plots yet when there are none", () => {
    expect(todaySummary([])).toBe("No plots yet. Farms and plots are added in the registry.");
  });

  it("counts the plots that water today out of all planned plots", () => {
    expect(todaySummary([planned(120), planned(0), planned(45)])).toBe(
      "2 of 3 plots need water today, with the default choices.",
    );
  });

  it("writes one planned plot in the singular", () => {
    expect(todaySummary([planned(0)])).toBe("0 of 1 plot need water today, with the default choices.");
  });

  it("counts only planned plots and names the others with the first reason (O105)", () => {
    expect(todaySummary([planned(60), failed("weather-service is not reachable"), planned(0)])).toBe(
      "1 of 2 plots need water today, with the default choices. 1 plot has no plan right now: weather-service is not reachable.",
    );
  });

  it("uses the plural verb for several plots without a plan", () => {
    expect(todaySummary([planned(60), failed("a"), failed("b")])).toBe(
      "1 of 1 plot need water today, with the default choices. 2 plots have no plan right now: a.",
    );
  });

  it("drops the count when no plot has a plan (O125)", () => {
    expect(todaySummary([failed("weather-service is not reachable"), failed("x")])).toBe(
      "No plan right now: weather-service is not reachable.",
    );
  });

  it("does not double the full stop when the reason has one (QA-2, 2026-11-24)", () => {
    expect(todaySummary([failed("registry-service: Database unavailable.")])).toBe(
      "No plan right now: registry-service: Database unavailable.",
    );
  });
});
