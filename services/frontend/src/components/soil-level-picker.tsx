import Link from "next/link";
import { NumberForm } from "@/components/number-form";
import { Panel } from "@/components/panel";
import { hrefWith, type PlanQuery } from "@/lib/plan-query";
import { getSoilFeelRows } from "@/lib/soil-feel";
import { cn } from "@/lib/utils";

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
    <Panel id="soil-level" title="How wet is the soil today?" flush>
      {rows && (
        <>
          <p className="px-4 pt-3 text-muted-foreground">Squeeze a handful of soil from the middle of the root zone.</p>
          <ul className="grid gap-1.5 p-3">
            {rows.map((row) => (
              <li key={row.key}>
                <Link
                  href={hrefWith(query, { start_pct: String(row.startPct) })}
                  aria-current={row === picked ? "true" : undefined}
                  className={cn(
                    "flex gap-3 rounded-lg border px-3 py-2.5",
                    row === picked ? "border-foreground/70 bg-card shadow-sm" : "border-transparent hover:bg-muted",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                      row === picked ? "border-foreground" : "border-input bg-card",
                    )}
                  >
                    {row === picked && <span className="size-2 rounded-full bg-foreground" />}
                  </span>
                  <span>
                    <span className="block font-medium">{row.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{row.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="border-t px-4 py-3">
        <NumberForm label="I know the exact %" name="start_pct" min={0} max={100} query={query} />
        <p className="mt-3 text-xs text-muted-foreground">{summary(chosen, picked?.label, startPct)}</p>
      </div>
    </Panel>
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
