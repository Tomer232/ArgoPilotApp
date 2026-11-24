"use client";

// The 7-day plan as a chart (Y26): the soil water at the end of each day, the full bucket, the
// trigger it must not fall below, and the water the plan gives, all in mm (O131).
// A day that ends below the trigger gets an amber point, as the table's bar turns amber (O142).
// The tooltip lists the values highest first, the same top-to-bottom order as the chart (O143).
// On a watering day the tooltip also shows where the soil would end without water, the level the
// trigger was checked against, since the line only shows the level after watering (O144).
// A client component because Recharts draws in the browser.

import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { StaleLabel } from "@/components/stale-label";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { mmAxis } from "@/lib/chart-axis";
import { formatWeekday } from "@/lib/format";
import type { PlanDay } from "@/lib/planner";

const config = {
  soil: { label: "Soil water mm", color: "var(--soil)" },
  full: { label: "Full bucket mm", color: "var(--muted-foreground)" },
  trigger: { label: "Trigger mm", color: "var(--foreground)" },
  water: { label: "Water given mm", color: "var(--water)" },
  dry: { label: "Without water mm", color: "var(--low)" },
} satisfies ChartConfig;

/** One point per day. A day from a stale forecast gets a "*" after its name (FR-2.17). */
function chartRows(days: PlanDay[]) {
  return days.map((day, index) => ({
    label: `${index === 0 ? "Today" : formatWeekday(day.date)}${day.stale ? " *" : ""}`,
    soil: day.bucket_end_mm,
    full: day.bucket_capacity_mm,
    trigger: day.trigger_mm,
    water: day.irrigation_mm,
    below: day.bucket_end_mm < day.trigger_mm,
    dry: day.irrigation_mm > 0 ? Math.round((day.bucket_end_mm - day.irrigation_mm) * 100) / 100 : undefined,
  }));
}

type DotProps = { cx?: number; cy?: number; index?: number; payload?: { below: boolean } };

/** The soil line's point for one day: amber when the day ends below the trigger, blue otherwise. */
function SoilDot({ cx, cy, index, payload }: DotProps) {
  if (cx === undefined || cy === undefined) return null;
  const color = payload?.below ? "var(--low)" : "var(--color-soil)";
  return <circle key={index} cx={cx} cy={cy} r={payload?.below ? 4 : 3} fill="var(--background)" stroke={color} strokeWidth={3} />;
}


type TooltipItem = { value?: unknown; payload?: { dry?: number } };

/** Adds a "Without water" row on a watering day: the level the day would end at with no water. */
function withWithoutWater<T extends TooltipItem>(items: readonly T[] = []): T[] {
  const dry = items[0]?.payload?.dry;
  if (dry === undefined) return [...items];
  const row = { name: "dry", dataKey: "dry", value: dry, color: "var(--color-dry)", payload: items[0].payload };
  return [...items, row as unknown as T];
}

/** The tooltip's rows, highest value first, so they read in the chart's top-to-bottom order. */
function byValueHighFirst<T extends TooltipItem>(items: readonly T[] = []): T[] {
  return [...items].sort((a, b) => Number(b.value) - Number(a.value));
}

/** Soil water as a line (amber points below the trigger), the full bucket as a dotted line, the
 * trigger as a dashed line, and the water given as bars, all in mm. */
export function PlanChart({ days }: { days: PlanDay[] }) {
  const anyStale = days.some((day) => day.stale);
  const axis = mmAxis(Math.max(...days.map((day) => day.bucket_capacity_mm)));
  return (
    <div className="px-4 pt-2 pb-4 sm:px-5">
      {anyStale && (
        <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <StaleLabel /> Days marked * use an old forecast.
        </p>
      )}
      <ChartContainer config={config} className="aspect-auto h-72 w-full">
        <ComposedChart data={chartRows(days)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} domain={[0, axis.top]} ticks={axis.ticks} unit=" mm" />
          <ChartTooltip content={({ active, label, payload }) => (
              <ChartTooltipContent active={active} label={label} payload={byValueHighFirst(withWithoutWater(payload))} />
            )} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="water" fill="var(--color-water)" radius={4} maxBarSize={28} isAnimationActive={false} />
          <Line dataKey="soil" stroke="var(--color-soil)" strokeWidth={3} dot={<SoilDot />} isAnimationActive={false} />
          <Line dataKey="full" stroke="var(--color-full)" strokeWidth={1.5} strokeDasharray="1 3" dot={false} isAnimationActive={false} />
          <Line dataKey="trigger" stroke="var(--color-trigger)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ChartContainer>
      <p className="mt-2 text-xs text-muted-foreground">An amber point is a day that ends below the trigger.</p>
    </div>
  );
}
