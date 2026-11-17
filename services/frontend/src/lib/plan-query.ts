// The choices the grower makes on the plot page. They live in the page address, so every link
// and form must carry the ones it does not change.

/** The three choices, as the text in the address (the planner checks start_pct and trigger_pct). */
export type PlanQuery = {
  start_pct?: string;
  trigger_pct?: string;
  start?: string;
};

/** The address (query only) of this page with `changes` applied on top of `query`. */
export function hrefWith(query: PlanQuery, changes: PlanQuery): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries({ ...query, ...changes })) {
    if (value !== undefined) {
      params.set(name, value);
    }
  }
  return `?${params.toString()}`;
}

/** The address without `name`, keeping the other choices. */
export function hrefWithout(query: PlanQuery, name: keyof PlanQuery): string {
  return hrefWith({ ...query, [name]: undefined }, {});
}
