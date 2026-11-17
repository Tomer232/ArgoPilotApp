import type { ReactNode } from "react";
import { Panel } from "@/components/panel";
import { formatDuration } from "@/lib/format";
import type { Plan } from "@/lib/planner";

/**
 * What the drip system can do and what the plan assumed: its rate, how long refilling takes
 * today, the trigger and the starting level. When a day is capped, says the plan spreads the
 * water over the following days.
 */
export function SetupNotice({ plan }: { plan: Plan }) {
  const today = plan.days[0];
  const refillMm = (today.bucket_capacity_mm * (100 - plan.trigger_pct)) / 100;
  const refillMinutes = (refillMm / plan.drip_mm_per_hour) * 60;
  return (
    <Panel id="drip" title="Your drip system">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Fact label="Drip rate" value={`${plan.drip_mm_per_hour} mm/h`} />
        <Fact label={`Refill ${plan.trigger_pct}% to full`} value={formatDuration(refillMinutes)} />
        <Fact label="Trigger" value={`${plan.trigger_pct}%`} note={`${today.trigger_mm} mm`} />
        <Fact label="Soil today" value={`${plan.start_pct}%`} note="at the start" />
      </dl>
      {plan.days.some((day) => day.capped) && (
        <p className="mt-4 rounded-lg bg-muted px-3 py-2">
          Some days need more than 24 h of watering, so the plan spreads it over the following days.
        </p>
      )}
    </Panel>
  );
}

/** One number with its label, like a P1 KPI. */
function Fact({ label, value, note }: { label: string; value: string; note?: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight tabular-nums">
        {value}
        {note && <small className="ml-1 text-xs font-normal text-muted-foreground">{note}</small>}
      </dd>
    </div>
  );
}
