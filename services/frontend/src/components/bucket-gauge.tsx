import type { PlanDay } from "@/lib/planner";
import { cn } from "@/lib/utils";

/**
 * The soil bucket at the end of one day: how full it is, with a mark at the
 * half-full trigger. Below the mark, the plan irrigates.
 */
export function BucketGauge({ day, className }: { day: PlanDay; className?: string }) {
  const fillPercent = toPercent(day.bucket_end_mm, day.bucket_capacity_mm);
  const triggerPercent = toPercent(day.trigger_mm, day.bucket_capacity_mm);
  const label =
    `Soil water ${day.bucket_end_mm} of ${day.bucket_capacity_mm} mm. ` +
    `Irrigation starts below ${day.trigger_mm} mm.`;
  return (
    <div role="img" aria-label={label} className={cn("relative h-3 rounded-sm bg-soil/15", className)}>
      <div className="h-full rounded-sm bg-soil" style={{ width: `${fillPercent}%` }} />
      <div
        className="absolute -top-1 -bottom-1 w-0.5 bg-foreground"
        style={{ left: `${triggerPercent}%` }}
      />
    </div>
  );
}

/** part / whole as a percentage, kept between 0 and 100 so the bar never spills out. */
function toPercent(part: number, whole: number): number {
  return Math.min(100, Math.max(0, (part / whole) * 100));
}
