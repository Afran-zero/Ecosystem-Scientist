"""Build the atlas and all island maps: the hub and the three restoration missions.

Run from the project root:  python tools/build_maps.py

Inputs (kept in assets/sources, never served directly):
  assets/sources/tiny-islands/x/Tiny-Islands-by-Majadroid/tilemap.png   (CC0, 14 x 10 tiles, no spacing)
  assets/sources/tiny-creatures/x/tiny-creatures/Tilemap/tilemap.png   (CC0, 10 x 18 tiles, 1 px spacing)
  assets/sources/kenney-tiny-town/x/Tilemap/tilemap.png                (CC0, 12 x 11 tiles, 1 px spacing)

Outputs:
  public/assets/tilesets/atlas.png        one terrain atlas for every map
  public/assets/animals/creatures.png     Tiny Creatures sheet for animals and the player
  public/maps/hub.json                    the hub island
  public/maps/mission-meadow.json         mission 1 damage: bare ground, 18 trees
  public/maps/mission-forest.json         mission 2 damage: 360-tile forest, 8 trees
  public/maps/mission-pond.json           mission 3 damage: murky pond, 12 trees

Maps are Tiled JSON (format 1.10) with an extra "ecology" block that the simulation reads.
Atlas indexes are recorded in docs/memory/ASSETS.md. Keep the constants below in sync with it.
"""

import json
import math
import random
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TI_PNG = ROOT / "assets/sources/tiny-islands/x/Tiny-Islands-by-Majadroid/tilemap.png"
TC_PNG = ROOT / "assets/sources/tiny-creatures/x/tiny-creatures/Tilemap/tilemap.png"
TOWN_PNG = ROOT / "assets/sources/kenney-tiny-town/x/Tilemap/tilemap.png"
ATLAS_OUT = ROOT / "public/assets/tilesets/atlas.png"
CREATURES_OUT = ROOT / "public/assets/animals/creatures.png"
MAPS_DIR = ROOT / "public/maps"

W, H = 160, 120
TILE = 16
ATLAS_COLS = 14
ATLAS_TILECOUNT = 168

# --- Atlas indexes (0-based). Index = row * 14 + col. ---
TILE_WATER = 31                      # solid blue water (Tiny Islands, opaque)
TILE_TREE_A = 5                      # trees on green (Tiny Islands)
TILE_TREE_B = 19                     # trees on green (Tiny Islands)
TILE_GRASS = [140, 141, 142, 143]    # derived grass variants of #15
TILE_SAND = [144, 145]               # derived sand (coast and pond rim)
TILE_FOREST_FLOOR = [146, 147]       # derived darker grass under the forest
TILE_MEADOW = [148, 149]             # derived lighter grass for the meadow
TILE_DIRT = [161, 162]               # derived bare ground (meadow after damage)
TILE_MURKY = [163, 164]              # derived murky pond water (pond after pollution)
# Tiny Town (Kenney, CC0) pieces for the research lab, copied into row 11. Source index (12 columns) -> atlas.
TOWN_TILES = {48: 154, 49: 155, 51: 156, 50: 157, 76: 158, 77: 159, 90: 160}

SAND_BASE, SAND_LIGHT, SAND_DARK = (222, 199, 128), (236, 214, 150), (196, 170, 104)
GRASS_BASE, GRASS_LIGHT, GRASS_DARK = (50, 140, 25), (64, 160, 34), (38, 112, 18)
FOREST_BASE, FOREST_LIGHT, FOREST_DARK = (30, 96, 30), (38, 112, 36), (22, 76, 22)
MEADOW_BASE, MEADOW_LIGHT, MEADOW_DARK = (120, 176, 52), (140, 192, 64), (100, 156, 42)
DIRT_BASE, DIRT_LIGHT, DIRT_DARK = (150, 112, 72), (168, 130, 86), (120, 88, 56)
MURKY_BASE, MURKY_LIGHT, MURKY_DARK = (58, 92, 66), (74, 110, 76), (44, 70, 52)

