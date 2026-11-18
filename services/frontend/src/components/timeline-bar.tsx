"use client";

// The watering bar itself, with the run times above it and the day names under it. A client
// component so that the pointer can be followed (while the mouse or a finger is over the bar, a thin
// line and a small label show the exact day and time under it), and so that the labels can be kept
// apart by the bar's real width in px.

import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import {
  barPosition,
  clockTime,
  dayMarks,
  hourTicks,
  isWatering,
  labelPosition,
  momentText,
  windowLabels,
  type Window,
} from "@/lib/timeline";
import { useNowOnPlan } from "@/lib/use-now";

/** Until the browser has measured the bar, its width is taken as a phone's, so labels never start out crowded. */
const PHONE_BAR_PX = 300;

/** The element's width in px, measured in the browser and again whenever it changes. */
function useWidthPx(ref: RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(PHONE_BAR_PX);
  useEffect(() => {
    const element = ref.current;
    if (element === null) {
      return;
    }
    const observer = new ResizeObserver(() => setWidth(element.getBoundingClientRect().width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/**
 * The bar from 00:00 today to `end` minutes, the runs in blue, a mark every hour, the hover time,
 * and on the plan's first day a red "now" line at the grower's clock (Y18).
 */
export function TimelineBar({ windows, end, firstDate }: { windows: Window[]; end: number; firstDate: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const nowMin = useNowOnPlan(firstDate);
  const barRef = useRef<HTMLDivElement>(null);
  const barPx = useWidthPx(barRef);
  const endText = momentText(end, firstDate);

  /** Turns the pointer's place on the bar into minutes from 00:00 today. */
  const follow = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const share = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1);
    setHover(Math.round(share * end));
  };

  return (
    <div className="relative">
      <div aria-hidden className="relative h-5 text-xs font-medium text-water">
        {windowLabels(windows, end, barPx).map((label) => (
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
        ref={barRef}
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
      <div aria-hidden className="relative mt-1.5 h-4 text-xs whitespace-nowrap text-muted-foreground">
        <span className="absolute left-0">Today 00:00</span>
        {dayMarks(firstDate, end, barPx, endText).map((mark) => (
          <span key={mark.minutes} className="absolute" style={labelPosition(mark.minutes, end)}>
            {mark.text}
          </span>
        ))}
        <span className="absolute right-0">{endText}</span>
      </div>
    </div>
  );
}
