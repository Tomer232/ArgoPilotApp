// Tests for the watering timeline's logic (Y16, A63): the start time, the watering windows, and dates.

import { afterEach, describe, expect, it } from "vitest";

import type { PlanDay } from "./planner";
import {
  addDays,
  barPosition,
  buildWindows,
  clockTime,
  dayMarks,
  DEFAULT_START,
  hourTicks,
  isWatering,
  labelPosition,
  MINUTES_PER_DAY,
  momentText,
  parseStart,
  timelineEnd,
  windowLabels,
  windowText,
} from "./timeline";

/** A plan day where only `run_minutes` matters; the other fields are plausible fillers. */
function day(runMinutes: number): PlanDay {
  return {
    date: "2026-11-17",
    et0_mm: 3,
    rain_mm: 0,
    kc: 1,
    stage: "mid",
    need_mm: 3,
    irrigation_mm: 0,
    capped: runMinutes === MINUTES_PER_DAY,
    litres: 0,
    run_minutes: runMinutes,
    bucket_capacity_mm: 40,
    trigger_mm: 20,
    bucket_end_mm: 30,
    stale: false,
  };
}

describe("parseStart", () => {
  it("uses 06:00 when the address has no start time", () => {
    // Y16: the default start is 06:00, and no start is not an error.
    expect(parseStart(undefined)).toEqual({ text: "06:00", minutes: 360, invalid: false });
    expect(DEFAULT_START).toBe("06:00");
  });

  it("reads a valid HH:MM as minutes after midnight", () => {
    // 07:45 is 7 x 60 + 45 = 465.
    expect(parseStart("07:45")).toEqual({ text: "07:45", minutes: 465, invalid: false });
  });

  it("accepts the first and last minute of the day", () => {
    // Boundaries: 00:00 is 0, 23:59 is 23 x 60 + 59 = 1439.
    expect(parseStart("00:00")).toEqual({ text: "00:00", minutes: 0, invalid: false });
    expect(parseStart("23:59")).toEqual({ text: "23:59", minutes: 1439, invalid: false });
  });

  it.each([
    ["24:00", "hour just past the last"],
    ["23:60", "minute just past the last"],
    ["6:00", "one-digit hour"],
    ["06:0", "one-digit minute"],
    ["", "empty"],
    [" 06:00", "leading space"],
    ["06:00 ", "trailing space"],
    ["06:00\n", "trailing newline"],
    ["06:00:00", "with seconds"],
    ["0600", "no colon"],
    ["-1:00", "negative"],
    ["٠٦:٠٠", "Arabic-Indic digits"],
    ["06:00\u0000", "NUL"],
    ["abc", "not a time"],
  ])("falls back to 06:00 and flags %j (%s) as invalid", (raw) => {
    // A63: an invalid start falls back to 06:00 with a note, so the grower is never stuck.
    expect(parseStart(raw)).toEqual({ text: "06:00", minutes: 360, invalid: true });
  });
});

