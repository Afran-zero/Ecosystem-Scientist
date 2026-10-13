"""Draws the tree and stump sprites used by the island (plan M1.6).

Why this exists: the Tiny Islands atlas only has single 16 x 16 tree tiles, so a tree cannot be
taller than one tile. These sprites are 16 x 32 (a canopy above its trunk tile) and 16 x 16 (a
cut stump). The base of each sprite sits on its tile, so collision stays on that tile and the
player is drawn behind or in front of the sprite by its base line.

Usage:  python tools/make_tree_sprites.py
Output: public/assets/vegetation/tree-16x32.png and stump-16x16.png (deterministic: same bytes each run).
Licence: drawn for this project. It is not from a third-party pack.
"""

import random
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public" / "assets" / "vegetation"

OUTLINE = (18, 44, 26, 255)
CANOPY_DARK = (28, 88, 40, 255)
CANOPY_MID = (46, 128, 54, 255)
CANOPY_LIGHT = (92, 172, 76, 255)
TRUNK = (104, 68, 36, 255)
TRUNK_DARK = (64, 40, 22, 255)
STUMP_TOP = (176, 132, 78, 255)
STUMP_RING = (132, 92, 52, 255)


def draw_tree(seed: int = 7) -> Image.Image:
    rng = random.Random(seed)
    img = Image.new("RGBA", (16, 32), (0, 0, 0, 0))
    px = img.load()

    # Canopy: an ellipse in rows 0-19, centred on column 7.5.
    cx, cy, rx, ry = 7.5, 9.5, 7.2, 8.6

    def inside(x: float, y: float) -> bool:
        return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0

    for y in range(0, 20):
        for x in range(0, 16):
            if not inside(x + 0.5, y + 0.5):
                continue
            edge = any(not inside(x + 0.5 + dx, y + 0.5 + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge:
                px[x, y] = OUTLINE
                continue
            # Light from the upper left, shade on the lower right.
            light = (x + 0.5 - cx) / rx * -0.6 + (y + 0.5 - cy) / ry * -0.6
            if light > 0.45:
                colour = CANOPY_LIGHT
            elif light < -0.25:
                colour = CANOPY_DARK
            else:
                colour = CANOPY_MID
            roll = rng.random()
            if roll < 0.10:
                colour = CANOPY_DARK if colour != CANOPY_DARK else CANOPY_MID
            elif roll > 0.94:
                colour = CANOPY_LIGHT
            px[x, y] = colour

    # Trunk: two columns from the canopy down to the base row (31).
    for y in range(18, 32):
        for x in (7, 8):
            px[x, y] = TRUNK
        px[6, y] = OUTLINE if y < 31 else TRUNK_DARK
        px[9, y] = OUTLINE if y < 31 else TRUNK_DARK
    for x in range(5, 11):
        px[x, 31] = TRUNK_DARK
    px[7, 24] = TRUNK_DARK
    px[8, 27] = TRUNK_DARK
    return img


def draw_stump(seed: int = 11) -> Image.Image:
    rng = random.Random(seed)
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Cut top: an ellipse of light wood in rows 5-9, with a darker ring.
    for y in range(4, 10):
        for x in range(3, 13):
            ex = (x + 0.5 - 8) / 5.2
            ey = (y + 0.5 - 7) / 3.4
            d = ex * ex + ey * ey
            if d <= 1.0:
                px[x, y] = STUMP_RING if d > 0.45 else STUMP_TOP
    # Body: trunk colour with a few grain lines, outlined, base in row 15.
    for y in range(7, 16):
        for x in range(4, 12):
            if x in (3, 12):
                continue
            px[x, y] = TRUNK
            if rng.random() < 0.08:
                px[x, y] = TRUNK_DARK
    for y in range(7, 16):
        px[4, y] = OUTLINE
        px[11, y] = OUTLINE
    for x in range(4, 12):
        px[x, 15] = TRUNK_DARK
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    draw_tree().save(OUT / "tree-16x32.png", optimize=True)
    draw_stump().save(OUT / "stump-16x16.png", optimize=True)
    print(f"wrote {OUT / 'tree-16x32.png'} and {OUT / 'stump-16x16.png'}")


if __name__ == "__main__":
    main()
