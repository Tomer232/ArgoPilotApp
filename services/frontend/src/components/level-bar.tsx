import type { PlanDay } from "@/lib/planner";
import { cn } from "@/lib/utils";

/**
 * The soil bucket at the end of one day: a pale water-blue fill for the water in the root zone,
 * a dark mark at the trigger. A day that ends below the trigger fills light amber.
 * The fill is clipped (not resized), so a new value slides to its place.
 */
export function LevelBar({ day, className }: { day: PlanDay; className?: string }) {
  const fillPercent = toPercent(day.bucket_end_mm, day.bucket_capacity_mm);
  const triggerPercent = toPercent(day.trigger_mm, day.bucket_capacity_mm);
  const below = day.bucket_end_mm < day.trigger_mm;
  const label =
    `Soil water ${day.bucket_end_mm} of ${day.bucket_capacity_mm} mm. ` +
    `Irrigation starts below ${day.trigger_mm} mm.`;
  return (
    <div role="img" aria-label={label} className={cn("relative h-2 rounded-full bg-soil-soft", className)}>
      <div
        className={cn("level-fill absolute inset-0 rounded-full", below ? "bg-low" : "bg-soil")}
        style={{ clipPath: `inset(0 ${100 - fillPercent}% 0 0 round 999px)` }}
      />
      <div
        className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-foreground/80"
        style={{ left: `${triggerPercent}%` }}
      />
    </div>
  );
}

/** part / whole as a percentage, kept between 0 and 100 so the bar never spills out. */
function toPercent(part: number, whole: number): number {
  return Math.min(100, Math.max(0, (part / whole) * 100));
}
