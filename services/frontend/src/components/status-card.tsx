import { checkServices } from "@/lib/health";
import { cn } from "@/lib/utils";

/**
 * Is each of the three services up (FR-2.19)? Checked fresh on every page load.
 * In the sidebar it is a card with a headline; in the phone's top bar, just the three names.
 */
export async function StatusCard() {
  const services = await checkServices();
  const down = services.filter((service) => !service.up);
  return (
    <section aria-label="Service status" className="lg:rounded-xl lg:border lg:bg-card lg:p-3">
      <p className="hidden items-center gap-2 font-semibold lg:flex">
        <Dot up={down.length === 0} />
        {down.length === 0 ? "All systems normal" : `${down.length} of ${services.length} down`}
      </p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs lg:mt-2 lg:flex-col lg:gap-1">
        {services.map((service) => (
          <li
            key={service.name}
            className={cn(
              "flex items-center gap-1.5",
              service.up ? "text-muted-foreground" : "font-semibold text-alarm",
            )}
          >
            <Dot up={service.up} />
            {service.name} {service.up ? "up" : "down"}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A small status dot: green when up, red when down. */
function Dot({ up }: { up: boolean }) {
  return <span aria-hidden className={cn("size-2 shrink-0 rounded-full", up ? "bg-leaf" : "bg-alarm")} />;
}

/** Shown while the health checks run. */
export function StatusCardFallback() {
  return <p className="text-xs text-muted-foreground lg:rounded-xl lg:border lg:bg-card lg:p-3">Checking services</p>;
}
