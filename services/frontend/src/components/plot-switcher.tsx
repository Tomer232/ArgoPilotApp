"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SwitcherFarm = { id: string; name: string; plots: { id: string; name: string }[] };

/** The plot's name as a dropdown: pick another plot, grouped by farm, to open its page. */
export function PlotSwitcher({ farms, plotId }: { farms: SwitcherFarm[]; plotId: string }) {
  const router = useRouter();
  const items = farms.flatMap((farm) => farm.plots.map((plot) => ({ value: plot.id, label: plot.name })));
  return (
    <Select items={items} value={plotId} onValueChange={(id) => id && id !== plotId && router.push(`/plots/${id}`)}>
      <SelectTrigger
        aria-label="Plot"
        className="tight -ml-2.5 h-auto border-transparent bg-transparent py-1 text-[28px] leading-tight font-semibold hover:bg-muted [&_svg]:size-5!"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start" className="min-w-56">
        {farms.map((farm) => (
          <SelectGroup key={farm.id}>
            <SelectLabel>{farm.name}</SelectLabel>
            {farm.plots.map((plot) => (
              <SelectItem key={plot.id} value={plot.id}>
                {plot.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
