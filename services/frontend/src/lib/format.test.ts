// Tests for the display helpers the watering timeline relies on: run durations and weekdays (O91, Y16).

import { afterEach, describe, expect, it } from "vitest";

import { formatDuration, formatWeekday } from "./format";

describe("formatDuration", () => {
  it.each([
    [0, "0 min"],
    [1, "1 min"],
    [45, "45 min"],
    [59, "59 min"],
    [60, "1 h"],
    [61, "1 h 1 min"],
    [612, "10 h 12 min"],
    [1440, "24 h"],
  ])("writes %i minutes as %j", (minutes, text) => {
    // O91: run times read as "10 h 12 min"; a capped day (O90) is exactly "24 h".
    expect(formatDuration(minutes)).toBe(text);
  });

  it("rounds a fractional duration to whole minutes before splitting", () => {
    // 59.6 rounds to 60, so it is "1 h", never "0 h 60 min" or "59.6 min".
    expect(formatDuration(59.6)).toBe("1 h");
    expect(formatDuration(44.4)).toBe("44 min");
  });

  it("writes a run longer than a day in hours", () => {
    // A run pushed past a full day (A63) is still hours and minutes: 1500 = 25 h.
    expect(formatDuration(1500)).toBe("25 h");
  });
});

describe("formatWeekday", () => {
  const originalTimeZone = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTimeZone;
  });

  it("writes the short weekday of a date", () => {
    // 17 Nov 2026 is a Tuesday.
    expect(formatWeekday("2026-11-17")).toBe("Tue");
  });

  it("writes a leap day's weekday", () => {
    // 29 Feb 2028 is a Tuesday.
    expect(formatWeekday("2028-02-29")).toBe("Tue");
  });

  it.each(["Pacific/Kiritimati", "Etc/GMT+12"])("does not shift the day when the machine's time zone is %s", (timeZone) => {
    // The timeline labels each slice of the bar with this; UTC+14 or UTC-12 must not move it a day.
    process.env.TZ = timeZone;
    expect(formatWeekday("2026-11-17")).toBe("Tue");
  });
});
