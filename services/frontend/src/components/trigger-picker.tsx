import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { HiddenInputs } from "@/components/hidden-inputs";
import type { Plan } from "@/lib/planner";
import { hrefWith, type PlanQuery } from "@/lib/plan-query";

// FAO-56 (Ch. 8) gives p, the share of the bucket a crop can use up, from 0.30 to 0.70.
const USUAL_MIN_PCT = 30;
const USUAL_MAX_PCT = 70;
const HALF_PCT = 50;

/**
 * "Irrigate when the bucket falls below": half (the default), the crop's own value or a number
 * from 1 to 99. Links and the form reload the page, keeping the other choices in the address.
 * `query` is the page's current choices.
 */
export function TriggerPicker({
  plan,
  cropName,
  query,
}: {
  plan: Plan;
  cropName: string;
  query: PlanQuery;
}) {
  const options = [
    { label: "Half", pct: HALF_PCT },
    { label: "Crop value", pct: plan.crop_trigger_pct },
  ];
  const outsideUsualRange = plan.trigger_pct < USUAL_MIN_PCT || plan.trigger_pct > USUAL_MAX_PCT;
  return (
    <section aria-labelledby="trigger" className="mt-4 rounded-md border bg-card p-5">
      <h2 id="trigger" className="text-lg font-semibold">
        Irrigate when the bucket falls below
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <li key={option.label}>
            <Link
              href={hrefWith(query, { trigger_pct: String(option.pct) })}
              aria-current={option.pct === plan.trigger_pct ? "true" : undefined}
              className={`block rounded-md border px-3 py-2 ${option.pct === plan.trigger_pct ? "border-water bg-water/10" : "hover:bg-muted"}`}
            >
              <span className="font-semibold">{option.label}</span>
              <span className="ml-1.5 text-sm tabular-nums">{option.pct}%</span>
            </Link>
          </li>
        ))}
      </ul>
      <form method="get" className="mt-3 flex flex-wrap items-end gap-2">
        <HiddenInputs query={query} except="trigger_pct" />
        <label className="text-sm">
          Custom %
          <input
            type="number"
            name="trigger_pct"
            min={1}
            max={99}
            step="any"
            required
            className="mt-1 block w-28 rounded-md border bg-background px-2 py-1.5"
          />
        </label>
        <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground">
          Update plan
        </button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        The plan irrigates when the soil water would end the day below {plan.trigger_pct}% of the
        bucket.
      </p>
      {outsideUsualRange && (
        <p role="alert" className="mt-3 flex gap-2 text-sm text-stale">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            Outside the usual range ({USUAL_MIN_PCT}-{USUAL_MAX_PCT}%). Recommended for {cropName}:{" "}
            {plan.crop_trigger_pct}%.
          </span>
        </p>
      )}
    </section>
  );
}
