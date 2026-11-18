import { Droplets, Leaf } from "lucide-react";
import { PendingArea, PendingSpinner, SoilSelect, TriggerSelect } from "@/components/plan-controls";
import { Pill } from "@/components/pill";
import { SoilColumn } from "@/components/soil-column";
import { StaleLabel } from "@/components/stale-label";
import { formatDay, formatDuration, formatFetchedAt, formatLitres } from "@/lib/format";
import type { Plan, PlanDay } from "@/lib/planner";
import type { PlanQuery } from "@/lib/plan-query";
import { getSoilFeelRows } from "@/lib/soil-feel";

// FAO-56 (Ch. 8) gives p, the share of the bucket a crop can use up, from 0.30 to 0.70.
const USUAL_MIN_PCT = 30;
const USUAL_MAX_PCT = 70;

/**
 * The first card: today's answer, big ("Water for 38 min" or "No irrigation today", FR-2.16),
 * today's soil water as an upright column between them, and the two choices that change it.
 * Each number sits next to what it explains: the forecast time in the header, the drip system's
 * numbers under the answer, the trigger in mm under the trigger choice.
 */
export function TodayRecommendation({ plan, query, cropName }: { plan: Plan; query: PlanQuery; cropName: string }) {
  const today = plan.days[0];
  const irrigate = today.run_minutes > 0;
  return (
    <section aria-labelledby="today" className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h2 id="today" className="font-semibold">
            Today <span className="ml-1 font-normal text-muted-foreground">{formatDay(today.date)}</span>
          </h2>
          <span className="text-xs text-muted-foreground">Forecast from {formatFetchedAt(plan.forecast_fetched_at)}</span>
        </div>
        <span className="flex items-center gap-3">
          <PendingSpinner />
          {today.stale && <StaleLabel />}
        </span>
      </div>

      <div className="grid gap-6 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_auto_17rem]">
        <PendingArea>
          {irrigate ? <WaterToday day={today} /> : <NoIrrigationToday />}
          <DripFacts plan={plan} today={today} />
        </PendingArea>
        <PendingArea className="justify-self-center pr-8">
          <SoilColumn day={today} triggerPct={plan.trigger_pct} />
        </PendingArea>
        <div key={JSON.stringify(query)} className="grid content-start gap-4">
          <SoilSelect rows={getSoilFeelRows(plan.soil_id)} chosen={query.start_pct} />
          <TriggerSelect triggerPct={plan.trigger_pct} cropTriggerPct={plan.crop_trigger_pct} />
          <ChoiceNote plan={plan} query={query} cropName={cropName} />
        </div>
      </div>

    </section>
  );
}

/** How long the drip system takes to fill the bucket from the trigger to full, today. */
function refillMinutes(plan: Plan, today: PlanDay): number {
  const refillMm = (today.bucket_capacity_mm * (100 - plan.trigger_pct)) / 100;
  return (refillMm / plan.drip_mm_per_hour) * 60;
}

/** Under the answer: the drip system's rate, how long a refill from the trigger takes, and the 24 h spread. */
function DripFacts({ plan, today }: { plan: Plan; today: PlanDay }) {
  return (
    <div className="mt-4 grid gap-1 text-xs text-muted-foreground">
      {plan.drip_mm_per_hour > 0 ? (
        <p>
          Drip rate <span className="font-medium text-foreground">{plan.drip_mm_per_hour} mm/h</span>
          {" · "}refill from {plan.trigger_pct}% to full{" "}
          <span className="font-medium text-foreground">{formatDuration(refillMinutes(plan, today))}</span>
        </p>
      ) : (
        // The planner rounds the rate to 2 decimals, so a very slow drip arrives as 0 (QA-2).
        <p>
          Drip rate <span className="font-medium text-foreground">under 0.01 mm/h</span>
        </p>
      )}
      {plan.days.some((day) => day.capped) && (
        // A capped day is not carried over: the next day waters only if the soil falls below the trigger (QA-7).
        <p>
          Days marked &ldquo;Most in 24 h&rdquo; need more than the drip gives in a day: it runs all 24 hours and the soil
          ends that day below full.
        </p>
      )}
    </div>
  );
}

/** The irrigation answer: run time, big, then the water it gives. */
function WaterToday({ day }: { day: PlanDay }) {
  return (
    <div>
      <Pill tone="water">
        <Droplets aria-hidden />
        Irrigate
      </Pill>
      <p className="mt-3 text-muted-foreground">Water for</p>
      <p className="tight text-5xl leading-none font-semibold text-water sm:text-6xl">{formatDuration(day.run_minutes)}</p>
      <p className="mt-3">
        {formatLitres(day.litres)} on the plot <span className="text-muted-foreground">({day.irrigation_mm} mm of water)</span>
      </p>
      {day.capped && (
        <p className="mt-2 max-w-[60ch] text-muted-foreground">
          That is the most the drip system gives in 24 hours, so the soil ends the day below full.
        </p>
      )}
    </div>
  );
}

/** The no-irrigation answer. */
function NoIrrigationToday() {
  return (
    <div>
      <Pill tone="leaf">
        <Leaf aria-hidden />
        No irrigation
      </Pill>
      <p className="tight mt-3 text-4xl leading-tight font-semibold text-leaf sm:text-5xl">No irrigation today</p>
      <p className="mt-3 text-muted-foreground">The soil still holds enough water for the crop.</p>
    </div>
  );
}

/** Under the choices: that a chosen level is an estimate, and a warning outside the usual trigger range. */
function ChoiceNote({ plan, query, cropName }: { plan: Plan; query: PlanQuery; cropName: string }) {
  const outside = plan.trigger_pct < USUAL_MIN_PCT || plan.trigger_pct > USUAL_MAX_PCT;
  return (
    <div className="grid gap-2 text-xs">
      <p className="text-muted-foreground">
        Water starts below <span className="font-medium text-foreground">{plan.days[0].trigger_mm} mm</span> of soil
        water ({plan.trigger_pct}%).
      </p>
      <p className="text-muted-foreground">
        {query.start_pct === undefined
          ? "No soil level chosen: the plan assumes the soil is at field capacity."
          : `Soil level ${plan.start_pct}% is an estimate, not a measurement.`}
      </p>
      {outside && (
        <p role="alert" className="rounded-md bg-stale-soft px-2.5 py-1.5 text-stale">
          {plan.trigger_pct}% is outside the usual {USUAL_MIN_PCT}-{USUAL_MAX_PCT}%. For {cropName} the crop value is{" "}
          {plan.crop_trigger_pct}%.
        </p>
      )}
    </div>
  );
}
