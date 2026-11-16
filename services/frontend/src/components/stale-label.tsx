import { CloudOff } from "lucide-react";

/** Marks numbers that come from an old forecast (FR-2.17). */
export function StaleLabel() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-stale">
      <CloudOff aria-hidden className="size-3.5" />
      Stale forecast
    </span>
  );
}
