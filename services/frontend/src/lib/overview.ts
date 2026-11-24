// The overview's headline: how many plots need water today (Y22, O105, O125).

import { asSentence, plural } from "./format";
import type { Result } from "./http";
import type { Plan } from "./planner";

/**
 * The line under the title: how many plots need water today. Only plots with a plan are
 * counted (O105); the others are named apart, with the first reason. With no plan at all,
 * there is no count, only the reason (QA-1 of the live QA).
 */
export function todaySummary(plans: Result<Plan>[]): string {
  if (plans.length === 0) {
    return "No plots yet. Farms and plots are added in the registry.";
  }
  const planned = plans.flatMap((plan) => (plan.ok ? [plan.data] : []));
  const problems = plans.flatMap((plan) => (plan.ok ? [] : [plan.problem]));
  if (planned.length === 0) {
    return `No plan right now: ${asSentence(problems[0].detail)}`;
  }
  const needWater = planned.filter((plan) => plan.days[0].run_minutes > 0).length;
  const summary = `${needWater} of ${plural(planned.length, "plot")} need water today, with the default choices.`;
  if (problems.length === 0) {
    return summary;
  }
  const verb = problems.length === 1 ? "has" : "have";
  return `${summary} ${plural(problems.length, "plot")} ${verb} no plan right now: ${asSentence(problems[0].detail)}`;
}
