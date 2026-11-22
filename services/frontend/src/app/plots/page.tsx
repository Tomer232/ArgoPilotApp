import { Suspense } from "react";
import { ListPage } from "@/components/list-page";
import { PlotCard } from "@/components/plot-card";
import { ProblemNotice } from "@/components/problem-notice";
import { getPlan } from "@/lib/planner";
import { listCrops, listFarms, listPlots, listSoils } from "@/lib/registry";

/** Every plot as a card, in one grid: its map, its farm, today's answer and what it is. */
export default function PlotsPage() {
  return (
    <ListPage title="Plots" subtitle="Every plot, what grows on it and today's answer.">
      <Suspense fallback={<p className="text-muted-foreground">Loading plots</p>}>
        <Plots />
      </Suspense>
    </ListPage>
  );
}

/** Load the plots and the names they point at, then every plot's plan at the same time, one card each. */
async function Plots() {
  const [plots, farms, crops, soils] = await Promise.all([listPlots(), listFarms(), listCrops(), listSoils()]);
  if (!plots.ok) return <ProblemNotice title="The plots can't be loaded right now" problem={plots.problem} />;
  if (plots.data.length === 0) {
    return <p className="text-muted-foreground">No plots yet. Plots are added in the registry.</p>;
  }

  const plans = new Map(
    await Promise.all(plots.data.map(async (plot) => [plot.id, await getPlan(plot.id)] as const)),
  );
  // Names are a nice-to-have: a name the registry could not send falls back to the id.
  const farmNames = new Map(farms.ok ? farms.data.map((farm) => [farm.id, farm.name]) : []);
  const cropNames = new Map(crops.ok ? crops.data.map((crop) => [crop.id, crop.name]) : []);
  const soilNames = new Map(soils.ok ? soils.data.map((soil) => [soil.id, soil.name]) : []);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plots.data.map((plot) => (
        <PlotCard
          key={plot.id}
          plot={plot}
          plan={plans.get(plot.id)}
          farmName={farmNames.get(plot.farm_id) ?? plot.farm_id}
          cropName={cropNames.get(plot.crop_id)}
          soilName={soilNames.get(plot.soil_id)}
        />
      ))}
    </div>
  );
}
