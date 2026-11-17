"use client";

// The grower's choices on the plot page: soil today, the trigger and the start time.
// Each choice changes the page address; the server then renders the new plan. While it
// loads, the old numbers fade back (PendingArea) so the grower sees that something is happening.

import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hrefWith, type PlanQuery } from "@/lib/plan-query";
import type { SoilFeelRow } from "@/lib/soil-feel";
import { clockTime } from "@/lib/timeline";

type PlanNavigation = { change: (changes: PlanQuery) => void; pending: boolean };

const PlanNavigationContext = createContext<PlanNavigation>({ change: () => {}, pending: false });

/** Holds the page's current choices; `change` loads the page again with some of them changed. */
export function PlanNavigationProvider({ query, children }: { query: PlanQuery; children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const change = (changes: PlanQuery) => {
    startTransition(() => router.push(hrefWith(query, changes), { scroll: false }));
  };
  return <PlanNavigationContext.Provider value={{ change, pending }}>{children}</PlanNavigationContext.Provider>;
}

/** Wraps numbers that a choice changes: they fade back while the new plan loads. */
export function PendingArea({ className, children }: { className?: string; children: ReactNode }) {
  const { pending } = useContext(PlanNavigationContext);
  return (
    <div className={`pending-area ${className ?? ""}`} data-pending={pending} aria-busy={pending}>
      {children}
    </div>
  );
}

const EXACT = "exact";

/**
 * "Soil today": the five feel rows of this soil, each with its description, or an exact percent.
 * `chosen` is start_pct from the address (undefined: the default, wet with free water).
 */
export function SoilSelect({ rows, chosen }: { rows: SoilFeelRow[] | null; chosen?: string }) {
  const { change } = useContext(PlanNavigationContext);
  const options = rows ?? [];
  const matching = options.find((row) => chosen === undefined ? row.startPct === 100 : Number(chosen) === row.startPct);
  const [mode, setMode] = useState(matching ? String(matching.startPct) : EXACT);
  const items = [
    ...options.map((row) => ({ value: String(row.startPct), label: row.label })),
    { value: EXACT, label: chosen !== undefined && !matching ? `Exact: ${chosen}%` : "Exact percent" },
  ];

  /** A row changes the plan at once; "exact" only opens the box. */
  const pick = (value: string | null) => {
    if (value === null) return;
    setMode(value);
    if (value !== EXACT) change({ start_pct: value });
  };

  return (
    <Field label="Soil today" htmlFor="soil-today">
      <Select items={items} value={mode} onValueChange={pick}>
        <SelectTrigger id="soil-today" className="h-9 w-full bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="start" className="w-80 max-w-[calc(100vw-2rem)]">
          {options.map((row) => (
            <SelectItem key={row.key} value={String(row.startPct)} className="items-start py-2">
              <span className="flex flex-col gap-0.5 whitespace-normal">
                <span className="font-medium">{row.label}</span>
                <span className="text-xs text-muted-foreground">{row.description}</span>
              </span>
            </SelectItem>
          ))}
          {options.length > 0 && <SelectSeparator />}
          <SelectItem value={EXACT}>Exact percent</SelectItem>
        </SelectContent>
      </Select>
      {mode === EXACT && (
        <ExactBox name="start_pct" min={0} max={100} initial={matching ? undefined : chosen} label="Soil water %" />
      )}
    </Field>
  );
}

const CUSTOM = "custom";

/**
 * "Water when the soil falls below": half (the default), the crop's own value, or a custom percent.
 * `triggerPct` is the trigger the plan used.
 */
export function TriggerSelect({ triggerPct, cropTriggerPct }: { triggerPct: number; cropTriggerPct: number }) {
  const { change } = useContext(PlanNavigationContext);
  const presets = [{ value: "50", label: "Half (50%)" }];
  if (cropTriggerPct !== 50) presets.push({ value: String(cropTriggerPct), label: `Crop value (${cropTriggerPct}%)` });
  const isPreset = presets.some((preset) => Number(preset.value) === triggerPct);
  const [mode, setMode] = useState(isPreset ? String(triggerPct) : CUSTOM);
  const items = [...presets, { value: CUSTOM, label: isPreset ? "Custom percent" : `Custom (${triggerPct}%)` }];

  /** A preset changes the plan at once; "custom" only opens the box. */
  const pick = (value: string | null) => {
    if (value === null) return;
    setMode(value);
    if (value !== CUSTOM) change({ trigger_pct: value });
  };

  return (
    <Field label="Water when the soil falls below" htmlFor="trigger">
      <Select items={items} value={mode} onValueChange={pick}>
        <SelectTrigger id="trigger" className="h-9 w-full bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="start">
          {presets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CUSTOM}>Custom percent</SelectItem>
        </SelectContent>
      </Select>
      {mode === CUSTOM && (
        <ExactBox name="trigger_pct" min={1} max={99} initial={isPreset ? undefined : String(triggerPct)} label="Trigger %" />
      )}
    </Field>
  );
}

/** Every half hour of the day, "00:00" to "23:30". */
const HALF_HOURS = Array.from({ length: 48 }, (_, index) => clockTime(index * 30));

/** "Start watering at": a half-hour from the list. A time from the address that is not on it is added. */
export function StartSelect({ start }: { start: string }) {
  const { change } = useContext(PlanNavigationContext);
  const times = HALF_HOURS.includes(start) ? HALF_HOURS : [...HALF_HOURS, start].sort();
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      Start at
      <Select value={start} onValueChange={(value) => value && change({ start: value })}>
        <SelectTrigger size="sm" className="w-24 bg-card text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {times.map((time) => (
            <SelectItem key={time} value={time}>
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

/** A label above a control, with room for an extra row under it. */
function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

/** A number box with Apply, for an exact value. The browser checks min and max before it sends. */
function ExactBox({
  name,
  min,
  max,
  initial,
  label,
}: {
  name: "start_pct" | "trigger_pct";
  min: number;
  max: number;
  initial?: string;
  label: string;
}) {
  const { change } = useContext(PlanNavigationContext);
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const value = new FormData(event.currentTarget).get(name);
        if (typeof value === "string" && value !== "") change({ [name]: value });
      }}
    >
      <Input
        type="number"
        name={name}
        aria-label={label}
        min={min}
        max={max}
        step="any"
        required
        defaultValue={initial}
        placeholder={`${min}-${max}`}
        className="h-9 flex-1 bg-card! text-sm!"
      />
      <Button type="submit" size="lg" variant="outline">
        Apply
      </Button>
    </form>
  );
}
