import Link from "next/link";
import { Suspense } from "react";
import { PlanTable } from "@/components/plan-table";
import { ProblemNotice } from "@/components/problem-notice";
import { SetupNotice } from "@/components/setup-notice";
import { SoilLevelPicker } from "@/components/soil-level-picker";
import { TodayRecommendation } from "@/components/today-recommendation";
import { TriggerPicker } from "@/components/trigger-picker";
import { WateringTimeline } from "@/components/watering-timeline";
import { formatArea } from "@/lib/format";
import type { Result } from "@/lib/http";
import { getPlan } from "@/lib/planner";
import type { PlanQuery } from "@/lib/plan-query";
import { getPlot, listCrops } from "@/lib/registry";

/** The plot page: today's recommendation first, then the 7-day plan (FR-2.16). */
export default function PlotPage({ params, searchParams }: PageProps<"/plots/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-2 pb-12">
      <Suspense fallback={<p className="text-muted-foreground">Loading the plan</p>}>
        {Promise.all([params, searchParams]).then(([{ id }, query]) => (
          <PlotPlan
            plotId={id}
            query={{
              start_pct: firstValue(query.start_pct),
              trigger_pct: firstValue(query.trigger_pct),
              start: firstValue(query.start),
            }}
          />
        ))}
      </Suspense>
    </main>
  );
}

/** One query value as text: the first one if it is repeated, undefined if it is missing. */
function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Load the plot, its plan and the crop names at the same time, then show what arrived. */
async function PlotPlan({ plotId, query }: { plotId: string; query: PlanQuery }) {
  const [plot, plan, crops] = await Promise.all([
    getPlot(plotId),
    getPlan(plotId, query.start_pct, query.trigger_pct),
    listCrops(),
  ]);
  if (isNotFound(plot) || isNotFound(plan)) {
    return <PlotNotFound />;
  }

  // The name and crop are a nice-to-have: if the registry fails here, the plan still shows.
  const cropName =
    plot.ok && crops.ok ? crops.data.find((crop) => crop.id === plot.data.crop_id)?.name : null;
  return (
    <>
      <h1 className="text-2xl font-semibold">{plot.ok ? plot.data.name : "Plot"}</h1>
      {plot.ok && (
        <p className="text-sm text-muted-foreground">
          {cropName ?? plot.data.crop_id}, {formatArea(plot.data.area_m2)}
          {plan.ok && `, ${plan.data.days[0].stage} stage`}
        </p>
      )}
      <div className="mt-4">
        {plan.ok ? (
          <>
            <TodayRecommendation plan={plan.data} />
            <SetupNotice plan={plan.data} />
            <SoilLevelPicker soilId={plan.data.soil_id} startPct={plan.data.start_pct} query={query} />
            <TriggerPicker plan={plan.data} cropName={cropName ?? plan.data.crop_id} query={query} />
            <PlanTable plan={plan.data} />
            <WateringTimeline plan={plan.data} query={query} />
          </>
        ) : (
          <>
            <ProblemNotice title="The plan can't be calculated right now" problem={plan.problem} />
            {(query.start_pct !== undefined || query.trigger_pct !== undefined) && (
              <p className="mt-3 text-sm">
                <Link href="?" className="font-medium text-water underline underline-offset-4">
                  Plan with the default choices
                </Link>
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}

/** True when the service answered 404: the plot does not exist. */
function isNotFound(result: Result<unknown>): boolean {
  return !result.ok && result.problem.status === 404;
}

/** Shown for an id that is not a plot. */
function PlotNotFound() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Plot not found</h1>
      <p className="mt-2">
        There is no plot with this address.{" "}
        <Link href="/" className="font-medium text-water underline underline-offset-4">
          Choose a plot from the list
        </Link>
        .
      </p>
    </>
  );
}
