import { HiddenInputs } from "@/components/hidden-inputs";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatWeekday } from "@/lib/format";
import type { Plan } from "@/lib/planner";
import type { PlanQuery } from "@/lib/plan-query";
import { barPosition, buildWindows, MINUTES_PER_DAY, parseStart, windowText } from "@/lib/timeline";

/**
 * When the watering runs: a bar with one 00:00-24:00 slice per plan day, blue where the drip
 * runs, and the same windows as text. The start time is the grower's pick (default 06:00).
 */
export function WateringTimeline({ plan, query }: { plan: Plan; query: PlanQuery }) {
  const start = parseStart(query.start);
  const windows = buildWindows(plan.days, start.minutes);
  const totalMinutes = plan.days.length * MINUTES_PER_DAY;
  const firstDate = plan.days[0].date;
  return (
    <Panel
      id="timeline"
      title="When to water"
      hint="00:00 to 24:00 each day"
      action={
        <form method="get" className="flex flex-wrap items-center gap-2">
          <HiddenInputs query={query} except="start" />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Start at
            <Input
              type="time"
              name="start"
              defaultValue={start.text}
              required
              className="h-8 w-28 bg-card! text-sm! text-foreground"
            />
          </label>
          <Button type="submit">Update plan</Button>
        </form>
      }
    >
      {start.invalid && (
        <p className="mb-3 rounded-lg bg-stale-soft px-3 py-2 text-stale">
          The start time in the address is not a time (HH:MM), so {start.text} is used.
        </p>
      )}
      <div
        role="img"
        aria-label="Watering timeline, listed below"
        className="relative h-6 overflow-hidden rounded-md bg-muted"
      >
        {windows.map((window) => (
          <div
            key={window.startMin}
            className="absolute inset-y-0 bg-water"
            style={barPosition(window, totalMinutes)}
          />
        ))}
      </div>
      <ol className="mt-1.5 flex text-xs text-muted-foreground">
        {plan.days.map((day, index) => (
          <li key={day.date} className="flex-1 border-l pl-1">
            {index === 0 ? "Today" : formatWeekday(day.date)}
          </li>
        ))}
      </ol>
      {windows.length === 0 ? (
        <p className="mt-4 text-muted-foreground">No watering in these days.</p>
      ) : (
        <ul className="mt-4 grid gap-1.5 tabular-nums">
          {windows.map((window) => (
            <li key={window.startMin} className="flex items-center gap-2">
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-water" />
              {windowText(window, firstDate)}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