describe("buildWindows", () => {
  it("gives no windows for an empty plan", () => {
    expect(buildWindows([], 360)).toEqual([]);
  });

  it("gives no windows when no day waters", () => {
    // FR-2.10: a day with no irrigation has run_minutes 0, and it gets no blue on the bar.
    expect(buildWindows([day(0), day(0), day(0)], 360)).toEqual([]);
  });

  it("starts a watering day's run at the start time", () => {
    // Day 1, start 06:00 (360), 45 minutes: 360 to 405.
    expect(buildWindows([day(45)], 360)).toEqual([{ startMin: 360, endMin: 405, stale: false }]);
  });

  it("places each day's run on its own day and skips days without watering", () => {
    // Y16: day index 2 starts at 2 x 1440 + 360 = 3240; day index 4 at 4 x 1440 + 360 = 6120.
    const days = [day(0), day(0), day(30), day(0), day(90)];
    expect(buildWindows(days, 360)).toEqual([
      { startMin: 3240, endMin: 3270, stale: false },
      { startMin: 6120, endMin: 6210, stale: false },
    ]);
  });

  it("lets a run pass midnight into the next day", () => {
    // Y16: start 22:00 (1320) plus 180 minutes ends at 1500, which is 01:00 on day 2.
    expect(buildWindows([day(180)], 1320)).toEqual([{ startMin: 1320, endMin: 1500, stale: false }]);
  });

  it("lets a run that starts at the last minute of the day pass midnight", () => {
    // Boundary: 23:59 (1439) plus 2 minutes ends at 1441, 00:01 on day 2.
    expect(buildWindows([day(2)], 1439)).toEqual([{ startMin: 1439, endMin: 1441, stale: false }]);
  });

  it("keeps back-to-back capped days as separate windows that touch", () => {
    // O90: a capped day runs exactly 1440 min. Day 1 runs 360 to 1800; day 2 starts at
    // 1440 + 360 = 1800, exactly when day 1 ends, so it is not pushed and not merged.
    expect(buildWindows([day(1440), day(1440)], 360)).toEqual([
      { startMin: 360, endMin: 1800, stale: false },
      { startMin: 1800, endMin: 3240, stale: false },
    ]);
  });

  it("starts the next run when the previous one ends if it is still going", () => {
    // A63: day 1 runs 1320 + 600 = 1920; day 2 would start at 1440 + 1320 = 2760, no overlap.
    // With a 1500-minute day 1 (more than the planner sends, see O90) it ends at 2820,
    // so day 2's 60 minutes start at 2820, not 2760, and end at 2880.
    expect(buildWindows([day(1500), day(60)], 1320)).toEqual([
      { startMin: 1320, endMin: 2820, stale: false },
      { startMin: 2820, endMin: 2880, stale: false },
    ]);
  });

  it("does not push a run when the previous one ended earlier", () => {
    // Day 1 runs 360 to 420; day 2 still starts at its own time, 1440 + 360 = 1800.
    expect(buildWindows([day(60), day(60)], 360)).toEqual([
      { startMin: 360, endMin: 420, stale: false },
      { startMin: 1800, endMin: 1860, stale: false },
    ]);
  });

  it("starts at midnight when the start time is 00:00", () => {
    // Boundary: start 0, day index 1 starts at exactly 1440.
    expect(buildWindows([day(0), day(10)], 0)).toEqual([{ startMin: 1440, endMin: 1450, stale: false }]);
  });

  it("marks a run stale when its day comes from a stale forecast", () => {
    // FR-2.17 (QA-2): the run times are numbers the stale forecast affects, so each window
    // carries its own day's flag. Day 1 is fresh, day 2 stale.
    const staleDay = { ...day(30), stale: true };
    expect(buildWindows([day(30), staleDay], 360)).toEqual([
      { startMin: 360, endMin: 390, stale: false },
      { startMin: 1800, endMin: 1830, stale: true },
    ]);
  });
});

describe("addDays", () => {
  const originalTimeZone = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTimeZone;
  });

  it("adds days within a month", () => {
    expect(addDays("2026-11-17", 2)).toBe("2026-11-19");
  });

  it("returns the same date when adding zero", () => {
    expect(addDays("2026-11-17", 0)).toBe("2026-11-17");
  });

  it("crosses the end of a month", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
  });

  it("crosses the end of a year", () => {
    // A 7-day plan from 28 Dec ends in the next year.
    expect(addDays("2026-12-28", 6)).toBe("2027-01-03");
  });

  it("knows leap years", () => {
    // 2028 is a leap year, 2027 is not.
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
  });

  it.each(["Pacific/Kiritimati", "Etc/GMT+12", "Asia/Jerusalem"])(
    "gives the same date when the machine's time zone is %s",
    (timeZone) => {
      // The date is a calendar day, so the server's time zone (UTC+14, UTC-12, or across
      // Israel's DST change on 27 Mar 2026) must not shift it.
      process.env.TZ = timeZone;
      expect(addDays("2026-03-26", 1)).toBe("2026-03-27");
      expect(addDays("2026-03-27", 1)).toBe("2026-03-28");
    },
  );
});

describe("clockTime", () => {
  it("writes midnight as 00:00", () => {
    expect(clockTime(0)).toBe("00:00");
  });

  it("pads hours and minutes to two digits", () => {
    // 90 minutes is 1 h 30 min.
    expect(clockTime(90)).toBe("01:30");
    expect(clockTime(365)).toBe("06:05");
  });

  it("writes the last minute of the day as 23:59", () => {
    expect(clockTime(1439)).toBe("23:59");
  });
});

