"use client";

import { useEffect, useState } from "react";
import { formatFetchedAt } from "@/lib/format";

/**
 * When the forecast was fetched, in the phone's own time zone (QA-10). The server doesn't know the
 * grower's zone, so the first render shows UTC; the browser then switches it to local time,
 * like the timeline's "now" line (Y18).
 */
export function ForecastTime({ fetchedAt }: { fetchedAt: string }) {
  const [timeZone, setTimeZone] = useState<string | undefined>(undefined);
  useEffect(() => {
    const readZone = () => setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    readZone();
  }, []);
  return <>{formatFetchedAt(fetchedAt, timeZone)}</>;
}
