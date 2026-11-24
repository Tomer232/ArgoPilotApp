import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PlotCard } from "@/components/plot-card";
import { ProblemNotice } from "@/components/problem-notice";
import { plural } from "@/lib/format";
import type { Problem } from "@/lib/http";
import { todaySummary } from "@/lib/overview";
import { getPlan } from "@/lib/planner";
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
  if (!farms.ok) {
    return <OverviewProblem title="The farms can't be loaded right now" problem={farms.problem} />;
  }
  if (!plots.ok) {
    return <OverviewProblem title="The plots can't be loaded right now" problem={plots.problem} />;
  }

  const plans = new Map(
    await Promise.all(plots.data.map(async (plot) => [plot.id, await getPlan(plot.id)] as const)),
  );
  // Crop and soil names are a nice-to-have, as on /plots: if the registry fails here, the card
  // shows the id (QA-1, 2026-11-24).
  const cropNames = new Map(crops.ok ? crops.data.map((crop) => [crop.id, crop.name]) : []);
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

/** The overview's title and what could not be loaded, in the registry's words (FR-2.18). */
function OverviewProblem({ title, problem }: { title: string; problem: Problem }) {
  return (
    <>
      <PageHeader title="Overview" />
      <ProblemNotice title={title} problem={problem} />
    </>
  );
}
