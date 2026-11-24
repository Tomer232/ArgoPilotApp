// Tests for the soil-by-feel rows on the plot page: the start_pct each answer sends and that every
// registry soil has its five descriptions (USDA NRCS Program Aid 1619).

import { describe, expect, it } from "vitest";

import { getSoilFeelRows } from "./soil-feel";

// The soil ids the registry seeds (services/registry-service/seed.py).
const SEED_SOILS = ["sand", "loam", "clay-loam"];

describe("getSoilFeelRows", () => {
  it.each(SEED_SOILS)("gives five rows for the seed soil %s", (soilId) => {
    expect(getSoilFeelRows(soilId)).toHaveLength(5);
  });

  it("sends the middle of each guide range as start_pct, driest first", () => {
    // 0-25 -> 12.5, 25-50 -> 37.5, 50-75 -> 62.5, 75-100 -> 87.5, free water -> 100.
    expect(getSoilFeelRows("loam")!.map((row) => row.startPct)).toEqual([12.5, 37.5, 62.5, 87.5, 100]);
  });

  it("names the levels in order", () => {
    expect(getSoilFeelRows("sand")!.map((row) => row.label)).toEqual([
      "Dry",
      "Slightly moist",
      "Moist",
      "Wet",
      "Wet with free water",
    ]);
  });

  it("gives each soil its own description for a level", () => {
    expect(getSoilFeelRows("sand")![0].description).toBe("Loose grains, won't hold");
    expect(getSoilFeelRows("clay-loam")![0].description).toBe("Hard clods, no stain");
  });

  it.each(SEED_SOILS)("keeps every %s description to five words at most", (soilId) => {
    for (const row of getSoilFeelRows(soilId)!) {
      expect(row.description.split(" ").length).toBeLessThanOrEqual(5);
    }
  });

  it.each(["silt", "", "Sand"])("gives null for a soil with no descriptions (%j)", (soilId) => {
    expect(getSoilFeelRows(soilId)).toBeNull();
  });
});
