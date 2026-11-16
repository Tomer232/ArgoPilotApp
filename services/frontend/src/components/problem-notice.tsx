import { CircleAlert } from "lucide-react";
import type { Problem } from "@/lib/http";

/** Says what the page could not do, and why, in the service's own words (FR-2.18). */
export function ProblemNotice({ title, problem }: { title: string; problem: Problem }) {
  return (
    <div role="alert" className="flex gap-3 rounded-md border border-alarm/40 bg-alarm/5 p-4">
      <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-alarm" />
      <div>
        <p className="font-semibold text-alarm">{title}</p>
        <p className="mt-1 text-sm">{capitalize(problem.detail)}.</p>
      </div>
    </div>
  );
}

/** "registry-service is not reachable" becomes "Registry-service is not reachable". */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
