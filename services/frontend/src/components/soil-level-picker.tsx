import Link from "next/link";
import { HiddenInputs } from "@/components/hidden-inputs";
import { hrefWith, type PlanQuery } from "@/lib/plan-query";
import { getSoilFeelRows } from "@/lib/soil-feel";

/**
 * "How wet is the soil today?": the grower squeezes some soil and picks the row that fits,
 * or types the exact percent. Links and the form reload the page, which asks the planner again.
 * `startPct` is the level the plan used; `query` is the page's current choices, which every
 * link and the form keep (only start_pct changes).
 */
export function SoilLevelPicker({
  soilId,
  startPct,
  query,
}: {
  soilId: string;
  startPct: number;
  query: PlanQuery;
}) {
  const chosen = query.start_pct;
  const rows = getSoilFeelRows(soilId);
  const picked = rows?.find((row) => chosen !== undefined && Number(chosen) === row.startPct);
  return (
    <section aria-labelledby="soil-level" className="mt-4 rounded-md border bg-card p-5">
      <h2 id="soil-level" className="text-lg font-semibold">
        How wet is the soil today?
      </h2>
      {rows && (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Squeeze a handful of soil from the middle of the root zone.
          </p>
          <ul className="mt-3 space-y-2">
            {rows.map((row) => (
              <li key={row.key}>
                <Link
                  href={hrefWith(query, { start_pct: String(row.startPct) })}
                  aria-current={row === picked ? "true" : undefined}
                  className={`block rounded-md border p-3 ${row === picked ? "border-water bg-water/10" : "hover:bg-muted"}`}
                >
                  <span className="font-semibold">{row.label}</span>
                  <span className="mt-0.5 block text-sm">{row.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <form method="get" className="mt-4 flex flex-wrap items-end gap-2">
        <HiddenInputs query={query} except="start_pct" />
        <label className="text-sm">
          I know the exact %
          <input
            type="number"
            name="start_pct"
            min={0}
            max={100}
            step="any"
            required
            className="mt-1 block w-28 rounded-md border bg-background px-2 py-1.5"
          />
        </label>
        <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground">
          Update plan
        </button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">{summary(chosen, picked?.label, startPct)}</p>
    </section>
  );
}

/** One line saying what level the plan assumed. A chosen level is an estimate, never a measurement. */
function summary(chosen: string | undefined, label: string | undefined, startPct: number): string {
  if (chosen === undefined) {
    return "Assuming the soil is at field capacity (wet with free water).";
  }
  const what = label ? `${label} (${startPct}%)` : `${startPct}%`;
  return `Plan based on: ${what}. This is an estimate, not a measurement.`;
}
