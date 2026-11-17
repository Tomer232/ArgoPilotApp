import { HiddenInputs } from "@/components/hidden-inputs";
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
    <section aria-labelledby="timeline" className="mt-8">
      <h2 id="timeline" className="text-lg font-semibold">
        When to water
      </h2>
      <form method="get" className="mt-2 flex flex-wrap items-end gap-2">
        <HiddenInputs query={query} except="start" />
        <label className="text-sm">
          Start watering at
          <input
            type="time"
            name="start"
            defaultValue={start.text}
            required
            className="mt-1 block w-32 rounded-md border bg-background px-2 py-1.5"
          />
        </label>
        <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground">
          Update plan
        </button>
      </form>
      {start.invalid && (
        <p className="mt-2 text-sm text-stale">
          The start time in the address is not a time (HH:MM), so {start.text} is used.
        </p>
      )}
      <div
        role="img"
        aria-label="Watering timeline, listed below"
        className="relative mt-4 h-5 overflow-hidden rounded-sm bg-muted"
      >
        {windows.map((window) => (
          <div
            key={window.startMin}
            className="absolute inset-y-0 bg-water"
            style={barPosition(window, totalMinutes)}
          />
        ))}
      </div>
      <ol className="mt-1 flex text-xs text-muted-foreground">
        {plan.days.map((day, index) => (
          <li key={day.date} className="flex-1 border-l pl-0.5">
            {index === 0 ? "Today" : formatWeekday(day.date)}
          </li>
        ))}
      </ol>
      {windows.length === 0 ? (
        <p className="mt-3 text-sm">No watering in these days.</p>
      ) : (
        <ul className="mt-3 space-y-1 text-sm tabular-nums">
          {windows.map((window) => (
            <li key={window.startMin}>{windowText(window, firstDate)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
