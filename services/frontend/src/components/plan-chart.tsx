"use client";

// The 7-day plan as a chart (Y26): the soil water at the end of each day, the trigger it must not
// fall below, and the water the plan gives. A client component because Recharts draws in the browser.

import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { StaleLabel } from "@/components/stale-label";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatWeekday } from "@/lib/format";
import type { PlanDay } from "@/lib/planner";

const config = {
  soil: { label: "Soil water mm", color: "var(--soil)" },
  trigger: { label: "Trigger mm", color: "var(--foreground)" },
  water: { label: "Water given mm", color: "var(--water)" },
} satisfies ChartConfig;

/** One point per day. A day from a stale forecast gets a "*" after its name (FR-2.17). */
function chartRows(days: PlanDay[]) {
  return days.map((day, index) => ({
    label: `${index === 0 ? "Today" : formatWeekday(day.date)}${day.stale ? " *" : ""}`,
    soil: day.bucket_end_mm,
    trigger: day.trigger_mm,
    water: day.irrigation_mm,
  }));
}

/** The top of the mm axis: the largest bucket in the plan, rounded up to a multiple of 20 so the ticks are round. */
function axisTop(days: PlanDay[]): number {
  return Math.ceil(Math.max(...days.map((day) => day.bucket_capacity_mm)) / 20) * 20;
}

/** Soil water as a line, the trigger as a dashed line, and the water given as bars, all in mm. */
export function PlanChart({ days }: { days: PlanDay[] }) {
  const anyStale = days.some((day) => day.stale);
  return (
    <div className="px-4 pt-2 pb-4 sm:px-5">
      {anyStale && (
        <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <StaleLabel /> Days marked * use an old forecast.
        </p>
      )}
      <ChartContainer config={config} className="aspect-auto h-72 w-full">
        <ComposedChart data={chartRows(days)} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} domain={[0, axisTop(days)]} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="water" fill="var(--color-water)" radius={4} maxBarSize={28} isAnimationActive={false} />
          <Line dataKey="soil" stroke="var(--color-soil)" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
          <Line dataKey="trigger" stroke="var(--color-trigger)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
