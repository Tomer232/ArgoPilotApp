import { formatDuration } from "@/lib/format";
import type { Plan } from "@/lib/planner";

/**
 * What the drip system can do: its rate, how long refilling takes today, and, when a day is
 * capped, that the plan spreads the water over the following days.
 */
export function SetupNotice({ plan }: { plan: Plan }) {
  const today = plan.days[0];
  const refillMm = (today.bucket_capacity_mm * (100 - plan.trigger_pct)) / 100;
  const refillMinutes = (refillMm / plan.drip_mm_per_hour) * 60;
  return (
    <section aria-label="Your drip system" className="mt-4 rounded-md border bg-card p-5 text-sm">
      <p>
        Your drip system gives {plan.drip_mm_per_hour} mm per hour. Refilling from {plan.trigger_pct}% to
        full takes about {formatDuration(refillMinutes)} today.
      </p>
      {plan.days.some((day) => day.capped) && (
        <p className="mt-2 font-medium">
          Some days need more than 24 h of watering, so the plan spreads it over the following days.
        </p>
      )}
    </section>
  );
}
