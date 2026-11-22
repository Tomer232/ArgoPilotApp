import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Pill } from "@/components/pill";
import { StaleLabel } from "@/components/stale-label";
import { Card } from "@/components/ui/card";
import { formatArea, formatCoords, formatDate, formatDuration, formatLitres } from "@/lib/format";
import type { Result } from "@/lib/http";
import { tilesAround } from "@/lib/map-tiles";
import type { Plan } from "@/lib/planner";
import type { Plot } from "@/lib/registry";
import { cn } from "@/lib/utils";

// The map box is 10rem (160 px) tall. The tiles cover 640 px across, wider than the widest card.
const MAP_WIDTH = 640;
const MAP_HEIGHT = 160;

// The Today box's colours, one per answer.
const TODAY_TONES = {
  water: "bg-water-soft text-water",
  leaf: "bg-leaf-soft text-leaf",
  alarm: "bg-alarm-soft text-alarm",
};

/**
 * One plot as a card: a real map of its area (OpenStreetMap, centred on the plot's lat/lon),
 * its name and status, today's answer, and what it is (crop, area, soil, planting date).
 * The whole card opens the plot page. `farmName` is for a flat list (/plots), where no farm
 * heading sits above the card: the card then names its farm, and its title is one level higher.
 */
export function PlotCard({
  plot,
  plan,
  farmName,
  cropName,
  soilName,
}: {
  plot: Plot;
  plan?: Result<Plan>;
  farmName?: string;
  cropName?: string;
  soilName?: string;
}) {
  const Title = farmName === undefined ? "h3" : "h2";
  return (
    <Card className="relative min-w-0 gap-0 border py-0 ring-0 transition-colors hover:border-foreground/25">
      <PlotMap plot={plot} />
      <div className="flex flex-col gap-3 px-4 pt-3.5 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <Title className="text-base font-semibold">{plot.name}</Title>
            {farmName !== undefined && <p className="text-xs text-muted-foreground">{farmName}</p>}
          </div>
          <StatusPill plan={plan} />
        </div>
        <TodayBox plan={plan} />
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          <Detail label="Crop" value={cropName ?? plot.crop_id} />
          <Detail label="Area" value={formatArea(plot.area_m2)} />
          <Detail label="Soil" value={soilName ?? plot.soil_id} />
          <Detail label="Planted" value={formatDate(plot.planting_date)} />
        </dl>
      </div>
      {/* The link's ::after covers the whole card, so a tap anywhere on it opens the plot. */}
      <Link
        href={`/plots/${plot.id}`}
        className="mt-auto flex min-h-11 items-center justify-between border-t px-4 font-medium text-water after:absolute after:inset-0"
      >
        Open plan
        <ChevronRight aria-hidden className="size-4" />
      </Link>
    </Card>
  );
}

/**
 * The map: the OSM tiles around the plot, placed so the plot is at the centre. If the tiles
 * don't load, the box stays a plain grey area with the coordinates, and the card still works.
 */
function PlotMap({ plot }: { plot: Plot }) {
  const tiles = tilesAround(plot.lat, plot.lon, MAP_WIDTH, MAP_HEIGHT);
  return (
    <div
      role="img"
      aria-label={`Map of the area around ${plot.name}`}
      className="relative h-40 overflow-hidden border-b bg-muted"
    >
      {tiles.map((tile) => (
        <Image
          key={tile.url}
          src={tile.url}
          alt=""
          width={256}
          height={256}
          unoptimized
          className="absolute max-w-none"
          style={{ left: `calc(50% + ${tile.dx}px)`, top: `calc(50% + ${tile.dy}px)` }}
        />
      ))}
      <span className="absolute bottom-2 left-2 rounded-md bg-white/90 px-1.5 py-0.5 text-xs font-medium">
        {formatCoords(plot.lat, plot.lon)}
      </span>
      {/* Above the card's link, so the credit link can be clicked on its own (OSM asks for it). */}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="absolute right-0 bottom-0 z-10 rounded-tl-md bg-white/85 px-1.5 py-px text-[10px] text-foreground/75 hover:text-foreground"
      >
        © OpenStreetMap
      </a>
    </div>
  );
}

/** The short status next to the name: water today, soil OK, a stale forecast, or no plan. */
function StatusPill({ plan }: { plan?: Result<Plan> }) {
  if (!plan || !plan.ok) {
    return <Pill tone="alarm">No plan</Pill>;
  }
  const today = plan.data.days[0];
  if (today.stale) {
    return <StaleLabel />;
  }
  return today.run_minutes > 0 ? <Pill tone="water">Water today</Pill> : <Pill tone="leaf">Soil OK</Pill>;
}

/**
 * Today's answer, big. A stale forecast is said right under the answer it affects (FR-2.17);
 * a missing plan says why, in the planner's words (FR-2.18).
 */
function TodayBox({ plan }: { plan?: Result<Plan> }) {
  if (!plan || !plan.ok) {
    return (
      <TodayFrame tone="alarm" answer="Plan unavailable">
        {plan && <span className="text-xs">{plan.problem.detail}</span>}
      </TodayFrame>
    );
  }
  const today = plan.data.days[0];
  const staleNote = today.stale && <span className="text-xs text-stale">From an older weather update</span>;
  if (today.run_minutes === 0) {
    return (
      <TodayFrame tone="leaf" answer="No irrigation">
        {staleNote}
      </TodayFrame>
    );
  }
  return (
    <TodayFrame tone="water" answer={`Water ${formatDuration(today.run_minutes)}`}>
      <span className="text-xs">{formatLitres(today.litres)}</span>
      {staleNote}
    </TodayFrame>
  );
}

/** The coloured box around today's answer, with a small "Today" label above it. */
function TodayFrame({
  tone,
  answer,
  children,
}: {
  tone: keyof typeof TODAY_TONES;
  answer: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-lg px-3 py-2.5", TODAY_TONES[tone])}>
      <span className="text-xs text-foreground/70">Today</span>
      <span className="text-xl leading-tight font-semibold">{answer}</span>
      {children}
    </div>
  );
}

/** One label and value in the card's details grid. */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
