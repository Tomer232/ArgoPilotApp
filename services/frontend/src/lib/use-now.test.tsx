// @vitest-environment jsdom
// Tests for useNowOnPlan: the minutes since 00:00 once the browser reads its clock, then every minute.
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNowOnPlan } from "./use-now";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useNowOnPlan", () => {
  it("reads the clock after the first render and again every minute", () => {
    vi.setSystemTime(new Date(2026, 10, 25, 10, 30));
    const { result } = renderHook(() => useNowOnPlan("2026-11-25"));
    expect(result.current).toBe(10 * 60 + 30);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe(10 * 60 + 31);
  });

  it("is null when the phone's date is not the plan's first day", () => {
    vi.setSystemTime(new Date(2026, 10, 25, 10, 30));
    const { result } = renderHook(() => useNowOnPlan("2026-11-26"));
    expect(result.current).toBeNull();
  });

  it("stops the timer when the page goes away", () => {
    vi.setSystemTime(new Date(2026, 10, 25, 10, 30));
    const { unmount } = renderHook(() => useNowOnPlan("2026-11-25"));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
