import { LevelBar } from "@/components/level-bar";
import { PendingArea, PendingSpinner, StartSelect, ViewToggle } from "@/components/plan-controls";
import { Pill } from "@/components/pill";
import { PlanChart } from "@/components/plan-chart";
import { RunList } from "@/components/run-list";
import { StaleLabel } from "@/components/stale-label";
import { TimelineBar } from "@/components/timeline-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDay, formatDuration, formatLitres } from "@/lib/format";
import type { Plan } from "@/lib/planner";
import type { PlanQuery } from "@/lib/plan-query";
import { buildWindows, parseStart, timelineEnd } from "@/lib/timeline";

// Columns that only fit on wider screens. On a phone the table keeps Day, Water and Soil water.
const WIDE = "hidden md:table-cell";
// Header cells: small and muted.
const HEAD = "h-9 text-xs font-medium text-muted-foreground";

/**
 * The second card: the next days as a watering timeline (Y16), then as a table (FR-2.16) or a chart (Y26).
 * Stale days carry the label next to their numbers (FR-2.17).
 */
export function WeekPlan({ plan, query }: { plan: Plan; query: PlanQuery }) {
  const start = parseStart(query.start);
  return (
    <section aria-labelledby="week" className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
        <h2 id="week" className="font-semibold">
          Next {plan.days.length} days
        </h2>
        <span className="flex items-center gap-3">
          <PendingSpinner />
          <StartSelect start={start.text} />
        </span>
      </div>
      <PendingArea>
        <div className="px-4 pt-4 pb-5 sm:px-5">
          {start.invalid && (
            <p className="mb-3 rounded-md bg-stale-soft px-2.5 py-1.5 text-xs text-stale">
              The start time in the address is not a time (HH:MM), so {start.text} is used.
            </p>
          )}
          <Timeline plan={plan} startMinutes={start.minutes} />
        </div>
        <div className="flex items-center justify-between gap-2 border-t px-4 py-2 sm:px-5">
          <span className="text-xs text-muted-foreground">Day by day</span>
          <ViewToggle chart={query.view === "chart"} />
        </div>
        {query.view === "chart" ? <PlanChart days={plan.days} /> : <DayTable plan={plan} />}
      </PendingArea>
    </section>
  );
}

/**
 * The waterings on one bar that starts at 00:00 today and ends just after the last run (timelineEnd),
 * so the bar is always the same width but its time span changes. A small mark every hour, a taller
 * one at midnight; the marks lie on top of the blue so they show through. Each run's start and end
 * time is written above the bar, the bar's two ends and the day names under it, and every run in
 * full in the list below. Hovering the bar shows the time under the pointer (TimelineBar). A run from a stale day has the stale label beside its text (FR-2.17, QA-2).
 * On the plan's first day a "now" line marks the grower's clock (Y18); the list notes a start time
 * that has passed (Y18) and a run that goes past midnight (Y19).
 */
function Timeline({ plan, startMinutes }: { plan: Plan; startMinutes: number }) {
  const windows = buildWindows(plan.days, startMinutes);
  const firstDate = plan.days[0].date;
  const end = timelineEnd(windows, plan.days.length);
  return (
    <div>
      <TimelineBar windows={windows} end={end} firstDate={firstDate} />
      {windows.length === 0 ? (
        <p className="mt-3 text-muted-foreground">No watering in these days.</p>
      ) : (
        <RunList windows={windows} firstDate={firstDate} />
      )}
    </div>
  );
}

/** The plan, one row per day. */
function DayTable({ plan }: { plan: Plan }) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={`${HEAD} pl-4 sm:pl-5`}>Day</TableHead>
            <TableHead className={`${HEAD} ${WIDE} text-right`}>ET0 mm</TableHead>
            <TableHead className={`${HEAD} ${WIDE} text-right`}>Rain mm</TableHead>
            <TableHead className={`${HEAD} ${WIDE} text-right`}>Kc</TableHead>
            <TableHead className={`${HEAD} ${WIDE} text-right`}>Need mm</TableHead>
            <TableHead className={HEAD}>Water</TableHead>
            <TableHead className={`${HEAD} ${WIDE} text-right`}>Litres</TableHead>
            <TableHead className={`${HEAD} pr-4 sm:pr-5`}>Soil water mm</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plan.days.map((day, index) => (
            <TableRow key={day.date} className="hover:bg-muted/40">
              <TableCell className="py-2.5 pl-4 sm:pl-5">
                <span className="block font-medium">{index === 0 ? "Today" : formatDay(day.date)}</span>
                {day.stale && <StaleLabel />}
              </TableCell>
              <TableCell className={`${WIDE} text-right`}>{day.et0_mm}</TableCell>
              <TableCell className={`${WIDE} text-right`}>{day.rain_mm}</TableCell>
              <TableCell className={`${WIDE} text-right`}>{day.kc}</TableCell>
              <TableCell className={`${WIDE} text-right`}>{day.need_mm}</TableCell>
              <TableCell>
                {day.run_minutes > 0 ? (
                  <>
                    <Pill tone="water">{formatDuration(day.run_minutes)}</Pill>
                    {day.capped && <span className="mt-0.5 block text-xs text-muted-foreground">Most in 24 h</span>}
                  </>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </TableCell>
              <TableCell className={`${WIDE} text-right`}>{formatLitres(day.litres)}</TableCell>
              <TableCell className="pr-4 sm:pr-5">
                <span className="flex items-center gap-2.5">
                  <LevelBar day={day} className="w-16 sm:w-28" />
                  <span>{day.bucket_end_mm}</span>
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="border-t px-4 py-3 text-xs text-muted-foreground sm:px-5">
        Soil water is what the root zone holds at the end of each day. The mark on each bar is the trigger (
        {plan.trigger_pct}% of the bucket): the plan waters before the soil falls below it.
      </p>
    </>
  );
}
