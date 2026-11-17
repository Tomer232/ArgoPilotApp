import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { NumberForm } from "@/components/number-form";
import { Panel } from "@/components/panel";
import type { Plan } from "@/lib/planner";
import { hrefWith, type PlanQuery } from "@/lib/plan-query";
import { cn } from "@/lib/utils";

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
    <Panel id="trigger" title="Irrigate when the bucket falls below">
      <ul className="inline-flex rounded-lg bg-muted p-0.5">
        {options.map((option) => {
          const active = option.pct === plan.trigger_pct;
          return (
            <li key={option.label}>
              <Link
                href={hrefWith(query, { trigger_pct: String(option.pct) })}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "block rounded-md px-3 py-1.5",
                  active ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
                <span className="ml-1.5 tabular-nums">{option.pct}%</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-4">
        <NumberForm label="Custom %" name="trigger_pct" min={1} max={99} query={query} />
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        The plan irrigates when the soil water would end the day below {plan.trigger_pct}% of the bucket.
      </p>
      {outsideUsualRange && (
        <p role="alert" className="mt-3 flex gap-2 rounded-lg bg-stale-soft px-3 py-2 text-stale">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            Outside the usual range ({USUAL_MIN_PCT}-{USUAL_MAX_PCT}%). Recommended for {cropName}:{" "}
            {plan.crop_trigger_pct}%.
          </span>
        </p>
      )}
    </Panel>
  );
}
