// How the grower can tell how wet the soil is, by feel, for each of our soils.
//
// Source: USDA NRCS Program Aid 1619, "Estimating Soil Moisture by Feel and Appearance" (1998),
// pp. 2, 4, 5 and 6. Our soils map to its texture groups: sand to "fine sand and loamy fine
// sand", loam to "sandy clay loam, loam and silt loam", clay loam to "clay, clay loam and silty
// clay loam". The sentences are shortened from the guide (see
// services/planner-service/docs/research/soil-feel.md, section 2).
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

/** The five descriptions of one soil, in the order of LEVELS. */
const DESCRIPTIONS: Record<string, string[]> = {
  sand: [
    "Loose and dry; it holds together only if left alone, and loose grains stick to your fingers.",
    "Squeezed, it makes a very weak ball that shows your finger marks and leaves a light coating of grains on your fingers.",
    "Squeezed, it makes a weak ball, looks darker, leaves moderate water staining on your fingers and will not ribbon.",
    "Squeezed, it makes a weak ball, looks darker, leaves heavy water staining on your fingers and will not ribbon.",
    "Squeezed, it makes a weak ball and leaves a wet outline of the ball on your hand.",
  ],
  loam: [
    "It breaks apart easily, clods crumble under pressure, and it leaves no stain on your fingers.",
    "Squeezed, it makes a weak ball with rough surfaces and no water stain on your fingers.",
    "Squeezed, it makes a ball that bends, looks darker, leaves very light staining and forms a weak ribbon between thumb and finger.",
    "Squeezed, it makes a ball that keeps your finger marks, coats your fingers with wet soil and ribbons between thumb and finger.",
    "Squeezed, it makes a soft ball, free water shows on the surface for a moment and your fingers are heavily coated.",
  ],
  "clay-loam": [
    "It separates easily, but clods are hard to crumble under pressure and it leaves no stain on your fingers.",
    "Squeezed, it makes a weak ball, a clod flattens under pressure and there is no water stain on your fingers.",
    "Squeezed, it makes a smooth ball with finger marks, lightly stains your fingers and ribbons between thumb and finger.",
    "Squeezed, it makes a ball, coats your fingers unevenly with wet soil and ribbons easily between thumb and finger.",
    "Squeezed, it makes a soft ball, free water shows on the surface and the soil is slick and sticky on your fingers.",
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
