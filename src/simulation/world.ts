import type { WorldMap } from "@/types";

/**
 * Builds the static WorldMap from a Tiled JSON map. The "ecology" block holds the
 * region grid, region legend, and tree positions. Collision uses the "solid" layer.
 * Phaser and the simulation read the same solid layer, so they agree on blocked tiles.
 */
export function parseWorldMap(json: unknown): WorldMap {
  const m = json as {
    width: number;
    height: number;
    layers: { name: string; type: string; data?: number[] }[];
    ecology: {
      mapId: string;
      spawn: { x: number; y: number };
      regionLegend: Record<string, number>;
      regions: number[][];
      trees: [number, number][];
      grassRegions: string[];
      forestRegions?: string[];
    };
  };
  const { width, height } = m;
  const solid = m.layers.find((l) => l.name === "solid")?.data;
  if (!solid || solid.length !== width * height) {
    throw new Error("map: missing or wrong-sized 'solid' layer");
  }
  const blocked = new Uint8Array(width * height);
  for (let i = 0; i < solid.length; i++) blocked[i] = solid[i] !== 0 ? 1 : 0;

  const regionOf = new Uint8Array(width * height);
  const regionNames: Record<number, string> = {};
  for (const [name, id] of Object.entries(m.ecology.regionLegend)) regionNames[id] = name;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      regionOf[y * width + x] = m.ecology.regions[y][x];
    }
  }
  const grassRegionIds = m.ecology.grassRegions.map((n) => {
    const id = m.ecology.regionLegend[n];
    if (id === undefined) throw new Error(`map: grass region "${n}" not in legend`);
    return id;
  });

  const forestRegionIds = (m.ecology.forestRegions ?? ["forest"]).map((n) => {
    const id = m.ecology.regionLegend[n];
    if (id === undefined) throw new Error(`map: forest region "${n}" not in legend`);
    return id;
  });

  const trees = m.ecology.trees.map(([x, y]) => ({ x, y }));
  for (const t of trees) {
    if (blocked[t.y * width + t.x] === 0) throw new Error("map: tree tile is not marked solid");
  }

  const spawn = m.ecology.spawn;
  if (blocked[spawn.y * width + spawn.x] !== 0) throw new Error("map: spawn tile is blocked");

  const objects = m.layers.find((l) => l.name === "interactive") as unknown as
    | { objects: { name: string; x: number; y: number; properties?: { name: string; value: string }[] }[] }
    | undefined;
  const interactive = (objects?.objects ?? []).map((o) => {
    const props: Record<string, string> = {};
    for (const p of o.properties ?? []) props[p.name] = p.value;
    return {
      name: o.name,
      type: props.type ?? "",
      x: Math.floor(o.x / 16),
      y: Math.floor(o.y / 16),
      props,
    };
  });

  return {
    id: m.ecology.mapId,
    width,
    height,
    blocked,
    regionOf,
    regionNames,
    grassRegionIds,
    trees,
    spawn,
    interactive,
    forestRegionIds,
  };
}

export function isBlocked(world: WorldMap, x: number, y: number): boolean {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= world.width || ty >= world.height) return true;
  return world.blocked[ty * world.width + tx] !== 0;
}
