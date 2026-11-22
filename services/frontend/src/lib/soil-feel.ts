// How the grower can tell how wet the soil is, by feel, for each of our soils.
//
// Source: USDA NRCS Program Aid 1619, "Estimating Soil Moisture by Feel and Appearance" (1998),
// pp. 2, 4, 5 and 6. Our soils map to its texture groups: sand to "fine sand and loamy fine
// sand", loam to "sandy clay loam, loam and silt loam", clay loam to "clay, clay loam and silty
// clay loam". The descriptions are the guide's sentences cut to their key sign (the full
// sentences are in services/planner-service/docs/research/soil-feel.md, section 2).
// Each row sends the middle of its guide range as start_pct (our choice, not the guide's).

export type SoilFeelRow = {
  key: string;
  label: string;
  description: string;
  startPct: number;
};

/** The five answers every soil has: key, label and the start_pct each one sends. */
const LEVELS = [
  { key: "dry", label: "Dry", startPct: 12.5 },
  { key: "slightly-moist", label: "Slightly moist", startPct: 37.5 },
  { key: "moist", label: "Moist", startPct: 62.5 },
  { key: "wet", label: "Wet", startPct: 87.5 },
  { key: "free-water", label: "Wet with free water", startPct: 100 },
];

/**
 * The five descriptions of one soil, in the order of LEVELS: one short phrase each (at most
 * five words), the key sign from the guide's full sentence (soil-feel.md, section 2).
 */
const DESCRIPTIONS: Record<string, string[]> = {
  sand: [
    "Loose grains, won't hold",
    "Very weak ball, grains stick",
    "Weak ball, moderate stain",
    "Weak ball, heavy stain",
    "Leaves wet outline on hand",
  ],
  loam: [
    "Crumbles, no finger stain",
    "Weak rough ball, no stain",
    "Bends, light stain, weak ribbon",
    "Holds finger marks, ribbons",
    "Free water on the surface",
  ],
  "clay-loam": [
    "Hard clods, no stain",
    "Weak ball, clods flatten",
    "Smooth ball, light stain",
    "Ribbons easily, coats fingers",
    "Slick, sticky, free water",
  ],
};

/** The five rows for a soil id, or null for a soil we have no descriptions for. */
export function getSoilFeelRows(soilId: string): SoilFeelRow[] | null {
  const descriptions = DESCRIPTIONS[soilId];
  if (!descriptions) {
    return null;
  }
  return LEVELS.map((level, index) => ({ ...level, description: descriptions[index] }));
}
