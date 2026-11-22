// Tests for the plot card's map: the right OSM tiles, placed so the plot is in the middle.

import { describe, expect, it } from "vitest";

import { MAP_ZOOM, TILE_SIZE, tilesAround, worldPixel } from "./map-tiles";

describe("worldPixel", () => {
  it("puts 0, 0 in the middle of the one zoom-0 tile", () => {
    expect(worldPixel(0, 0, 0)).toEqual({ x: 128, y: 128 });
  });

  it("does not break at the poles (the registry allows lat 90)", () => {
    const north = worldPixel(90, 0, MAP_ZOOM);
    expect(Number.isFinite(north.y)).toBe(true);
    expect(Math.abs(north.y)).toBeLessThan(TILE_SIZE);
  });
});

describe("tilesAround", () => {
  it("covers North block with the six tiles checked by hand on the design canvas", () => {
    const urls = tilesAround(31.25, 34.79, 640, 340).map((tile) => tile.url);
    expect(urls.sort()).toEqual(
      [
        "15/19549/13386",
        "15/19550/13386",
        "15/19551/13386",
        "15/19549/13387",
        "15/19550/13387",
        "15/19551/13387",
      ]
        .map((path) => `https://tile.openstreetmap.org/${path}.png`)
        .sort(),
    );
  });

  it("places the tile under the plot so it covers the map's centre", () => {
    const tiles = tilesAround(31.335, 34.665, 640, 160);
    const underCentre = tiles.filter((tile) => tile.dx <= 0 && tile.dx > -TILE_SIZE && tile.dy <= 0 && tile.dy > -TILE_SIZE);
    expect(underCentre).toHaveLength(1);
  });

  it("covers the whole box: tiles reach every edge", () => {
    const tiles = tilesAround(31.335, 34.665, 640, 160);
    expect(Math.min(...tiles.map((tile) => tile.dx))).toBeLessThanOrEqual(-320);
    expect(Math.max(...tiles.map((tile) => tile.dx + TILE_SIZE))).toBeGreaterThanOrEqual(320);
    expect(Math.min(...tiles.map((tile) => tile.dy))).toBeLessThanOrEqual(-80);
    expect(Math.max(...tiles.map((tile) => tile.dy + TILE_SIZE))).toBeGreaterThanOrEqual(80);
  });

  it("wraps columns around 180 degrees longitude", () => {
    const urls = tilesAround(0, 179.999, 640, 160).map((tile) => tile.url);
    expect(urls.some((url) => url.includes(`/${MAP_ZOOM}/0/`))).toBe(true);
    expect(urls.every((url) => !url.includes("/-"))).toBe(true);
  });

  it("leaves out rows past the top of the world", () => {
    const tiles = tilesAround(85, 0, 640, 600);
    expect(tiles.every((tile) => !tile.url.includes("/-"))).toBe(true);
  });
});
