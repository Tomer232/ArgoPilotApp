"use client";

// The list of runs under the timeline. A client component because today's note (Y18) depends on
// the grower's clock, which only the browser knows.

import { StaleLabel } from "@/components/stale-label";
import { midnightNote, startPassedNote, windowText, type Window } from "@/lib/timeline";
import { useNowOnPlan } from "@/lib/use-now";

/** Every run in full, with its stale label (FR-2.17) and its notes: start passed (Y18), past midnight (Y19). */
export function RunList({ windows, firstDate }: { windows: Window[]; firstDate: string }) {
  const nowMin = useNowOnPlan(firstDate);
  return (
    <ul className="mt-3 flex flex-wrap justify-between gap-x-5 gap-y-1">
      {windows.map((window) => {
        const notes = [startPassedNote(window, nowMin), midnightNote(window, firstDate)].filter((note) => note !== null);
        return (
          <li key={window.startMin}>
            <span className="flex items-center gap-2">
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-water" />
              {windowText(window, firstDate)}
              {window.stale && <StaleLabel />}
            </span>
            {notes.map((note) => (
              <span key={note} className="block pl-4 text-xs text-muted-foreground">
                {note}
              </span>
            ))}
          </li>
        );
      })}
    </ul>
  );
}
