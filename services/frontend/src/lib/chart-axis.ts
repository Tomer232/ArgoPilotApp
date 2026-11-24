// The plan chart's mm axis: a top and evenly spaced round ticks (O131, QA-4 of 2026-11-24).

// Tick steps a grower reads easily, smallest first.
const STEPS = [10, 20, 25, 50, 100, 200, 500];

// At most this many gaps between ticks, so the labels don't crowd a phone's chart.
const MAX_GAPS = 5;

/**
 * The axis for a plan whose largest bucket is `largestMm`: the smallest round step that needs
 * at most five gaps, the top rounded up to that step, and every tick from 0 to the top.
 * 122.5 mm gives step 25: 0, 25, 50, 75, 100, 125.
 */
export function mmAxis(largestMm: number): { top: number; ticks: number[] } {
  const step = STEPS.find((candidate) => Math.ceil(largestMm / candidate) <= MAX_GAPS) ?? STEPS[STEPS.length - 1];
  const gaps = Math.max(1, Math.ceil(largestMm / step));
  const ticks = Array.from({ length: gaps + 1 }, (_, index) => index * step);
  return { top: gaps * step, ticks };
}
