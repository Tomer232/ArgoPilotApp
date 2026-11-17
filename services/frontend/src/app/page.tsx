import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { Pill } from "@/components/pill";
import { ProblemNotice } from "@/components/problem-notice";
import { formatArea } from "@/lib/format";
import type { Problem } from "@/lib/http";
import { listCrops, listFarms, listPlots, type Plot } from "@/lib/registry";

/** The main page: every farm with its plots (FR-2.15). */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader title="Plots" subtitle="Pick a plot to see today's irrigation and the 7-day plan." />
      <Suspense fallback={<p className="text-muted-foreground">Loading farms</p>}>
        <FarmList />
      </Suspense>
    </main>
  );
}

/** Load farms, plots and crops from the registry, then list the plots under their farm. */
async function FarmList() {
  const [farms, plots, crops] = await Promise.all([listFarms(), listPlots(), listCrops()]);
  if (!farms.ok) return <LoadFailed problem={farms.problem} />;
  if (!plots.ok) return <LoadFailed problem={plots.problem} />;
  if (!crops.ok) return <LoadFailed problem={crops.problem} />;

  if (farms.data.length === 0) {
    return <p>No farms yet. Farms and plots are added in the registry.</p>;
  }

  const cropNames = new Map(crops.data.map((crop) => [crop.id, crop.name]));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3.5">
      {farms.data.map((farm) => {
        const farmPlots = plots.data.filter((plot) => plot.farm_id === farm.id);
        return (
          <Panel
            key={farm.id}
            id={`farm-${farm.id}`}
            title={farm.name}
            hint={farmPlots.length === 1 ? "1 plot" : `${farmPlots.length} plots`}
            flush
          >
            <PlotLinks plots={farmPlots} cropNames={cropNames} />
          </Panel>
        );
      })}
    </div>
  );
}

/** Shown instead of the list when a registry call fails. */
function LoadFailed({ problem }: { problem: Problem }) {
  return <ProblemNotice title="The farms can't be loaded right now" problem={problem} />;
}

/** One farm's plots, each a full-width row that links to the plot's page. */
function PlotLinks({ plots, cropNames }: { plots: Plot[]; cropNames: Map<string, string> }) {
  if (plots.length === 0) {
    return <p className="px-4 py-6 text-center text-muted-foreground">No plots on this farm yet.</p>;
  }
  return (
    <ul className="divide-y">
      {plots.map((plot) => (
        <li key={plot.id}>
          <Link
            href={`/plots/${plot.id}`}
            className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-muted/60 focus-visible:outline-2"
          >
            <span className="min-w-0 flex-1 font-medium">{plot.name}</span>
            <Pill>{cropNames.get(plot.crop_id) ?? plot.crop_id}</Pill>
            <span className="w-20 text-right text-muted-foreground tabular-nums">{formatArea(plot.area_m2)}</span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
