import { BucketGauge } from "@/components/bucket-gauge";
import { StaleLabel } from "@/components/stale-label";
import { formatDay, formatFetchedAt, formatLitres } from "@/lib/format";
import type { Plan, PlanDay } from "@/lib/planner";

/** Today's answer, first and big: "Water for 38 min" or "No irrigation today" (FR-2.16). */
export function TodayRecommendation({ plan }: { plan: Plan }) {
  const today = plan.days[0];
  return (
    <section aria-labelledby="today" className="rounded-md border bg-card p-5">
      <h2 id="today" className="text-sm text-muted-foreground">
        Today, {formatDay(today.date)}
      </h2>
      {today.run_minutes > 0 ? <WaterToday day={today} /> : <NoIrrigationToday />}
      {today.stale && (
        <p className="mt-3 text-sm">
          <StaleLabel />
          <span className="block text-stale">
            Weather from {formatFetchedAt(plan.forecast_fetched_at)}. It could not be refreshed.
          </span>
        </p>
      )}
      <div className="mt-5">
        <p className="flex justify-between text-sm">
          <span>Soil water at end of day</span>
          <span className="tabular-nums">
            {today.bucket_end_mm} of {today.bucket_capacity_mm} mm
          </span>
        </p>
        <BucketGauge day={today} className="mt-1.5" />
        <p className="mt-1.5 text-xs text-muted-foreground">
          The mark is half full ({today.trigger_mm} mm). Below it, the plan irrigates.
        </p>
      </div>
    </section>
  );
}

/** The irrigation answer: run time, big, then the water it gives. */
function WaterToday({ day }: { day: PlanDay }) {
  return (
    <>
      <p className="mt-1 text-water">
        <span className="block text-xl font-semibold">Water for</span>
        <span className="font-stretch-expanded text-7xl leading-none font-extrabold tabular-nums">
          {day.run_minutes}
        </span>{" "}
        <span className="font-stretch-expanded text-3xl font-bold">min</span>
      </p>
      <p className="mt-2 tabular-nums">
        {formatLitres(day.litres)} on the plot, {day.irrigation_mm} mm of water
      </p>
    </>
  );
}

/** The no-irrigation answer. */
function NoIrrigationToday() {
  return (
    <>
      <p className="mt-1 font-stretch-expanded text-3xl font-bold text-leaf sm:text-4xl">
        No irrigation today
      </p>
      <p className="mt-2">The soil still holds enough water for the crop.</p>
    </>
  );
}
