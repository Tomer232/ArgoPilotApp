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
  const cropNames = new Map(crops.data.map((crop) => [crop.id, crop.name]));

  return (
    <>
      <PageHeader title="Overview" subtitle={todaySummary([...plans.values()])} />
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

/**
 * The line under the title: how many plots need water today. Only plots with a plan are
 * counted (O105); the others are named apart, with the first reason. With no plan at all,
 * there is no count, only the reason (QA-1 of the live QA).
 */
function todaySummary(plans: Result<Plan>[]): string {
  if (plans.length === 0) {
    return "No plots yet. Farms and plots are added in the registry.";
  }
  const planned = plans.flatMap((plan) => (plan.ok ? [plan.data] : []));
  const problems = plans.flatMap((plan) => (plan.ok ? [] : [plan.problem]));
  if (planned.length === 0) {
    return `No plan right now: ${problems[0].detail}.`;
  }
  const needWater = planned.filter((plan) => plan.days[0].run_minutes > 0).length;
  const summary = `${needWater} of ${plural(planned.length, "plot")} need water today, with the default choices.`;
  if (problems.length === 0) {
    return summary;
  }
  const verb = problems.length === 1 ? "has" : "have";
  return `${summary} ${plural(problems.length, "plot")} ${verb} no plan right now: ${problems[0].detail}.`;
}

/**
 * One plot: name, crop and area, today's answer, and a link to its page. When today's answer
 * comes from an old forecast, the line under the name says so, next to the answer (FR-2.17, QA-5).
 */
function PlotRow({ plot, cropName, plan }: { plot: Plot; cropName?: string; plan?: Result<Plan> }) {
  return (
    <li>
      <Link href={`/plots/${plot.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-muted/50 sm:px-5">
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{plot.name}</span>
          <span className="block text-xs text-muted-foreground">
            {cropName ?? plot.crop_id}, {formatArea(plot.area_m2)}
          </span>
          {plan?.ok && plan.data.days[0].stale && (
            <span className="block text-xs font-medium text-stale">Stale forecast</span>
          )}
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
