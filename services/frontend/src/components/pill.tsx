import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Each tone is one meaning from globals.css, on its soft tint.
const TONES = {
  neutral: "bg-muted text-foreground",
  water: "bg-water-soft text-water",
  leaf: "bg-leaf-soft text-leaf",
  stale: "bg-stale-soft text-stale",
  alarm: "bg-alarm-soft text-alarm",
};

/** A small rounded label on a soft color, like P1's pills. */
export function Pill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof TONES;
  className?: string;
  children: ReactNode;
}) {
  return <Badge className={cn("h-auto px-2 py-0.5 text-xs font-medium", TONES[tone], className)}>{children}</Badge>;
}
