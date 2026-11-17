// Turns the plan's run times into clock times. Frontend only: the planner knows days, not hours.
// Times are minutes counted from 00:00 of the plan's first day, so day 2 starts at 1440.

import { formatDuration, formatWeekday } from "./format";
import type { PlanDay } from "./planner";

export const DEFAULT_START = "06:00";
export const MINUTES_PER_DAY = 1440;

/** One watering run, in minutes from 00:00 of the first day. */
export type Window = { startMin: number; endMin: number };

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
    windows.push({ startMin, endMin: previousEnd });
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
