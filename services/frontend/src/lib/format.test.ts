// Tests for the display helpers the watering timeline relies on: run durations and weekdays (O91, Y16).

import { afterEach, describe, expect, it } from "vitest";

import { formatCoords, formatDuration, formatFetchedAt, formatLitres, formatWeekday } from "./format";

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

describe("formatFetchedAt", () => {
  it("shows UTC, named, when no zone is given (the server's first render)", () => {
    expect(formatFetchedAt("2026-11-18T11:03:46Z")).toBe("18 Nov, 11:03 UTC");
  });

  it("shows the phone's local time without a zone name", () => {
    expect(formatFetchedAt("2026-11-18T11:03:46Z", "Asia/Jerusalem")).toBe("18 Nov, 13:03");
  });

  it("moves to the next day when the local time passes midnight", () => {
    expect(formatFetchedAt("2026-11-18T23:30:00Z", "Asia/Jerusalem")).toBe("19 Nov, 01:30");
  });
});

describe("formatLitres", () => {
  it("keeps one decimal under 10 L", () => {
    expect(formatLitres(0.6)).toBe("0.6 L");
    expect(formatLitres(7.54)).toBe("7.5 L");
  });

  it("shows whole litres from 10 L, with thousands separators", () => {
    expect(formatLitres(412.37)).toBe("412 L");
    expect(formatLitres(40000)).toBe("40,000 L");
  });

  it("shows no decimal for a day without water", () => {
    expect(formatLitres(0)).toBe("0 L");
  });
});

describe("formatCoords", () => {
  it.each([
    [31.25, 34.79, "31.25° N, 34.79° E"],
    [31.331, 34.571, "31.33° N, 34.57° E"],
    [-33.9, -70.65, "33.90° S, 70.65° W"],
    [0, 0, "0.00° N, 0.00° E"],
  ])("%s, %s -> %s", (lat, lon, expected) => {
    expect(formatCoords(lat, lon)).toBe(expected);
  });
});
