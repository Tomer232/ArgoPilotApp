import { Droplets, Leaf } from "lucide-react";
import { BucketGauge } from "@/components/bucket-gauge";
import { Panel } from "@/components/panel";
import { Pill } from "@/components/pill";
import { StaleLabel } from "@/components/stale-label";
import { formatDay, formatDuration, formatFetchedAt, formatLitres } from "@/lib/format";
import type { Plan, PlanDay } from "@/lib/planner";

/** Today's answer, first and big: "Water for 38 min" or "No irrigation today" (FR-2.16). */
export function TodayRecommendation({ plan }: { plan: Plan }) {
  const today = plan.days[0];
  const irrigate = today.run_minutes > 0;
  return (
    <Panel
      id="today"
      title={`Today, ${formatDay(today.date)}`}
      action={irrigate ? <Pill tone="water">Irrigate</Pill> : <Pill tone="leaf">No irrigation</Pill>}
    >
      {irrigate ? <WaterToday day={today} /> : <NoIrrigationToday />}
      {today.stale && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-stale">
          <StaleLabel />
          <span>Weather from {formatFetchedAt(plan.forecast_fetched_at)}. It could not be refreshed.</span>
        </div>
      )}
      <div className="mt-5 border-t pt-4">
        <p className="flex justify-between">
          <span className="text-muted-foreground">Soil water at end of day</span>
          <span className="font-medium tabular-nums">
            {today.bucket_end_mm} of {today.bucket_capacity_mm} mm
          </span>
        </p>
        <BucketGauge day={today} className="mt-2" />
        <p className="mt-2 text-xs text-muted-foreground">
          The mark is the trigger ({plan.trigger_pct}%, {today.trigger_mm} mm). Below it, the plan irrigates.
        </p>
      </div>
    </Panel>
  );
}

/** The irrigation answer: run time, big, then the water it gives. */
function WaterToday({ day }: { day: PlanDay }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-water-soft text-water">
        <Droplets aria-hidden className="size-5" />
      </span>
      <div>
        <p className="text-muted-foreground">Water for</p>
        <p className="text-4xl leading-tight font-semibold tracking-tight text-water tabular-nums">
          {formatDuration(day.run_minutes)}
        </p>
        <p className="mt-1 tabular-nums">
          {formatLitres(day.litres)} on the plot, {day.irrigation_mm} mm of water
        </p>
        {day.capped && (
          <p className="mt-2 text-muted-foreground">
            This is the most the drip system can give in 24 hours. The soil ends the day below full.
          </p>
        )}
      </div>
    </div>
  );
}

/** The no-irrigation answer. */
function NoIrrigationToday() {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-leaf-soft text-leaf">
        <Leaf aria-hidden className="size-5" />
      </span>
      <div>
        <p className="text-3xl leading-tight font-semibold tracking-tight text-leaf">No irrigation today</p>
        <p className="mt-1 text-muted-foreground">The soil still holds enough water for the crop.</p>
      </div>
    </div>
  );
}
