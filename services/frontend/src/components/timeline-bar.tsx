"use client";

// The watering bar itself, with the run times above it. A client component only so that the
// pointer can be followed: while the mouse (or a finger) is over the bar, a thin line and a small
// label show the exact day and time under it, updated on every move.

import { useState, type PointerEvent } from "react";
import {
  barPosition,
  clockTime,
  hourTicks,
  isWatering,
  labelPosition,
  momentText,
  windowLabels,
  type Window,
} from "@/lib/timeline";
import { useNowOnPlan } from "@/lib/use-now";

/**
 * The bar from 00:00 today to `end` minutes, the runs in blue, a mark every hour, the hover time,
 * and on the plan's first day a red "now" line at the grower's clock (Y18).
 */
export function TimelineBar({ windows, end, firstDate }: { windows: Window[]; end: number; firstDate: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const nowMin = useNowOnPlan(firstDate);

  /** Turns the pointer's place on the bar into minutes from 00:00 today. */
  const follow = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const share = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1);
    setHover(Math.round(share * end));
  };

  return (
    <div className="relative">
      <div aria-hidden className="relative h-5 text-xs font-medium text-water">
        {windowLabels(windows, end).map((label) => (
          <span
            key={label.minutes}
            className="absolute bottom-1 whitespace-nowrap transition-opacity duration-150"
            style={{ ...labelPosition(label.minutes, end), opacity: hover === null ? 1 : 0.25 }}
          >
            {label.text}
          </span>
        ))}
        {hover !== null && (
          <span
            className="absolute bottom-1 z-10 rounded-md bg-foreground px-1.5 py-0.5 whitespace-nowrap text-background shadow-sm"
            style={labelPosition(hover, end)}
          >
            {momentText(hover, firstDate)}
          </span>
        )}
      </div>
      <div
        role="img"
        aria-label="Watering timeline, listed below"
        className="relative h-5 cursor-crosshair touch-pan-y overflow-hidden rounded-md bg-muted"
        onPointerMove={follow}
        onPointerDown={follow}
        onPointerLeave={() => setHover(null)}
      >
        {windows.map((window) => (
          <span key={window.startMin} className="absolute inset-y-0 bg-water" style={{ ...barPosition(window, end), minWidth: "3px" }} />
        ))}
        {hourTicks(end).map((tick) => (
          <span
            key={tick.minutes}
            className={`absolute bottom-0 w-px ${isWatering(tick.minutes, windows) ? "bg-white/70" : "bg-foreground/25"} ${tick.midnight ? "top-0" : "h-1.5"}`}
            style={{ left: `${(tick.minutes / end) * 100}%` }}
          />
        ))}
        {nowMin !== null && (
          <span
            title={`Now ${clockTime(nowMin)}`}
            className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-alarm"
            style={{ left: `${(nowMin / end) * 100}%` }}
          />
        )}
        {hover !== null && (
          <span className="absolute inset-y-0 w-px bg-foreground" style={{ left: `${(hover / end) * 100}%` }} />
        )}
      </div>
    </div>
  );
}
