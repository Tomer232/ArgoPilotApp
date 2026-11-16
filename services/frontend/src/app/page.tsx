import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ProblemNotice } from "@/components/problem-notice";
import { formatArea } from "@/lib/format";
import type { Problem } from "@/lib/http";
import { listCrops, listFarms, listPlots, type Plot } from "@/lib/registry";

/** The main page: every farm with its plots (FR-2.15). */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-12">
      <h1 className="text-2xl font-semibold">Choose a plot</h1>
      <Suspense fallback={<p className="mt-6 text-muted-foreground">Loading farms</p>}>
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
    return <p className="mt-6">No farms yet. Farms and plots are added in the registry.</p>;
  }

  const cropNames = new Map(crops.data.map((crop) => [crop.id, crop.name]));
  return (
    <div className="mt-6 space-y-8">
      {farms.data.map((farm) => (
        <section key={farm.id} aria-labelledby={`farm-${farm.id}`}>
          <h2 id={`farm-${farm.id}`} className="text-sm font-semibold text-muted-foreground">
            {farm.name}
          </h2>
          <PlotLinks
            plots={plots.data.filter((plot) => plot.farm_id === farm.id)}
            cropNames={cropNames}
          />
        </section>
      ))}
    </div>
  );
}

/** Shown instead of the list when a registry call fails. */
function LoadFailed({ problem }: { problem: Problem }) {
  return (
    <div className="mt-6">
      <ProblemNotice title="The farms can't be loaded right now" problem={problem} />
    </div>
  );
}

/** One farm's plots, each a full-width row that links to the plot's page. */
function PlotLinks({ plots, cropNames }: { plots: Plot[]; cropNames: Map<string, string> }) {
  if (plots.length === 0) {
    return <p className="mt-2 text-sm">No plots on this farm yet.</p>;
  }
  return (
    <ul className="mt-2 divide-y border-y">
      {plots.map((plot) => (
        <li key={plot.id}>
          <Link
            href={`/plots/${plot.id}`}
            className="flex min-h-14 items-center justify-between gap-3 py-2 hover:bg-accent focus-visible:outline-2"
          >
            <span>
              <span className="block text-lg font-medium">{plot.name}</span>
              <span className="block text-sm text-muted-foreground">
                {cropNames.get(plot.crop_id) ?? plot.crop_id}, {formatArea(plot.area_m2)}
              </span>
            </span>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
