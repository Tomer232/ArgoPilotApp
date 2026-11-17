import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PlanTable } from "@/components/plan-table";
import { PlotNotFound } from "@/components/plot-not-found";
import { ProblemNotice } from "@/components/problem-notice";
import { SetupNotice } from "@/components/setup-notice";
import { SoilLevelPicker } from "@/components/soil-level-picker";
import { TodayRecommendation } from "@/components/today-recommendation";
import { TriggerPicker } from "@/components/trigger-picker";
import { WateringTimeline } from "@/components/watering-timeline";
import { formatArea } from "@/lib/format";
import type { Result } from "@/lib/http";
import { getPlan } from "@/lib/planner";
import type { PlanQuery } from "@/lib/plan-query";
import { getPlot, listCrops } from "@/lib/registry";

/** The plot page: today's recommendation first, then the 7-day plan (FR-2.16). */
export default function PlotPage({ params, searchParams }: PageProps<"/plots/[id]">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
      <Link href="/" className="mb-3 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
        <ChevronLeft aria-hidden className="size-4" />
        All plots
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Loading the plan</p>}>
        {Promise.all([params, searchParams]).then(([{ id }, query]) => (
          <PlotPlan
            plotId={id}
            query={{
              start_pct: firstValue(query.start_pct),
              trigger_pct: firstValue(query.trigger_pct),
              start: firstValue(query.start),
            }}
          />
        ))}
      </Suspense>
    </main>
  );
}

/** One query value as text: the first one if it is repeated, undefined if it is missing. */
function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Load the plot, its plan and the crop names at the same time, then show what arrived. */
async function PlotPlan({ plotId, query }: { plotId: string; query: PlanQuery }) {
  const [plot, plan, crops] = await Promise.all([
    getPlot(plotId),
    getPlan(plotId, query.start_pct, query.trigger_pct),
    listCrops(),
  ]);
  if (isNotFound(plot) || isNotFound(plan)) {
    return <PlotNotFound />;
  }

  // The name and crop are a nice-to-have: if the registry fails here, the plan still shows.
  const cropName =
    plot.ok && crops.ok ? crops.data.find((crop) => crop.id === plot.data.crop_id)?.name : null;
  return (
    <>
      <PageHeader
        title={plot.ok ? plot.data.name : "Plot"}
        subtitle={
          plot.ok &&
          `${cropName ?? plot.data.crop_id} · ${formatArea(plot.data.area_m2)}` +
            (plan.ok ? ` · ${plan.data.days[0].stage} stage` : "")
        }
      />
      <div>
        {plan.ok ? (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3.5">
            <div className="grid items-start gap-3.5 lg:grid-cols-[1.4fr_1fr]">
              <TodayRecommendation plan={plan.data} />
              <SetupNotice plan={plan.data} />
            </div>
            <div className="grid items-start gap-3.5 lg:grid-cols-2">
              <SoilLevelPicker soilId={plan.data.soil_id} startPct={plan.data.start_pct} query={query} />
              <TriggerPicker plan={plan.data} cropName={cropName ?? plan.data.crop_id} query={query} />
            </div>
            <PlanTable plan={plan.data} />
            <WateringTimeline plan={plan.data} query={query} />
          </div>
        ) : (
          <>
            <ProblemNotice title="The plan can't be calculated right now" problem={plan.problem} />
            {(query.start_pct !== undefined || query.trigger_pct !== undefined) && (
              <p className="mt-3 text-sm">
                <Link href="?" className="font-medium text-water underline underline-offset-4">
                  Plan with the default choices
                </Link>
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}

/** True when the service answered 404: the plot does not exist. */
function isNotFound(result: Result<unknown>): boolean {
  return !result.ok && result.problem.status === 404;
}
