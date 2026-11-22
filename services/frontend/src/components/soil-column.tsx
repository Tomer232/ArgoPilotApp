import type { PlanDay } from "@/lib/planner";

/**
 * Today's soil water as an upright column of soil: light beige, darker (wet) below a dashed line at
 * the water level, the level in blue as a percentage, and a tick with the trigger on the right.
 * The wet part grows from the bottom, so a new value slides to its place.
 */
export function SoilColumn({ day, triggerPct }: { day: PlanDay; triggerPct: number }) {
  const levelPercent = toPercent(day.bucket_end_mm, day.bucket_capacity_mm);
  const triggerPercent = toPercent(day.trigger_mm, day.bucket_capacity_mm);
  // The number sits just above the line, or just below it when the line is near the top.
  const textAbove = levelPercent < 80;
  const label =
    `Soil water at the end of today: ${Math.round(levelPercent)}%, ${day.bucket_end_mm} of ${day.bucket_capacity_mm} mm. ` +
    `Irrigation starts below ${triggerPct}%.`;
  return (
    <div className="grid justify-items-center gap-2 text-center">
      <span className="max-w-32 text-xs text-muted-foreground">Soil water at the end of today</span>
      <div role="img" aria-label={label} className="relative h-44 w-20">
        <div className="absolute inset-0 overflow-hidden rounded-lg border border-beige-wet bg-beige">
          <div
            className="absolute inset-x-0 bottom-0 bg-beige-wet transition-[height] duration-300"
            style={{ height: `${levelPercent}%` }}
          />
          <div
            className="absolute inset-x-0 border-t-2 border-dashed border-foreground/70"
            style={{ bottom: `${levelPercent}%` }}
          />
          <span
            className="absolute inset-x-0 text-lg font-semibold text-water"
            style={textAbove ? { bottom: `calc(${levelPercent}% + 4px)` } : { top: `calc(${100 - levelPercent}% + 4px)` }}
          >
            {Math.round(levelPercent)}%
          </span>
        </div>
        <div
          aria-hidden
          className="absolute -right-1 flex translate-x-full translate-y-1/2 items-center gap-1 text-xs text-muted-foreground"
          style={{ bottom: `${triggerPercent}%` }}
        >
          <span className="h-0.5 w-2.5 bg-foreground/80" />
          {triggerPct}%
        </div>
      </div>
      <span className="text-sm font-medium">
        {day.bucket_end_mm} <span className="font-normal text-muted-foreground">of {day.bucket_capacity_mm} mm</span>
      </span>
    </div>
  );
}

/** part / whole as a percentage, kept between 0 and 100 so the column never spills out. */
function toPercent(part: number, whole: number): number {
  return Math.min(100, Math.max(0, (part / whole) * 100));
}
