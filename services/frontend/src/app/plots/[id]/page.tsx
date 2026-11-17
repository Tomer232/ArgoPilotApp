import Link from "next/link";
import { Suspense } from "react";
import { PlanNavigationProvider } from "@/components/plan-controls";
import { Pill } from "@/components/pill";
import { PlotNotFound } from "@/components/plot-not-found";
import { PlotSwitcher, type SwitcherFarm } from "@/components/plot-switcher";
import { ProblemNotice } from "@/components/problem-notice";
import { TodayRecommendation } from "@/components/today-recommendation";
import { WeekPlan } from "@/components/week-plan";
import { formatArea } from "@/lib/format";
import type { Result } from "@/lib/http";
import { getPlan } from "@/lib/planner";
import type { PlanQuery } from "@/lib/plan-query";
import { getPlot, listCrops, listFarms, listPlots, listSoils, type Farm, type Plot } from "@/lib/registry";

/** The plot page: today's answer first, then the next 7 days (FR-2.16). */
export default function PlotPage({ params, searchParams }: PageProps<"/plots/[id]">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
      <Suspense fallback={<p className="text-muted-foreground">Loading the plan</p>}>
        {Promise.all([params, searchParams]).then(([{ id }, query]) => (
          <PlotPlan
            plotId={id}
            query={{
              start_pct: firstValue(query.start_pct),
              trigger_pct: firstValue(query.trigger_pct),
              start: firstValue(query.start),
              view: firstValue(query.view),
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

/** Load the plot, its plan and the names around it at the same time, then show what arrived. */
async function PlotPlan({ plotId, query }: { plotId: string; query: PlanQuery }) {
  const [plot, plan, crops, soils, farms, plots] = await Promise.all([
    getPlot(plotId),
    getPlan(plotId, query.start_pct, query.trigger_pct),
    listCrops(),
    listSoils(),
    listFarms(),
    listPlots(),
  ]);
  if (isNotFound(plot) || isNotFound(plan)) {
    return <PlotNotFound />;
  }

  // Names are a nice-to-have: if the registry fails here, the plan still shows.
  const cropName = plot.ok && crops.ok ? crops.data.find((crop) => crop.id === plot.data.crop_id)?.name : undefined;
  const soilName = plot.ok && soils.ok ? soils.data.find((soil) => soil.id === plot.data.soil_id)?.name : undefined;
  const farm = plot.ok && farms.ok ? farms.data.find((item) => item.id === plot.data.farm_id) : undefined;

  return (
    <PlanNavigationProvider query={query}>
      <header className="mb-5">
        <p className="text-muted-foreground">
          <Link href="/farms" className="hover:text-foreground">
            {farm?.name ?? "Farms"}
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {plot.ok && farms.ok && plots.ok ? (
            <h1>
              <PlotSwitcher farms={switcherFarms(farms.data, plots.data)} plotId={plot.data.id} />
            </h1>
          ) : (
            <h1 className="tight text-[28px] leading-tight font-semibold">Plot</h1>
          )}
          {plot.ok && (
            <div className="flex flex-wrap gap-1.5">
              <Pill>{cropName ?? plot.data.crop_id}</Pill>
              <Pill>{soilName ?? plot.data.soil_id}</Pill>
              <Pill>{formatArea(plot.data.area_m2)}</Pill>
              {plan.ok && <Pill>{plan.data.days[0].stage} stage</Pill>}
            </div>
          )}
        </div>
      </header>
      {plan.ok ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          <TodayRecommendation plan={plan.data} query={query} cropName={cropName ?? plan.data.crop_id} />
          <WeekPlan plan={plan.data} query={query} />
        </div>
      ) : (
        <>
          <ProblemNotice title="The plan can't be calculated right now" problem={plan.problem} />
          {(query.start_pct !== undefined || query.trigger_pct !== undefined) && (
            <p className="mt-3">
              <Link href="?" className="font-medium text-water underline underline-offset-4">
                Plan with the default choices
              </Link>
            </p>
          )}
        </>
      )}
    </PlanNavigationProvider>
  );
}

/** Farms with their plots, for the plot switcher. */
function switcherFarms(farms: Farm[], plots: Plot[]): SwitcherFarm[] {
  return farms.map((farm) => ({
    id: farm.id,
    name: farm.name,
    plots: plots.filter((plot) => plot.farm_id === farm.id).map((plot) => ({ id: plot.id, name: plot.name })),
  }));
}

/** True when the service answered 404: the plot does not exist. */
function isNotFound(result: Result<unknown>): boolean {
  return !result.ok && result.problem.status === 404;
}
