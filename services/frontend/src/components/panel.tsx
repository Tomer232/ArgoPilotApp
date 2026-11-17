import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A white card with a title strip, the P1 dashboard's card: title and an optional short hint
 * on the left, an optional `action` on the right, then the body. `id` names the region for
 * screen readers. Set `flush` when the body brings its own padding (a table or a list).
 */
export function Panel({
  id,
  title,
  hint,
  action,
  flush = false,
  className,
  children,
}: {
  id: string;
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card role="region" aria-labelledby={id} className={cn("min-w-0 gap-0 border py-0 text-sm ring-0", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-3">
        <h2 id={id} className="font-semibold">
          {title}
          {hint && <span className="ml-1.5 font-normal text-muted-foreground">{hint}</span>}
        </h2>
        {action}
      </div>
      <div className={flush ? undefined : "p-4"}>{children}</div>
    </Card>
  );
}
