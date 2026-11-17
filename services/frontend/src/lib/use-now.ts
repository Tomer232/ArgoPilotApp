"use client";

import { useEffect, useState } from "react";
import { nowOnPlan } from "./timeline";

/**
 * The phone's "now" on the plan's timeline (minutes from 00:00 today), or null when the phone's date is
 * not the plan's first day. Null on the server and the first render, so the server never guesses the
 * grower's clock; then read in the browser and again every minute while the page stays open (Y18).
 */
export function useNowOnPlan(firstDate: string): number | null {
  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    const read = () => setNowMin(nowOnPlan(new Date(), firstDate));
    read();
    const timer = setInterval(read, 60_000);
    return () => clearInterval(timer);
  }, [firstDate]);
  return nowMin;
}
