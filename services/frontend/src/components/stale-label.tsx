import { CloudOff } from "lucide-react";
import { Pill } from "@/components/pill";

/** Marks numbers that come from an old forecast (FR-2.17). */
export function StaleLabel() {
  return (
    <Pill tone="stale">
      <CloudOff aria-hidden />
      Stale forecast
    </Pill>
  );
}