describe("barPosition", () => {
  // A 2-day bar is 2880 minutes, so 360 minutes is 12.5% and 720 minutes is 25%.
  it("places a window by its start and length", () => {
    expect(barPosition({ startMin: 360, endMin: 1080, stale: false }, 2880)).toEqual({ left: "12.5%", width: "25%" });
  });

  it("cuts a run that passes the plan's last day at the bar's end (A63)", () => {
    // Day 2 at 18:00 for 12 h would end at 3240; the bar ends at 2880, so 360 minutes show.
    expect(barPosition({ startMin: 2520, endMin: 3240, stale: false }, 2880)).toEqual({ left: "87.5%", width: "12.5%" });
  });

  it("keeps a run that ends exactly at the bar's end whole", () => {
    expect(barPosition({ startMin: 1440, endMin: 2880, stale: false }, 2880)).toEqual({ left: "50%", width: "50%" });
  });
});

describe("momentText", () => {
  // 2026-11-17 is a Tuesday.
  it("writes minutes on the first day as weekday and clock time", () => {
    expect(momentText(360, "2026-11-17")).toBe("Tue 06:00");
  });

  it("puts exactly midnight on the next day", () => {
    expect(momentText(MINUTES_PER_DAY, "2026-11-17")).toBe("Wed 00:00");
  });

  it("reaches the last minute of a 7-day plan", () => {
    // Day 7 is 2026-11-23, a Monday.
    expect(momentText(6 * MINUTES_PER_DAY + 1439, "2026-11-17")).toBe("Mon 23:59");
  });

  it("crosses into the next month", () => {
    // 2026-11-30 is a Monday; one day and one hour later is Tuesday 1 December, 01:00.
    expect(momentText(MINUTES_PER_DAY + 60, "2026-11-30")).toBe("Tue 01:00");
  });
});

describe("windowText", () => {
  it("writes a run inside one day with its length (O91)", () => {
    // 06:00 + 612 min (10 h 12 min) ends at 16:12.
    expect(windowText({ startMin: 360, endMin: 972, stale: false }, "2026-11-17")).toBe("Tue 06:00 - Tue 16:12, 10 h 12 min");
  });

  it("writes a run that passes midnight with both weekdays", () => {
    expect(windowText({ startMin: 1380, endMin: 1500, stale: false }, "2026-11-17")).toBe("Tue 23:00 - Wed 01:00, 2 h");
  });

  it("writes a capped 24-hour run (O90)", () => {
    expect(windowText({ startMin: 360, endMin: 1800, stale: false }, "2026-11-17")).toBe("Tue 06:00 - Wed 06:00, 24 h");
  });

  it("writes a run under an hour in minutes only", () => {
    expect(windowText({ startMin: 360, endMin: 405, stale: false }, "2026-11-17")).toBe("Tue 06:00 - Tue 06:45, 45 min");
  });
});

describe("timelineEnd", () => {
  const run = (startMin: number, endMin: number) => ({ startMin, endMin, stale: false });

  it("shows the whole plan when nothing is watered", () => {
    expect(timelineEnd([], 7)).toBe(7 * MINUTES_PER_DAY);
  });

  it("ends one hour after the last run, rounded up to a whole hour", () => {
    // Day 3 run ends at 2 x 1440 + 405 = 3285 (06:45); rounded up to 07:00 (3300), plus 1 h is 3360.
    expect(timelineEnd([run(360, 400), run(3240, 3285)], 7)).toBe(3360);
  });

  it("adds one hour when the last run ends on a whole hour", () => {
    // Ends at 30 h (1800): the bar ends at 31 h (1860).
    expect(timelineEnd([run(360, 1800)], 7)).toBe(1860);
  });

  it("never ends before the end of today", () => {
    // A run 06:00-06:45 would give 08:00, but the bar shows at least all of today.
    expect(timelineEnd([run(360, 405)], 7)).toBe(MINUTES_PER_DAY);
  });

  it("never ends after the end of the plan", () => {
    // A run on the last of 2 days that passes midnight is cut at 2880.
    expect(timelineEnd([run(2760, 2940)], 2)).toBe(2 * MINUTES_PER_DAY);
  });
});

