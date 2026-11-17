import { ChevronRight, Droplets, Leaf } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { plural } from "@/components/list-page";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { Pill } from "@/components/pill";
import { ProblemNotice } from "@/components/problem-notice";
import { formatArea, formatDuration } from "@/lib/format";
import type { Result } from "@/lib/http";
import { getPlan, type Plan } from "@/lib/planner";
import { listCrops, listFarms, listPlots, type Plot } from "@/lib/registry";

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

/** Load farms, plots and crops, then every plot's plan at the same time, and list them by farm. */
async function Overview() {
  const [farms, plots, crops] = await Promise.all([listFarms(), listPlots(), listCrops()]);
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
  const needWater = plots.data.filter((plot) => {
    const plan = plans.get(plot.id);
    return plan?.ok && plan.data.days[0].run_minutes > 0;
  }).length;
  const cropNames = new Map(crops.data.map((crop) => [crop.id, crop.name]));

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={
          plots.data.length === 0
            ? "No plots yet. Farms and plots are added in the registry."
            : `${needWater} of ${plural(plots.data.length, "plot")} need water today, with the default choices.`
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        {farms.data.map((farm) => {
          const farmPlots = plots.data.filter((plot) => plot.farm_id === farm.id);
          return (
            <Panel key={farm.id} id={`farm-${farm.id}`} title={farm.name} hint={plural(farmPlots.length, "plot")} flush>
              {farmPlots.length === 0 ? (
                <p className="px-4 py-6 text-center text-muted-foreground">No plots on this farm yet.</p>
              ) : (
                <ul className="divide-y">
                  {farmPlots.map((plot) => (
                    <PlotRow key={plot.id} plot={plot} cropName={cropNames.get(plot.crop_id)} plan={plans.get(plot.id)} />
                  ))}
                </ul>
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}

/** One plot: name, crop and area, today's answer, and a link to its page. */
function PlotRow({ plot, cropName, plan }: { plot: Plot; cropName?: string; plan?: Result<Plan> }) {
  return (
    <li>
      <Link href={`/plots/${plot.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-muted/50 sm:px-5">
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{plot.name}</span>
          <span className="block text-xs text-muted-foreground">
            {cropName ?? plot.crop_id}, {formatArea(plot.area_m2)}
          </span>
        </span>
        <TodayAnswer plan={plan} />
        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

/** Today's answer as a pill, or a short note when the plan could not be calculated. */
function TodayAnswer({ plan }: { plan?: Result<Plan> }) {
  if (!plan || !plan.ok) {
    return <span className="text-xs text-alarm">Plan unavailable</span>;
  }
  const today = plan.data.days[0];
  if (today.run_minutes === 0) {
    return (
      <Pill tone="leaf">
        <Leaf aria-hidden />
        No irrigation
      </Pill>
    );
  }
  return (
    <Pill tone="water">
      <Droplets aria-hidden />
      Water {formatDuration(today.run_minutes)}
    </Pill>
  );
}
