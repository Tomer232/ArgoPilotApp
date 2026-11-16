import Link from "next/link";
import { Suspense } from "react";
import { PlanTable } from "@/components/plan-table";
import { ProblemNotice } from "@/components/problem-notice";
import { TodayRecommendation } from "@/components/today-recommendation";
import { formatArea } from "@/lib/format";
import type { Result } from "@/lib/http";
import { getPlan } from "@/lib/planner";
import { getPlot, listCrops } from "@/lib/registry";

/** The plot page: today's recommendation first, then the 7-day plan (FR-2.16). */
export default function PlotPage({ params }: PageProps<"/plots/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-2 pb-12">
      <Suspense fallback={<p className="text-muted-foreground">Loading the plan</p>}>
        {params.then(({ id }) => (
          <PlotPlan plotId={id} />
        ))}
      </Suspense>
    </main>
  );
}

/** Load the plot, its plan and the crop names at the same time, then show what arrived. */
async function PlotPlan({ plotId }: { plotId: string }) {
  const [plot, plan, crops] = await Promise.all([getPlot(plotId), getPlan(plotId), listCrops()]);
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
            <PlanTable plan={plan.data} />
          </>
        ) : (
          <ProblemNotice title="The plan can't be calculated right now" problem={plan.problem} />
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
