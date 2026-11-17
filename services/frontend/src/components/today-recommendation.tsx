import { BucketGauge } from "@/components/bucket-gauge";
import { StaleLabel } from "@/components/stale-label";
import { formatDay, formatFetchedAt, formatLitres, splitDuration } from "@/lib/format";
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
          The mark is the trigger ({plan.trigger_pct}%, {today.trigger_mm} mm). Below it, the plan irrigates.
        </p>
      </div>
    </section>
  );
}

/** The irrigation answer: run time, big, then the water it gives. */
function WaterToday({ day }: { day: PlanDay }) {
  const { hours, minutes } = splitDuration(day.run_minutes);
  return (
    <>
      <p className="mt-1 text-water">
        <span className="block text-xl font-semibold">Water for</span>
        {hours > 0 && <DurationPart value={hours} unit="h" />}
        {(minutes > 0 || hours === 0) && <DurationPart value={minutes} unit="min" />}
      </p>
      <p className="mt-2 tabular-nums">
        {formatLitres(day.litres)} on the plot, {day.irrigation_mm} mm of water
      </p>
      {day.capped && (
        <p className="mt-2 text-sm">
          This is the most the drip system can give in 24 hours. The soil ends the day below full.
        </p>
      )}
    </>
  );
}

/** One part of the run time, big number then small unit: "10" "h". */
function DurationPart({ value, unit }: { value: number; unit: string }) {
  return (
    <span className="mr-3 inline-block whitespace-nowrap">
      <span className="font-stretch-expanded text-7xl leading-none font-extrabold tabular-nums">{value}</span>{" "}
      <span className="font-stretch-expanded text-3xl font-bold">{unit}</span>
    </span>
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
