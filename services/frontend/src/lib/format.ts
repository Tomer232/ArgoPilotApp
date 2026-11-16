// How numbers and dates are written on the pages. Display only: values come from the services as they are.

/** 1000 becomes "1,000 m²". */
export function formatArea(areaM2: number): string {
  return `${areaM2.toLocaleString("en-US")} m²`;
}

/** 412.37 becomes "412 L": a grower reads whole litres. */
export function formatLitres(litres: number): string {
  return `${litres.toLocaleString("en-US", { maximumFractionDigits: 0 })} L`;
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