REGION_LEGEND = {
    "grassland": 1,
    "meadow": 2,
    "forest": 3,
    "forest_edge": 4,
    "pond": 5,
    "station": 6,
    "pond_shore": 7,
}

POND_CENTRE = (52, 67)
LAB_ORIGIN = (30, 75)  # top-left of the 5 x 4 lab building
FOREST_RECT_W, FOREST_RECT_H = 24, 15  # 24 x 15 = 360 forest tiles (mission 2)
TREES_MEADOW = 18
TREES_POND = 12


def speckle(seed, base, light, dark, tufts):
    rnd = random.Random(seed)
    tile = Image.new("RGBA", (16, 16), base + (255,))
    px = tile.load()
    for y in range(16):
        for x in range(16):
            r = rnd.random()
            if r < 0.10:
                px[x, y] = light + (255,)
            elif r < 0.18:
                px[x, y] = dark + (255,)
    for _ in range(tufts):
        x, y = rnd.randint(1, 13), rnd.randint(1, 13)
        for dx, dy in ((0, 0), (-1, 1), (1, 1)):
            px[x + dx, y + dy] = dark + (255,)
    return tile


def put(atlas, index, tile):
    atlas.paste(tile, ((index % ATLAS_COLS) * 16, (index // ATLAS_COLS) * 16))


def build_atlas():
    ti = Image.open(TI_PNG).convert("RGBA")
    atlas = Image.new("RGBA", (224, 192), (0, 0, 0, 0))
    atlas.paste(ti, (0, 0))
    for n, idx in enumerate(TILE_GRASS):
        put(atlas, idx, speckle(n + 1, GRASS_BASE, GRASS_LIGHT, GRASS_DARK, tufts=2))
    for n, idx in enumerate(TILE_SAND):
        put(atlas, idx, speckle(100 + n, SAND_BASE, SAND_LIGHT, SAND_DARK, tufts=0))
    for n, idx in enumerate(TILE_FOREST_FLOOR):
        put(atlas, idx, speckle(200 + n, FOREST_BASE, FOREST_LIGHT, FOREST_DARK, tufts=1))
    for n, idx in enumerate(TILE_MEADOW):
        put(atlas, idx, speckle(300 + n, MEADOW_BASE, MEADOW_LIGHT, MEADOW_DARK, tufts=2))
    for n, idx in enumerate(TILE_DIRT):
        put(atlas, idx, speckle(400 + n, DIRT_BASE, DIRT_LIGHT, DIRT_DARK, tufts=0))
    for n, idx in enumerate(TILE_MURKY):
        put(atlas, idx, speckle(500 + n, MURKY_BASE, MURKY_LIGHT, MURKY_DARK, tufts=1))

    town = Image.open(TOWN_PNG).convert("RGBA")
    for src, dst in TOWN_TILES.items():
        sx, sy = (src % 12) * 17, (src // 12) * 17
        put(atlas, dst, town.crop((sx, sy, sx + 16, sy + 16)))

    ATLAS_OUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(ATLAS_OUT)
    shutil.copyfile(TC_PNG, CREATURES_OUT)


def land_mask():
    """Island shape: a noisy ellipse centred on the map. Shared by every island map."""
    cx, cy = 80, 60
    rnd = random.Random(7)
    phases = [(rnd.random() * math.tau, rnd.random() * math.tau, 0.5 + rnd.random()) for _ in range(4)]
    mask = [[False] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            dx = (x - cx) / 62.0
            dy = (y - cy) / 47.0
            r = math.hypot(dx, dy)
            noise = 0.0
            for k, (pa, pb, amp) in enumerate(phases):
                noise += 0.05 * amp * math.sin((x / (9.0 + 4 * k)) + pa) * math.cos((y / (7.0 + 3 * k)) + pb)
            mask[y][x] = r + noise < 0.90
    return mask


def in_rect(x, y, r):
    x0, y0, x1, y1 = r
    return x0 <= x <= x1 and y0 <= y <= y1


def in_pond(x, y):
    return ((x - POND_CENTRE[0]) / 6.5) ** 2 + ((y - POND_CENTRE[1]) / 4.5) ** 2 <= 1.0


def near_pond(x, y, radius=10):
    return math.hypot(x - POND_CENTRE[0], y - POND_CENTRE[1]) <= radius


def find_mission_forest(land):
    """Finds a 24 x 15 all-land rectangle near the old forest, away from the pond and the lab.
    Returns (rect, tree positions). The 8 trees sit on a 4 x 2 grid of 3 x 3 crowns inside the rect,
    so the crowns do not overlap and cover 8 x 9 = 72 of 360 tiles (20%)."""
    best = None
    for y0 in range(14, 62):
        for x0 in range(70, 124):
            x1, y1 = x0 + FOREST_RECT_W - 1, y0 + FOREST_RECT_H - 1
            if x1 >= W or y1 >= H:
                continue
            ok = True
            for y in range(y0, y1 + 1):
                for x in range(x0, x1 + 1):
                    if not land[y][x] or in_pond(x, y) or in_rect(x, y, (27, 74, 38, 86)) or in_rect(x, y, (LAB_ORIGIN[0] - 1, LAB_ORIGIN[1] - 1, LAB_ORIGIN[0] + 5, LAB_ORIGIN[1] + 4)):
                        ok = False
                        break
                if not ok:
                    break
            if not ok:
                continue
            dist = abs(x0 - 100) + abs(y0 - 26)
            if best is None or dist < best[0]:
                best = (dist, (x0, y0, x1, y1))
    if best is None:
        raise RuntimeError("no 24 x 15 land rectangle for the mission forest")
    x0, y0, x1, y1 = best[1]
    trees = [(x0 + 2 + 6 * i, y0 + 2 + 6 * j) for j in range(2) for i in range(4)]
    return best[1], trees


MISSION_FOREST_RECT = None
MISSION_FOREST_TREES = []


def region_of(x, y, kind):
    """Region name for a land tile. kind is hub, meadow, forest, or pond.
    The meadow, station, and pond are the same on every map. Only the forest changes:
    on the forest map it is the 24 x 15 patch, with a 3-tile edge ring."""
    if in_pond(x, y):
        return "pond"
    if in_rect(x, y, (27, 74, 38, 86)):
        return "station"
    if kind == "forest":
        if in_rect(x, y, MISSION_FOREST_RECT):
            return "forest"
        x0, y0, x1, y1 = MISSION_FOREST_RECT
        if in_rect(x, y, (x0 - 3, y0 - 3, x1 + 3, y1 + 3)):
            return "forest_edge"
    else:
        if in_rect(x, y, (96, 12, 138, 50)):
            return "forest"
        if in_rect(x, y, (84, 8, 96, 50)) or in_rect(x, y, (96, 50, 138, 58)):
            return "forest_edge"
    if in_rect(x, y, (86, 58, 130, 96)):
        return "meadow"
    if near_pond(x, y):
        return "pond_shore"
    return "grassland"


def is_land_coast(land, x, y):
    return any(not (0 <= x + dx < W and 0 <= y + dy < H and land[y + dy][x + dx])
               for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))


def place_random_trees(count, forest_tiles, rnd):
    """Places trees on forest tiles, at least 2 tiles apart, until `count` are placed."""
    chosen = []
    tries = 0
    while len(chosen) < count and tries < 100000:
        tries += 1
        x, y = rnd.choice(forest_tiles)
        if any(abs(x - cx) < 2 and abs(y - cy) < 2 for cx, cy in chosen):
            continue
        chosen.append((x, y))
    if len(chosen) < count:
        raise RuntimeError(f"could not place {count} trees on the forest")
    return chosen


def build_map(map_id, kind, out_path):
    rnd = random.Random({"hub": 2026, "meadow": 11, "forest": 22, "pond": 33}[kind])
    land = land_mask()
    global MISSION_FOREST_RECT, MISSION_FOREST_TREES
    MISSION_FOREST_RECT, MISSION_FOREST_TREES = find_mission_forest(land)

    def is_land(x, y):
        return 0 <= x < W and 0 <= y < H and land[y][x]

    ground = [[TILE_WATER] * W for _ in range(H)]
    buildings = [[0] * W for _ in range(H)]
    vegetation = [[0] * W for _ in range(H)]
    solid = [[0] * W for _ in range(H)]
    regions = [[0] * W for _ in range(H)]

    for y in range(H):
        for x in range(W):
            if not land[y][x]:
                continue
            reg = region_of(x, y, kind)
            regions[y][x] = REGION_LEGEND[reg]
            if reg == "pond":
                ground[y][x] = TILE_MURKY[0] if kind == "pond" else TILE_WATER
                solid[y][x] = TILE_WATER + 1
                continue
            if is_land_coast(land, x, y) or any(in_pond(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                ground[y][x] = rnd.choice(TILE_SAND)
            elif reg == "forest":
                ground[y][x] = rnd.choice(TILE_FOREST_FLOOR)
            elif reg == "meadow":
                ground[y][x] = rnd.choice(TILE_DIRT) if kind == "meadow" else rnd.choice(TILE_MEADOW)
            else:
                ground[y][x] = rnd.choice(TILE_GRASS)

    # Trees. The hub has natural groves. Missions have exact counts, planted in the forest.
    forest_tiles = [(x, y) for y in range(H) for x in range(W) if regions[y][x] == REGION_LEGEND["forest"]]
    trees = []
    if kind == "hub":
        for y in range(H):
            for x in range(W):
                if not land[y][x]:
                    continue
                reg = region_of(x, y, kind)
                if (reg == "forest" and rnd.random() < 0.38) or (reg == "forest_edge" and rnd.random() < 0.10) or (
                    reg == "grassland" and rnd.random() < 0.012
                ):
                    trees.append((x, y))
    elif kind == "forest":
        trees = list(MISSION_FOREST_TREES)
    elif kind == "meadow":
        trees = place_random_trees(TREES_MEADOW, forest_tiles, rnd)
    elif kind == "pond":
        trees = place_random_trees(TREES_POND, forest_tiles, rnd)

    for x, y in trees:
        vegetation[y][x] = (TILE_TREE_A if rnd.random() < 0.5 else TILE_TREE_B) + 1
        solid[y][x] = TILE_WATER + 1

    # Research lab: 5 x 4 stone building, door on the south side. Same on every island map.
    lx, ly = LAB_ORIGIN
    lab_rows = [
        [TOWN_TILES[48], TOWN_TILES[49], TOWN_TILES[51], TOWN_TILES[49], TOWN_TILES[50]],
        [TOWN_TILES[76], TOWN_TILES[77], TOWN_TILES[76], TOWN_TILES[77], TOWN_TILES[76]],
        [TOWN_TILES[76], TOWN_TILES[77], TOWN_TILES[76], TOWN_TILES[77], TOWN_TILES[76]],
        [TOWN_TILES[76], TOWN_TILES[77], TOWN_TILES[90], TOWN_TILES[77], TOWN_TILES[76]],
    ]
    for row, tiles_row in enumerate(lab_rows):
        for col, atlas_index in enumerate(tiles_row):
            buildings[ly + row][lx + col] = atlas_index + 1
            solid[ly + row][lx + col] = TILE_WATER + 1
    lab_entrance = (lx + 2, ly + 4)

    spawn = (40, 80)
    assert land[spawn[1]][spawn[0]] and solid[spawn[1]][spawn[0]] == 0, "spawn is blocked"
    assert solid[lab_entrance[1]][lab_entrance[0]] == 0, "lab entrance is blocked"

    for y in range(H):
        for x in range(W):
            if not land[y][x]:
                solid[y][x] = TILE_WATER + 1

    if kind == "hub":
        interactive = [
            {"name": "research-station", "type": "lab-entrance", "x": lab_entrance[0], "y": lab_entrance[1]},
            {"name": "mission-meadow", "type": "mission", "missionId": "mission-meadow", "x": 88, "y": 76},
            {"name": "mission-forest", "type": "mission", "missionId": "mission-forest", "x": 100, "y": 52},
            {"name": "mission-pond", "type": "mission", "missionId": "mission-pond", "x": 58, "y": 67},
        ]
    else:
        interactive = [
            {"name": "research-station", "type": "lab-entrance", "x": lab_entrance[0], "y": lab_entrance[1]},
            {"name": "exit-to-island", "type": "exit", "target": "hub", "x": spawn[0], "y": spawn[1]},
        ]

    counts = {name: 0 for name in REGION_LEGEND}
    for y in range(H):
        for x in range(W):
            if regions[y][x]:
                name = next(k for k, v in REGION_LEGEND.items() if v == regions[y][x])
                counts[name] += 1

    layers = [
        tile_layer(1, "ground", [[v + 1 if v else 0 for v in row] for row in ground]),
        tile_layer(2, "vegetation", vegetation),
        tile_layer(6, "buildings", buildings),
        tile_layer(3, "solid", solid, visible=False),
        tile_layer(4, "decor", [[0] * W for _ in range(H)]),
        object_layer(5, "interactive", interactive),
    ]
    tiled = {
        "compressionlevel": -1,
        "height": H,
        "infinite": False,
        "layers": layers,
        "nextlayerid": 7,
        "nextobjectid": 1 + len(interactive),
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "tiledversion": "1.10.2",
        "tileheight": TILE,
        "tilesets": [
            {
                "columns": ATLAS_COLS,
                "firstgid": 1,
                "image": "../assets/tilesets/atlas.png",
                "imageheight": 192,
                "imagewidth": 224,
                "margin": 0,
                "name": "atlas",
                "spacing": 0,
                "tilecount": ATLAS_TILECOUNT,
                "tileheight": TILE,
                "tilewidth": TILE,
            }
        ],
        "tilewidth": TILE,
        "type": "map",
        "version": "1.10",
        "width": W,
    }
    tiled["ecology"] = {
        "mapId": map_id,
        "spawn": {"x": spawn[0], "y": spawn[1]},
        "regionLegend": REGION_LEGEND,
        "regionCounts": counts,
        "regions": regions,
        "trees": [[x, y] for x, y in trees],
        "grassRegions": [k for k in REGION_LEGEND if k not in ("pond", "station")],
        "forestRegions": ["forest"],
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(tiled, f, separators=(",", ":"))
    forest_count = counts["forest"]
    print(f"{map_id}: trees {len(trees)}, forest tiles {forest_count}, regions {counts}")
    return len(trees), forest_count


def tile_layer(layer_id, name, grid, visible=True):
    data = [v for row in grid for v in row]
    return {
        "data": data,
        "height": H,
        "id": layer_id,
        "name": name,
        "opacity": 1,
        "type": "tilelayer",
        "visible": visible,
        "width": W,
        "x": 0,
        "y": 0,
    }


def object_layer(layer_id, name, objects):
    out = []
    for i, o in enumerate(objects, start=1):
        props = [{"name": k, "type": "string", "value": str(v)} for k, v in o.items() if k not in ("x", "y", "name")]
        out.append({
            "id": i,
            "name": o["name"],
            "x": o["x"] * TILE,
            "y": o["y"] * TILE,
            "width": 0,
            "height": 0,
            "point": True,
            "properties": props,
            "rotation": 0,
            "visible": True,
        })
    return {
        "draworder": "topdown",
        "id": layer_id,
        "name": name,
        "objects": out,
        "opacity": 1,
        "type": "objectgroup",
        "visible": True,
        "x": 0,
        "y": 0,
    }


if __name__ == "__main__":
    build_atlas()
    build_map("hub", "hub", MAPS_DIR / "hub.json")
    build_map("mission-meadow", "meadow", MAPS_DIR / "mission-meadow.json")
    build_map("mission-forest", "forest", MAPS_DIR / "mission-forest.json")
    build_map("mission-pond", "pond", MAPS_DIR / "mission-pond.json")
