import { BucketGauge } from "@/components/bucket-gauge";
import { StaleLabel } from "@/components/stale-label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDay, formatDuration, formatLitres } from "@/lib/format";
import type { Plan } from "@/lib/planner";

// Columns that only fit on wider screens. On a phone the table keeps Day, Water and Soil water.
const WIDE = "hidden md:table-cell";

/** The 7-day plan, one row per day. Stale days carry the label next to their numbers (FR-2.17). */
export function PlanTable({ plan }: { plan: Plan }) {
  return (
    <section aria-labelledby="plan" className="mt-8">
      <h2 id="plan" className="text-lg font-semibold">
        Next {plan.days.length} days
      </h2>
      <Table className="mt-2 tabular-nums">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-0">Day</TableHead>
            <TableHead className={`${WIDE} text-right`}>ET0 mm</TableHead>
            <TableHead className={`${WIDE} text-right`}>Rain mm</TableHead>
            <TableHead className={`${WIDE} text-right`}>Kc</TableHead>
            <TableHead className={`${WIDE} text-right`}>Need mm</TableHead>
            <TableHead>Water</TableHead>
            <TableHead className={`${WIDE} text-right`}>Litres</TableHead>
            <TableHead className="pr-0">Soil water mm</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plan.days.map((day, index) => (
            <TableRow key={day.date} className="hover:bg-transparent">
              <TableCell className="pl-0">
                <span className="block font-medium">
                  {index === 0 ? "Today" : formatDay(day.date)}
                </span>
                {day.stale && <StaleLabel />}
              </TableCell>
              <TableCell className={`${WIDE} text-right`}>{day.et0_mm}</TableCell>
              <TableCell className={`${WIDE} text-right`}>{day.rain_mm}</TableCell>
              <TableCell className={`${WIDE} text-right`}>{day.kc}</TableCell>
              <TableCell className={`${WIDE} text-right`}>{day.need_mm}</TableCell>
              <TableCell>
                {day.run_minutes > 0 ? (
                  <>
                    <span className="font-semibold text-water">{formatDuration(day.run_minutes)}</span>
                    {day.capped && <span className="block text-xs text-muted-foreground">Most in 24 h</span>}
                  </>
                ) : (
                  <span className="text-muted-foreground">No need</span>
                )}
              </TableCell>
              <TableCell className={`${WIDE} text-right`}>
                {formatLitres(day.litres)}
              </TableCell>
              <TableCell className="pr-0">
                <span className="flex items-center gap-2">
                  <BucketGauge day={day} className="w-20 sm:w-28" />
                  <span>{day.bucket_end_mm}</span>
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-3 text-xs text-muted-foreground">
        Soil water is what the root zone holds at the end of the day. The mark on each bar is the
        trigger ({plan.trigger_pct}% of the bucket): the plan irrigates before the soil falls below it.
      </p>
    </section>
  );
}
