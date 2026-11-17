// Turns the plan's run times into clock times. Frontend only: the planner knows days, not hours.
// Times are minutes counted from 00:00 of the plan's first day, so day 2 starts at 1440.

import { formatDuration, formatWeekday } from "./format";
import type { PlanDay } from "./planner";

export const DEFAULT_START = "06:00";
export const MINUTES_PER_DAY = 1440;

/** One watering run, in minutes from 00:00 of the first day. */
export type Window = { startMin: number; endMin: number; stale: boolean };

/** The start time the page uses, as "HH:MM" and in minutes. `invalid` is true when `raw` was given but unusable. */
export function parseStart(raw?: string): { text: string; minutes: number; invalid: boolean } {
  const match = raw === undefined ? null : /^([01]\d|2[0-3]):([0-5]\d)$/.exec(raw);
  if (match === null) {
    return { text: DEFAULT_START, minutes: 6 * 60, invalid: raw !== undefined };
  }
  return { text: raw as string, minutes: Number(match[1]) * 60 + Number(match[2]), invalid: false };
}

/**
 * The watering runs. Each watering day starts at the start time; a run may pass midnight.
 * If the previous run is still going, the next one starts when it ends.
 * Each run keeps its day's `stale` flag, so the page can mark it (FR-2.17).
 */
export function buildWindows(days: PlanDay[], startMinutes: number): Window[] {
  const windows: Window[] = [];
  let previousEnd = 0;
  days.forEach((day, index) => {
    if (day.run_minutes === 0) {
      return;
    }
    const startMin = Math.max(index * MINUTES_PER_DAY + startMinutes, previousEnd);
    previousEnd = startMin + day.run_minutes;
    windows.push({ startMin, endMin: previousEnd, stale: day.stale });
  });
  return windows;
}

/** "2026-11-17" plus 2 days is "2026-11-19". */
export function addDays(isoDate: string, count: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

/** 90 is "01:30". */
export function clockTime(minutesInDay: number): string {
  const hours = String(Math.floor(minutesInDay / 60)).padStart(2, "0");
  const minutes = String(minutesInDay % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** Where a window sits on the bar, in percent. A run past the last day is cut at the bar's end. */
export function barPosition(window: Window, totalMinutes: number): { left: string; width: string } {
  const end = Math.min(window.endMin, totalMinutes);
  return {
    left: `${(window.startMin / totalMinutes) * 100}%`,
    width: `${((end - window.startMin) / totalMinutes) * 100}%`,
  };
}

/** "Sun 06:00 - Mon 06:00, 24 h". */
export function windowText(window: Window, firstDate: string): string {
  return `${momentText(window.startMin, firstDate)} - ${momentText(window.endMin, firstDate)}, ${formatDuration(window.endMin - window.startMin)}`;
}

/** Minutes from 00:00 of the first day as "Mon 06:00". */
export function momentText(minutes: number, firstDate: string): string {
  const day = addDays(firstDate, Math.floor(minutes / MINUTES_PER_DAY));
  return `${formatWeekday(day)} ${clockTime(minutes % MINUTES_PER_DAY)}`;
}

/** Labels closer than this share of the bar would overlap, so the later one is dropped. */
const MIN_LABEL_GAP = 0.1;

/**
 * Where the bar ends, in minutes from 00:00 today. It always starts at 00:00 today, and ends one hour
 * after the last run, rounded up to a whole hour, so the waterings fill the bar. At least the end of
 * today, at most the end of the plan. With no run at all it shows the whole plan.
 */
export function timelineEnd(windows: Window[], dayCount: number): number {
  const planEnd = dayCount * MINUTES_PER_DAY;
  if (windows.length === 0) {
    return planEnd;
  }
  const lastEnd = windows[windows.length - 1].endMin;
  const end = Math.ceil(lastEnd / 60) * 60 + 60;
  return Math.min(Math.max(end, MINUTES_PER_DAY), planEnd);
}

/** One mark per whole hour inside the bar; marks at midnight are flagged so they can stand taller. */
export function hourTicks(end: number): { minutes: number; midnight: boolean }[] {
  const ticks = [];
  for (let minutes = 60; minutes < end; minutes += 60) {
    ticks.push({ minutes, midnight: minutes % MINUTES_PER_DAY === 0 });
  }
  return ticks;
}

/**
 * The clock times written above the bar: where each run starts and ends. A run too short to hold two
 * labels gets one, "06:00-06:45", at its middle. A label too close to the one before it is dropped
 * (the list under the bar still has every run in full).
 */
export function windowLabels(windows: Window[], end: number): { minutes: number; text: string }[] {
  const wanted: { minutes: number; text: string }[] = [];
  for (const window of windows) {
    const stop = Math.min(window.endMin, end);
    const startText = clockTime(window.startMin % MINUTES_PER_DAY);
    const endText = clockTime(window.endMin % MINUTES_PER_DAY);
    if ((stop - window.startMin) / end < MIN_LABEL_GAP) {
      wanted.push({ minutes: (window.startMin + stop) / 2, text: `${startText}-${endText}` });
    } else {
      wanted.push({ minutes: window.startMin, text: startText }, { minutes: stop, text: endText });
    }
  }
  return dropCrowded(wanted, end);
}

/** The end labels under the bar ("Today 00:00", "Thu 08:00") are wide, so day names keep this share away from them. */
const END_LABEL_GAP = 0.18;

/** The day names under the bar, at each midnight, except those too close to the bar's two end labels. */
export function dayMarks(firstDate: string, end: number): { minutes: number; text: string }[] {
  const marks = [];
  for (let minutes = MINUTES_PER_DAY; minutes < end; minutes += MINUTES_PER_DAY) {
    const share = minutes / end;
    if (share >= END_LABEL_GAP && share <= 1 - END_LABEL_GAP) {
      marks.push({ minutes, text: formatWeekday(addDays(firstDate, minutes / MINUTES_PER_DAY)) });
    }
  }
  return marks;
}

/** Keeps labels in order, dropping each one that sits too close to the last one kept. */
function dropCrowded<T extends { minutes: number }>(labels: T[], end: number): T[] {
  const kept: T[] = [];
  for (const label of labels) {
    const last = kept[kept.length - 1];
    if (last === undefined || (label.minutes - last.minutes) / end >= MIN_LABEL_GAP) {
      kept.push(label);
    }
  }
  return kept;
}

/**
 * Where a label sits over the bar. It is centred on its time, except near the two ends,
 * where it lines up with the edge so it is not cut off.
 */
export function labelPosition(minutes: number, end: number): { left: string; transform: string } {
  const share = minutes / end;
  const shift = share < 0.04 ? "0" : share > 0.96 ? "-100%" : "-50%";
  return { left: `${share * 100}%`, transform: `translateX(${shift})` };
}

/** True when the drip is running at this minute, so a mark there is drawn light on the blue. */
export function isWatering(minutes: number, windows: Window[]): boolean {
  return windows.some((window) => window.startMin < minutes && minutes < window.endMin);
}
