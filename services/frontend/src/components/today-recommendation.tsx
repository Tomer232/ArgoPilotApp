import { Droplets, Leaf } from "lucide-react";
import { LevelBar } from "@/components/level-bar";
import { PendingArea, SoilSelect, TriggerSelect } from "@/components/plan-controls";
import { Pill } from "@/components/pill";
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
 * the two choices that change it, and the soil water with the drip system's numbers under it.
 */
export function TodayRecommendation({ plan, query, cropName }: { plan: Plan; query: PlanQuery; cropName: string }) {
  const today = plan.days[0];
  const irrigate = today.run_minutes > 0;
  return (
    <section aria-labelledby="today" className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
        <h2 id="today" className="font-semibold">
          Today <span className="ml-1 font-normal text-muted-foreground">{formatDay(today.date)}</span>
        </h2>
        {today.stale && <StaleLabel />}
      </div>

      <div className="grid gap-6 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_17rem]">
        <PendingArea>{irrigate ? <WaterToday day={today} /> : <NoIrrigationToday />}</PendingArea>
        <div key={JSON.stringify(query)} className="grid content-start gap-4">
          <SoilSelect rows={getSoilFeelRows(plan.soil_id)} chosen={query.start_pct} />
          <TriggerSelect triggerPct={plan.trigger_pct} cropTriggerPct={plan.crop_trigger_pct} />
          <ChoiceNote plan={plan} query={query} cropName={cropName} />
        </div>
      </div>

      <PendingArea className="border-t bg-muted/40 px-4 py-4 sm:px-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground">Soil water at the end of today</span>
          <span className="font-medium">
            {today.bucket_end_mm} <span className="font-normal text-muted-foreground">of {today.bucket_capacity_mm} mm</span>
          </span>
        </div>
        <LevelBar day={today} className="mt-2.5" />
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Fact label="Trigger" value={`${plan.trigger_pct}%`} note={`${today.trigger_mm} mm`} />
          <Fact label="Drip rate" value={`${plan.drip_mm_per_hour} mm/h`} />
          <Fact label={`Refill from ${plan.trigger_pct}%`} value={formatDuration(refillMinutes(plan, today))} />
          <Fact label="Forecast from" value={formatFetchedAt(plan.forecast_fetched_at)} />
        </dl>
        {plan.days.some((day) => day.capped) && (
          <p className="mt-3 text-muted-foreground">
            Some days need more than 24 h of watering, so the plan spreads it over the following days.
          </p>
        )}
      </PendingArea>
    </section>
  );
}

/** How long the drip system takes to fill the bucket from the trigger to full, today. */
function refillMinutes(plan: Plan, today: PlanDay): number {
  const refillMm = (today.bucket_capacity_mm * (100 - plan.trigger_pct)) / 100;
  return (refillMm / plan.drip_mm_per_hour) * 60;
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

/** One number with its label. */
function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">
        {value}
        {note && <span className="ml-1 text-xs font-normal text-muted-foreground">{note}</span>}
      </dd>
    </div>
  );
}
