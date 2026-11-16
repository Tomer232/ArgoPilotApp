import { checkServices } from "@/lib/health";
import { cn } from "@/lib/utils";

/** One small line: is each of the three services up? Checked fresh on every page load (FR-2.19). */
export async function StatusLine() {
  const services = await checkServices();
  return (
    <ul aria-label="Service status" className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {services.map((service) => (
        <li
          key={service.name}
          className={cn(
            "flex items-center gap-1.5",
            service.up ? "text-muted-foreground" : "font-semibold text-alarm",
          )}
        >
          <span
            aria-hidden
            className={cn("size-2 rounded-full", service.up ? "bg-leaf" : "bg-alarm")}
          />
          {service.name} {service.up ? "up" : "down"}
        </li>
      ))}
    </ul>
  );
}

/** Shown while the health checks run, the same height as the real line so nothing jumps. */
export function StatusLineFallback() {
  return <p className="text-xs leading-4 text-muted-foreground">Checking services</p>;
}
