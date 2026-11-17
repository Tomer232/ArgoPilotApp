import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ListPage } from "@/components/list-page";
import { ProblemNotice } from "@/components/problem-notice";
import { SimpleTable } from "@/components/simple-table";
import { formatArea, formatDate } from "@/lib/format";
import { listCrops, listEmitters, listFarms, listPlots, listSoils } from "@/lib/registry";

/** Every plot with what it is made of: farm, crop, soil, emitter, area, planting date, location. */
export default function PlotsPage() {
  return (
    <ListPage title="Plots" subtitle="Every plot, what grows on it and how it is watered.">
      <Suspense fallback={<p className="text-muted-foreground">Loading plots</p>}>
        <Plots />
      </Suspense>
    </ListPage>
  );
}

/** Load the plots and the names they point at, then one row per plot. */
async function Plots() {
  const [plots, farms, crops, soils, emitters] = await Promise.all([
    listPlots(),
    listFarms(),
    listCrops(),
    listSoils(),
    listEmitters(),
  ]);
  if (!plots.ok) return <ProblemNotice title="The plots can't be loaded right now" problem={plots.problem} />;

  // A name the registry could not send falls back to the id.
  const name = (result: typeof farms | typeof crops | typeof soils, id: string) =>
    (result.ok ? result.data.find((row) => row.id === id)?.name : undefined) ?? id;
  const emitter = (id: string) => {
    const found = emitters.ok ? emitters.data.find((row) => row.id === id) : undefined;
    return found ? `${found.name} ${found.flow_lph} L/h` : id;
  };

  return (
    <SimpleTable
      empty="No plots yet. Plots are added in the registry."
      columns={[
        { header: "Plot" },
        { header: "Farm", wide: true },
        { header: "Crop" },
        { header: "Soil", wide: true },
        { header: "Emitter", wide: true },
        { header: "Area", numeric: true },
        { header: "Planted", wide: true },
        { header: "" },
      ]}
      rows={plots.data.map((plot) => ({
        key: plot.id,
        cells: [
          // The link's ::after covers the whole row, so a tap anywhere on it opens the plot.
          <Link key="plot" href={`/plots/${plot.id}`} className="font-medium after:absolute after:inset-0">
            {plot.name}
          </Link>,
          name(farms, plot.farm_id),
          name(crops, plot.crop_id),
          name(soils, plot.soil_id),
          emitter(plot.emitter_id),
          formatArea(plot.area_m2),
          formatDate(plot.planting_date),
          <ChevronRight key="open" aria-hidden className="size-4 text-muted-foreground" />,
        ],
      }))}
    />
  );
}
