// Which OpenStreetMap tiles show the area around a plot, and where each one goes so the plot
// sits in the middle of the card's map. The browser loads the tiles straight from OSM: they
// are pictures only, no data the plan depends on.

export const TILE_SIZE = 256;
export const MAP_ZOOM = 15;
const TILE_HOST = "https://tile.openstreetmap.org";

// Web Mercator (the projection OSM tiles use) stops at this latitude; beyond it there are no tiles.
const MAX_LAT = 85.0511;

/** One tile: its address, and its top-left corner relative to the map's centre, in pixels. */
export type MapTile = {
  url: string;
  dx: number;
  dy: number;
};

/** The point's position in pixels on the whole world map at this zoom (the OSM tile formula). */
export function worldPixel(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const latRad = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  return {
    x: ((lon + 180) / 360) * worldSize,
    y: ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * worldSize,
  };
}

/**
 * The tiles that cover a box of `width` x `height` pixels centred on lat/lon. Columns wrap
 * around at 180° longitude; rows past the top or bottom of the world are left out.
 */
export function tilesAround(lat: number, lon: number, width: number, height: number, zoom = MAP_ZOOM): MapTile[] {
  const centre = worldPixel(lat, lon, zoom);
  const tilesPerSide = 2 ** zoom;
  const firstCol = Math.floor((centre.x - width / 2) / TILE_SIZE);
  const lastCol = Math.floor((centre.x + width / 2) / TILE_SIZE);
  const firstRow = Math.max(0, Math.floor((centre.y - height / 2) / TILE_SIZE));
  const lastRow = Math.min(tilesPerSide - 1, Math.floor((centre.y + height / 2) / TILE_SIZE));

  const tiles: MapTile[] = [];
  for (let row = firstRow; row <= lastRow; row++) {
    for (let col = firstCol; col <= lastCol; col++) {
      const wrappedCol = ((col % tilesPerSide) + tilesPerSide) % tilesPerSide;
      tiles.push({
        url: `${TILE_HOST}/${zoom}/${wrappedCol}/${row}.png`,
        dx: Math.round(col * TILE_SIZE - centre.x),
        dy: Math.round(row * TILE_SIZE - centre.y),
      });
    }
  }
  return tiles;
}
