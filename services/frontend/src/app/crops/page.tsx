import { Suspense } from "react";
import { ListPage, plural } from "@/components/list-page";
import { ProblemNotice } from "@/components/problem-notice";
import { SimpleTable } from "@/components/simple-table";
import { listCrops, listPlots } from "@/lib/registry";

/** The crops the registry knows, and how many plots grow each. Read-only catalogue. */
export default function CropsPage() {
  return (
    <ListPage title="Crops" subtitle="The crops a plot can grow. The planner knows each crop's water needs by stage.">
      <Suspense fallback={<p className="text-muted-foreground">Loading crops</p>}>
        <Crops />
      </Suspense>
    </ListPage>
  );
}

/** Load crops and plots, then one row per crop. */
async function Crops() {
  const [crops, plots] = await Promise.all([listCrops(), listPlots()]);
  if (!crops.ok) return <ProblemNotice title="The crops can't be loaded right now" problem={crops.problem} />;
  return (
    <SimpleTable
      empty="No crops in the catalogue."
      columns={[{ header: "Crop" }, { header: "Id", wide: true }, { header: "Grown on", numeric: true }]}
      rows={crops.data.map((crop) => ({
        key: crop.id,
        cells: [
          <span key="name" className="font-medium">{crop.name}</span>,
          <span key="id" className="text-muted-foreground">{crop.id}</span>,
          plots.ok ? plural(plots.data.filter((plot) => plot.crop_id === crop.id).length, "plot") : "-",
        ],
      }))}
    />
  );
}
