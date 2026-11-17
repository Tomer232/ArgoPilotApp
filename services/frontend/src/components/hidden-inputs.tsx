import type { PlanQuery } from "@/lib/plan-query";

/** Carries the choices a form does not change, so sending it keeps them in the address. */
export function HiddenInputs({ query, except }: { query: PlanQuery; except: keyof PlanQuery }) {
  return (
    <>
      {Object.entries(query).map(
        ([name, value]) =>
          name !== except && value !== undefined && <input key={name} type="hidden" name={name} value={value} />,
      )}
    </>
  );
}