describe("hourTicks", () => {
  it("marks every whole hour inside the bar, not its two ends", () => {
    const ticks = hourTicks(MINUTES_PER_DAY);
    expect(ticks).toHaveLength(23);
    expect(ticks[0]).toEqual({ minutes: 60, midnight: false });
    expect(ticks[22]).toEqual({ minutes: 1380, midnight: false });
  });

  it("flags the marks that fall on midnight", () => {
    // A 2-day bar: 47 marks, and only 24:00 (1440) is a midnight.
    const midnights = hourTicks(2 * MINUTES_PER_DAY).filter((tick) => tick.midnight);
    expect(midnights).toEqual([{ minutes: 1440, midnight: true }]);
  });
});

describe("windowLabels", () => {
  const run = (startMin: number, endMin: number) => ({ startMin, endMin, stale: false });

  it("writes the start and end time of a long run", () => {
    // 06:00 to 30 h (06:00 next day) on a 31 h bar.
    expect(windowLabels([run(360, 1800)], 1860)).toEqual([
      { minutes: 360, text: "06:00" },
      { minutes: 1800, text: "06:00" },
    ]);
  });

  it("writes one label at the middle of a run too short for two", () => {
    // 45 minutes on a 24 h bar is 3%, so one label at (360 + 405) / 2.
    expect(windowLabels([run(360, 405)], MINUTES_PER_DAY)).toEqual([{ minutes: 382.5, text: "06:00-06:45" }]);
  });

  it("drops a label too close to the one before it", () => {
    // Two capped days that touch: day 1 ends at 1800 where day 2 starts, so "06:00" appears once there.
    expect(windowLabels([run(360, 1800), run(1800, 3240)], 3300)).toEqual([
      { minutes: 360, text: "06:00" },
      { minutes: 1800, text: "06:00" },
      { minutes: 3240, text: "06:00" },
    ]);
  });

  it("puts the end label of a run cut by the bar at the bar's end, with the run's real end time", () => {
    expect(windowLabels([run(2760, 2940)], 2880)).toEqual([{ minutes: 2820, text: "22:00-01:00" }]);
  });
});

describe("dayMarks", () => {
  it("names each midnight inside the bar", () => {
    // 17 Nov 2026 is a Tuesday; a 3-day bar has Wed and Thu at 1440 and 2880.
    expect(dayMarks("2026-11-17", 3 * MINUTES_PER_DAY).map((mark) => mark.text)).toEqual(["Wed", "Thu"]);
  });

  it("leaves out a midnight that would touch the end label", () => {
    // Bar ends at 3360 (Thu 08:00): Thu midnight is at 2880 / 3360 = 86%, closer than 18% to the end.
    expect(dayMarks("2026-11-17", 3360).map((mark) => mark.text)).toEqual(["Wed"]);
  });

  it("leaves out a midnight too close to the bar's end", () => {
    // A 25 h bar: midnight is at 96%, next to the end label, so no day name.
    expect(dayMarks("2026-11-17", 1500)).toEqual([]);
  });
});

describe("labelPosition", () => {
  it("centres a label on its time", () => {
    expect(labelPosition(720, 1440)).toEqual({ left: "50%", transform: "translateX(-50%)" });
  });

  it("lines a label up with the edge near either end of the bar", () => {
    expect(labelPosition(0, 1440).transform).toBe("translateX(0)");
    expect(labelPosition(1440, 1440).transform).toBe("translateX(-100%)");
  });
});

describe("isWatering", () => {
  const runs = [{ startMin: 360, endMin: 1800, stale: false }];

  it("is true inside a run", () => {
    expect(isWatering(720, runs)).toBe(true);
  });

  it("is false outside a run and on its two edges", () => {
    // The edge marks sit on the gray, where the blue starts or stops.
    expect(isWatering(60, runs)).toBe(false);
    expect(isWatering(360, runs)).toBe(false);
    expect(isWatering(1800, runs)).toBe(false);
  });
});
