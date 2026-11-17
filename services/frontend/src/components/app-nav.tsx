import { Droplet, Grid2x2, House, Layers, Sprout, Tractor } from "lucide-react";
import { cache } from "react";
import { NavLink, NavLinkView } from "@/components/nav-link";
import { listCrops, listEmitters, listFarms, listPlots, listSoils } from "@/lib/registry";

/**
 * How many rows each section has, for the numbers in the sidebar. Wrapped in React's cache so
 * the sidebar and the phone drawer share one set of registry calls per request.
 * A section the registry could not count shows no number.
 */
const getCounts = cache(async () => {
  const [farms, plots, crops, soils, emitters] = await Promise.all([
    listFarms(),
    listPlots(),
    listCrops(),
    listSoils(),
    listEmitters(),
  ]);
  return {
    farms: farms.ok ? farms.data.length : undefined,
    plots: plots.ok ? plots.data.length : undefined,
    crops: crops.ok ? crops.data.length : undefined,
    soils: soils.ok ? soils.data.length : undefined,
    emitters: emitters.ok ? emitters.data.length : undefined,
  };
});

/** The sections: the overview, the grower's farms and plots, then the registry's catalogues. */
export async function AppNav() {
  const counts = await getCounts();
  return <NavList counts={counts} Item={NavLink} />;
}

/** The same list without numbers or highlight, while they load (it may not read the address). */
export function AppNavFallback() {
  return <NavList counts={{}} Item={NavLinkView} />;
}

/** The links, in two groups. `Item` draws one link: NavLink (highlights the current page) or NavLinkView. */
function NavList({
  counts,
  Item,
}: {
  counts: Partial<Record<"farms" | "plots" | "crops" | "soils" | "emitters", number>>;
  Item: typeof NavLink;
}) {
  return (
    <nav aria-label="Main" className="grid gap-0.5">
      <Item href="/" icon={<House />} label="Overview" />
      <Item href="/farms" icon={<Tractor />} label="Farms" count={counts.farms} />
      <Item href="/plots" icon={<Grid2x2 />} label="Plots" count={counts.plots} />
      <p className="px-2.5 pt-4 pb-1 text-xs text-muted-foreground">Catalogue</p>
      <Item href="/crops" icon={<Sprout />} label="Crops" count={counts.crops} />
      <Item href="/soils" icon={<Layers />} label="Soils" count={counts.soils} />
      <Item href="/emitters" icon={<Droplet />} label="Emitters" count={counts.emitters} />
    </nav>
  );
}
