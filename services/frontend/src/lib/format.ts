// How numbers and dates are written on the pages. Display only: values come from the services as they are.

/** 1000 becomes "1,000 m²". */
export function formatArea(areaM2: number): string {
  return `${areaM2.toLocaleString("en-US")} m²`;
}

/** 412.37 becomes "412 L": a grower reads whole litres. */
export function formatLitres(litres: number): string {
  return `${litres.toLocaleString("en-US", { maximumFractionDigits: 0 })} L`;
}

/** 612 minutes becomes { hours: 10, minutes: 12 }. */
export function splitDuration(totalMinutes: number): { hours: number; minutes: number } {
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

/** 45 becomes "45 min", 612 becomes "10 h 12 min", 1440 becomes "24 h". */
export function formatDuration(totalMinutes: number): string {
  const { hours, minutes } = splitDuration(Math.round(totalMinutes));
  if (hours === 0) {
    return `${minutes} min`;
  }
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/** "2026-11-17" becomes "Tue 17 Nov". The date is a calendar day, so it is read in UTC and never shifts. */
export function formatDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** "2026-11-16T17:47:17Z" becomes "16 Nov, 17:47 UTC". */
export function formatFetchedAt(isoTimestamp: string): string {
  const time = new Date(isoTimestamp).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return `${time} UTC`;
}

/** "2026-11-17" becomes "Tue". Read in UTC, like formatDay. */
export function formatWeekday(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

/** "2026-03-01" becomes "1 Mar 2026": a date further away, where the year matters. Read in UTC. */
export function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
