import { Suspense } from "react";
import { plural } from "@/components/list-page";
import { PageHeader } from "@/components/page-header";
import { PlotCard } from "@/components/plot-card";
import { ProblemNotice } from "@/components/problem-notice";
import type { Result } from "@/lib/http";
import { getPlan, type Plan } from "@/lib/planner";
import { listCrops, listFarms, listPlots, listSoils } from "@/lib/registry";

/** The overview: every farm with its plots (FR-2.15), each with today's answer. */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
      <Suspense
        fallback={
          <>
            <PageHeader title="Overview" subtitle="Checking today's plan for every plot." />
          </>
        }
      >
        <Overview />
      </Suspense>
    </main>
  );
}

/** Load farms, plots, crops and soils, then every plot's plan at the same time, and show them by farm. */
async function Overview() {
  const [farms, plots, crops, soils] = await Promise.all([listFarms(), listPlots(), listCrops(), listSoils()]);
  if (!farms.ok || !plots.ok || !crops.ok) {
    const problem = !farms.ok ? farms.problem : !plots.ok ? plots.problem : !crops.ok ? crops.problem : null;
    return (
      <>
        <PageHeader title="Overview" />
        {problem && <ProblemNotice title="The farms can't be loaded right now" problem={problem} />}
      </>
    );
  }

  const plans = new Map(
    await Promise.all(plots.data.map(async (plot) => [plot.id, await getPlan(plot.id)] as const)),
  );
  const cropNames = new Map(crops.data.map((crop) => [crop.id, crop.name]));
  // Soil names are a nice-to-have: if the registry fails here, the card shows the soil's id.
  const soilNames = new Map(soils.ok ? soils.data.map((soil) => [soil.id, soil.name]) : []);

  return (
    <>
      <PageHeader title="Overview" subtitle={todaySummary([...plans.values()])} />
      <div className="flex flex-col gap-8">
        {farms.data.map((farm) => {
          const farmPlots = plots.data.filter((plot) => plot.farm_id === farm.id);
          return (
            <section key={farm.id} aria-labelledby={`farm-${farm.id}`} className="flex flex-col gap-3">
              <h2 id={`farm-${farm.id}`} className="font-semibold">
                {farm.name}
                <span className="ml-1.5 font-normal text-muted-foreground">{plural(farmPlots.length, "plot")}</span>
              </h2>
              {farmPlots.length === 0 ? (
                <p className="text-muted-foreground">No plots on this farm yet.</p>
              ) : (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {farmPlots.map((plot) => (
                    <PlotCard
                      key={plot.id}
                      plot={plot}
                      plan={plans.get(plot.id)}
                      cropName={cropNames.get(plot.crop_id)}
                      soilName={soilNames.get(plot.soil_id)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

/**
 * The line under the title: how many plots need water today. Only plots with a plan are
 * counted (O105); the others are named apart, with the first reason. With no plan at all,
 * there is no count, only the reason (QA-1 of the live QA).
 */
function todaySummary(plans: Result<Plan>[]): string {
  if (plans.length === 0) {
    return "No plots yet. Farms and plots are added in the registry.";
  }
  const planned = plans.flatMap((plan) => (plan.ok ? [plan.data] : []));
  const problems = plans.flatMap((plan) => (plan.ok ? [] : [plan.problem]));
  if (planned.length === 0) {
    return `No plan right now: ${problems[0].detail}.`;
  }
  const needWater = planned.filter((plan) => plan.days[0].run_minutes > 0).length;
  const summary = `${needWater} of ${plural(planned.length, "plot")} need water today, with the default choices.`;
  if (problems.length === 0) {
    return summary;
  }
  const verb = problems.length === 1 ? "has" : "have";
  return `${summary} ${plural(problems.length, "plot")} ${verb} no plan right now: ${problems[0].detail}.`;
}
