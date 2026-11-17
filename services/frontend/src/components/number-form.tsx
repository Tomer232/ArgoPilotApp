import { HiddenInputs } from "@/components/hidden-inputs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PlanQuery } from "@/lib/plan-query";

/**
 * A one-field GET form: a label, a number box and "Update plan". It keeps the page's other
 * choices (`query`) in the address. `name` is the choice it changes, `min` and `max` its range.
 */
export function NumberForm({
  label,
  name,
  min,
  max,
  query,
}: {
  label: string;
  name: keyof PlanQuery;
  min: number;
  max: number;
  query: PlanQuery;
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2">
      <HiddenInputs query={query} except={name} />
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {label}
        <Input
          type="number"
          name={name}
          min={min}
          max={max}
          step="any"
          required
          className="h-9 w-28 bg-card! text-sm! text-foreground"
        />
      </label>
      <Button type="submit" size="lg">
        Update plan
      </Button>
    </form>
  );
}
