import { BucketGauge } from "@/components/bucket-gauge";
import { Panel } from "@/components/panel";
import { Pill } from "@/components/pill";
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
// Header cells in the P1 style: small and muted.
const HEAD = "h-9 text-xs font-medium text-muted-foreground";

/** The 7-day plan, one row per day. Stale days carry the label next to their numbers (FR-2.17). */
export function PlanTable({ plan }: { plan: Plan }) {
  return (
    <Panel id="plan" title={`Next ${plan.days.length} days`} hint="weather, crop need and water" flush>
      <Table className="tabular-nums">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={`${HEAD} pl-4`}>Day</TableHead>
            <TableHead className={`${HEAD} ${WIDE} text-right`}>ET0 mm</TableHead>
            <TableHead className={`${HEAD} ${WIDE} text-right`}>Rain mm</TableHead>
            <TableHead className={`${HEAD} ${WIDE} text-right`}>Kc</TableHead>
            <TableHead className={`${HEAD} ${WIDE} text-right`}>Need mm</TableHead>
            <TableHead className={HEAD}>Water</TableHead>
            <TableHead className={`${HEAD} ${WIDE} text-right`}>Litres</TableHead>
            <TableHead className={`${HEAD} pr-4`}>Soil water mm</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plan.days.map((day, index) => (
            <TableRow key={day.date}>
              <TableCell className="py-2.5 pl-4">
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
                    <Pill tone="water">{formatDuration(day.run_minutes)}</Pill>
                    {day.capped && <span className="mt-0.5 block text-xs text-muted-foreground">Most in 24 h</span>}
                  </>
                ) : (
                  <Pill tone="leaf">No need</Pill>
                )}
              </TableCell>
              <TableCell className={`${WIDE} text-right`}>
                {formatLitres(day.litres)}
              </TableCell>
              <TableCell className="pr-4">
                <span className="flex items-center gap-2">
                  <BucketGauge day={day} className="w-20 sm:w-28" />
                  <span>{day.bucket_end_mm}</span>
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="border-t px-4 py-3 text-xs text-muted-foreground">
        Soil water is what the root zone holds at the end of the day. The mark on each bar is the
        trigger ({plan.trigger_pct}% of the bucket): the plan irrigates before the soil falls below it.
      </p>
    </Panel>
  );
}
