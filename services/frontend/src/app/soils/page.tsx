import { Suspense } from "react";
import { ListPage, plural } from "@/components/list-page";
import { ProblemNotice } from "@/components/problem-notice";
import { SimpleTable } from "@/components/simple-table";
import { listPlots, listSoils } from "@/lib/registry";

/** The soils the registry knows: the water each holds per metre of roots, and the plots on it. */
export default function SoilsPage() {
  return (
    <ListPage title="Soils" subtitle="How much water each soil holds for the roots, per metre of depth.">
      <Suspense fallback={<p className="text-muted-foreground">Loading soils</p>}>
        <Soils />
      </Suspense>
    </ListPage>
  );
}

/** Load soils and plots, then one row per soil. */
async function Soils() {
  const [soils, plots] = await Promise.all([listSoils(), listPlots()]);
  if (!soils.ok) return <ProblemNotice title="The soils can't be loaded right now" problem={soils.problem} />;
  return (
    <SimpleTable
      empty="No soils in the catalogue."
      columns={[{ header: "Soil" }, { header: "Water it holds", numeric: true }, { header: "Plots on it", numeric: true }]}
      rows={soils.data.map((soil) => ({
        key: soil.id,
        cells: [
          <span key="name" className="font-medium">{soil.name}</span>,
          `${soil.available_water_mm_per_m} mm per m`,
          plots.ok ? plural(plots.data.filter((plot) => plot.soil_id === soil.id).length, "plot") : "-",
        ],
      }))}
    />
  );
}
