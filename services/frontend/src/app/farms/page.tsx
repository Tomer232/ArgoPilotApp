import Link from "next/link";
import { Suspense } from "react";
import { ListPage, plural } from "@/components/list-page";
import { ProblemNotice } from "@/components/problem-notice";
import { SimpleTable } from "@/components/simple-table";
import { formatArea } from "@/lib/format";
import { listFarms, listPlots } from "@/lib/registry";

/** Every farm, with its plots and their total area. Read-only: farms are added in the registry. */
export default function FarmsPage() {
  return (
    <ListPage title="Farms" subtitle="Every farm and the plots on it.">
      <Suspense fallback={<p className="text-muted-foreground">Loading farms</p>}>
        <Farms />
      </Suspense>
    </ListPage>
  );
}

/** Load farms and plots, then one row per farm. */
async function Farms() {
  const [farms, plots] = await Promise.all([listFarms(), listPlots()]);
  if (!farms.ok) return <ProblemNotice title="The farms can't be loaded right now" problem={farms.problem} />;
  if (!plots.ok) return <ProblemNotice title="The farms can't be loaded right now" problem={plots.problem} />;
  return (
    <SimpleTable
      empty="No farms yet. Farms are added in the registry."
      columns={[{ header: "Farm" }, { header: "Plots" }, { header: "Total area", numeric: true }]}
      rows={farms.data.map((farm) => {
        const farmPlots = plots.data.filter((plot) => plot.farm_id === farm.id);
        const area = farmPlots.reduce((sum, plot) => sum + plot.area_m2, 0);
        return {
          key: farm.id,
          cells: [
            <span key="name" className="font-medium">{farm.name}</span>,
            farmPlots.length === 0 ? (
              <span key="plots" className="text-muted-foreground">No plots yet</span>
            ) : (
              <span key="plots" className="flex flex-wrap gap-x-3 gap-y-1">
                {farmPlots.map((plot) => (
                  <Link key={plot.id} href={`/plots/${plot.id}`} className="text-water hover:underline">
                    {plot.name}
                  </Link>
                ))}
                <span className="text-muted-foreground">({plural(farmPlots.length, "plot")})</span>
              </span>
            ),
            formatArea(area),
          ],
        };
      })}
    />
  );
}
