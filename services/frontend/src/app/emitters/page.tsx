import { Suspense } from "react";
import { ListPage, plural } from "@/components/list-page";
import { ProblemNotice } from "@/components/problem-notice";
import { SimpleTable } from "@/components/simple-table";
import { listEmitters, listPlots } from "@/lib/registry";

/** The drip emitters the registry knows: flow per emitter, and the plots using each. */
export default function EmittersPage() {
  return (
    <ListPage title="Emitters" subtitle="The drip emitters a plot can use, and how much each one gives per hour.">
      <Suspense fallback={<p className="text-muted-foreground">Loading emitters</p>}>
        <Emitters />
      </Suspense>
    </ListPage>
  );
}

/** Load emitters and plots, then one row per emitter. */
async function Emitters() {
  const [emitters, plots] = await Promise.all([listEmitters(), listPlots()]);
  if (!emitters.ok) return <ProblemNotice title="The emitters can't be loaded right now" problem={emitters.problem} />;
  return (
    <SimpleTable
      empty="No emitters in the catalogue."
      columns={[{ header: "Emitter" }, { header: "Id", wide: true }, { header: "Flow", numeric: true }, { header: "Used on", numeric: true }]}
      rows={emitters.data.map((emitter) => ({
        key: emitter.id,
        cells: [
          <span key="name" className="font-medium">{emitter.name}</span>,
          <span key="id" className="text-muted-foreground">{emitter.id}</span>,
          `${emitter.flow_lph} L/h`,
          plots.ok ? plural(plots.data.filter((plot) => plot.emitter_id === emitter.id).length, "plot") : "-",
        ],
      }))}
    />
  );
}
