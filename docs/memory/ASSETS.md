# Asset manifest

Every downloaded media source for this project, with where it came from, its license, its checksum, and what it is used for. Raw downloads live in `assets/sources/` and are never served to the browser. Only files copied into `public/assets/` ship with the game.

Last updated: 2026-10-12.

---

## Downloaded

| Pack | Source (direct) | Listing | License | Size | SHA-256 (zip) | Perspective | Status |
|---|---|---|---|---|---|---|---|
| Tiny Islands - 16x16 Tilemap | https://opengameart.org/sites/default/files/tiny-islands-by-majadroid.zip | https://opengameart.org/content/tiny-islands-16x16-tilemap (also https://majadroid.itch.io/tiny-islands-16x16-tilemap) | CC0 (attribution not required, appreciated) | 56.9 KB | `54822337ac76011669cc57113c05a35b60dfa0118dc0667250d09cb06fe0f2f4` | Top-down | **Use for terrain, buildings, vegetation** |
| Tiny Creatures (v1.0) by Clint Bellanger, with Kenney | https://opengameart.org/sites/default/files/tiny-creatures.zip | https://opengameart.org/content/tiny-creatures | CC0 1.0 (crediting optional) | 180.5 KB | `b397566a1a0f9189dbeb1119a797e35d5985b587596b02f6631d1eacec40252d` | Side view / three-quarter (all creatures face right) | **Candidate for animals, pending perspective decision (see below)** |
| Kenney Tiny Town 1.1 | https://kenney.nl/media/pages/assets/tiny-town/a415fbeb49-1735736916/kenney_tiny-town.zip | https://kenney.nl/assets/tiny-town | CC0 (credit optional) | 182 KB | `9768692dccff1d706408a5aedd6ca4f6cd1409506cbc84cb2f862919764be977` | Top-down | **Used for the research lab building** (tiles at source index 48, 49, 50, 51, 76, 77, 90, placed in atlas row 11) |
| Animated Sideview Sprite Pack - Normal Animals, demo | https://itch.io (demo file 12055970 on vectoraith.itch.io) | https://vectoraith.itch.io/animated-sideview-sprite-pack-normal-animals | Stated free + commercial, but no redistribution as-is; see `assets/sources/vectoraith-sideview-demo/LICENSE-NOTES.txt` | 2.4 KB | `d38fcc588a4bcd5bb1531a9cc7cac772329838ca1ebc8d99d23bd16a1987b414` | Side view only | **Reference only. Not used.** |

Local paths:
- `assets/sources/kenney-tiny-town/` — zip, extracted copy in `x/`, licence in `x/License.txt`
- `assets/sources/tiny-islands/` — zip, extracted copy in `x/Tiny-Islands-by-Majadroid/`, `LICENSE.txt` (the pack's INFO file)
- `assets/sources/tiny-creatures/` — zip, extracted copy in `x/tiny-creatures/`, `LICENSE.txt` (the pack's License file)
- `assets/sources/vectoraith-sideview-demo/` — demo zip, `LICENSE-NOTES.txt`

### Tiny Islands — what's inside

- `tilemap.png`: 224 × 160 px, a 14 × 10 grid of 16 px tiles (about 140 tiles). Small. Terrain variety will need more tiles, or a composed mix of tiles.
- `tilemap-separated.png`: the same tiles, separated into individual images.
- `sample-scene.png`: a top-down island preview (water, grass, forest, rocks, buildings). Matches the spec's visual style.
- `Majadroid Brand Resources/`: author's logos. **Do not use in the game.**
- `buttons.png`: UI buttons from the sample. Optional.

Watch-outs: the tileset is a city-builder set. Check that the grassland, forest, pond, and shoreline tiles exist before relying on the size. The 160 × 120 hub map needs many repeats of a few ground tiles, which is normal for a tilemap.

### Tiny Creatures — what's inside

- `Tilemap/tilemap.png` (170 × 306 px) and `Tilemap/tilemap_packed.png`: 10 × 18 grid, 180 tiles of 16 × 16, 1 px spacing. Index file: `Tiled/creatures.tsx`.
- `Tiled/sampleMap.tmx` and `Tiled/dungeon.tsx`: example Tiled files.
- `Examples/`: four showcase images. Not needed in the game.
- Tile index = row × 10 + column (0-based), crop at x = col × 17, y = row × 17, size 16 × 16 (1 px spacing).
- Verified by enlarged labeled render (2026-10-12):
  - Chicken: **#150** (white hen)
  - Cow: **#151** (black-and-white cow)
  - Rabbit: **#177** (brown, long ears)
  - Fox: **#92 is the only candidate and is not confirmed.** Preview: `assets/previews/tc-92-fox-candidate.png`. It reads as a small orange pointed-ear animal, so it may be a cat, not a fox. It is a small orange, sitting, fox-or-cat-like sprite. #169 is a striped tiger and #97 is an armored knight, so neither is a fox.
  - Mouse: **no mouse or rat in the set. Substitute decided by user: #175 (squirrel) stands in for the mouse.** Preview: `assets/previews/tc-175-mouse-substitute.png`.
- Other animals for reference: goat #152, sheep #153, emu #154, zebra #155, lion #156, tiger #157, elephant #158, giraffe #159, deer #166, bears #168/#165.
- Plants: **none.** Tiny Creatures has no trees. **Correction: #118 is a baby figure and #119 a winged figure. An earlier note called them trees, which was wrong.** Trees come from Tiny Islands #5 and #19. Grass and forest floor also come from Tiny Islands.

### Tiny Islands — plant and terrain check (2026-10-12)

Render from `tilemap.png` (14 × 10 grid, 0-based indexes). **These indexes come from a visual read of a labeled render. Confirm each one by cropping before use.**
- Water and pond: #17, #18 (pond with shoreline ring), #0–#2 and #14–#16 (water and island), #3–#4 (island edge with pond).
- Grass: green grass with edges at #15 (island), and green ground tiles at the #71–#113 block.
- Trees: forest tiles #5, #6, #19, #33, #34 and tree tiles in the #71 and #85 block.
- Rocks: #6, #20, #34.
- Shadow, water-wave, and border decor are also present.

Plain grass fill: **#15 confirmed** (solid, opaque, seamless). **Textured grass variants** are derived from #15 and saved as `public/assets/tilesets/derived/grass-var1..4.png` (16 × 16, seeded speckles and tufts in the same green palette). Preview: `assets/previews/grass-variants-tiled.png`. No textured plain-grass tile exists in Tiny Islands. Every green tile with texture also contains a building or trees. Derived files are CC0 because the source is CC0. Tiny Islands indexes use **14 columns**: index = row × 14 + col, crop at x = col × 16, y = row × 16 (no spacing).
- Art perspective: side-facing (all face right, per `Tilesheet.txt`). **This conflicts with the spec's "top-down pixel art" visual style.** See the decision below.

---

## Open decision: animal perspective

The spec (§2, §3, "Visual style") calls for top-down pixel art. Both the candidate animal packs are side-facing. Options for the user:

1. **Use Tiny Creatures as side-facing sprites.** Simplest, CC0, has the animals. Accept a side-view look for animals on a top-down map (common in top-down games with billboard sprites).
2. **Find top-down animal sprites.** Search for CC0 top-down animal packs. Nothing downloaded yet.
3. **Use side-view sprites and change the spec's visual style.** Requires an explicit change to the spec.

Recommendation: option 2 if a CC0 top-down animal pack exists, else option 1. This is a user decision, so it is logged in DECISIONS.md as D-16 and is not settled here.

---

## Not downloaded yet (listed in the spec, to be checked at M0.6 or later)

- Kenney asset library (https://kenney.nl): check each pack's license file before use. Only needed for gaps in props, buildings, or UI.
- itch.io CC0 tilesets (filter for pixel art, top-down, 16×16): only if Tiny Islands is not enough for the three damaged mission maps.
- itch.io island pixel art: fallback for the same reason.

---

## Rules for assets

- Keep each pack's license file beside the pack in `assets/sources/` and copy it to `public/assets/LICENSES/` when the pack's files are used in the game (plan task M0.5).
- Do not copy the paid or restricted vectoraith pack into the repo beyond the demo.
- Do not use the Majadroid brand resources in the game.
- Record a checksum for every new download here.

---

## Fox search log (2026-10-12)

Goal: a CC0 fox, 16 × 16 px, side view, walk cycle. Result: **no candidate meets all four requirements yet.**

| Candidate | Source | License | Result | Reason |
|---|---|---|---|---|
| Fox (Spring Spring), `fox_0.gif` | https://opengameart.org/content/tiny-fox-and-dog-characters | CC-BY 3.0, OGA-BY, CC-BY-SA (attribution required, not CC0) | Rejected | 26 × 34 px, not 16 px grid. Front-facing, with flight and death poses. Local copy: `assets/sources/oga-fox-spring-spring/`. Preview: `assets/previews/oga-fox-spring-spring-frames.png` |
| 2D Pixel Art Fox Sprites (Elthen) | https://elthen.itch.io/2d-pixel-art-fox-sprites | Non-commercial with commercial exception per a comment; not verified | Rejected | License unverified, 32 × 32 slices reported, paid |
| Animal Asset Pack [16x16] (DeepDiveGameStudio) | https://deepdivegamestudio.itch.io/animalassetpack | Name-your-price, license not stated | Rejected | No fox in the listed animals |
| Fox (Wolf Pack Rework) | https://opengameart.org/content/fox-wolf-pack-rework | CC-BY 3.0 / OGA-BY / CC-BY 4.0 | Not checked | Attribution required, size not confirmed |
| Harvett Fox, Fox Sprite (OGA) | Found in search only | Unknown | Not checked | No license or size in snippets |

Options still open:
1. Accept an attribution license (for example CC-BY) for a fox from the list above, after checking its size and view.
2. Draw a 16 × 16 side-view fox in-house and release it as CC0 under this project's ownership.
3. Leave the fox out of the first build.

### Fox alternatives considered (2026-10-12)

- **Bear: not recommended.** Spec §5.1 allows exactly seven species. A bear sprite would show a different animal in the journal and food web. Preview: `assets/previews/canid-candidates.png` (#168 brown bear, #165 blue-grey bear).
- **Grey wolf-like canid, #93 or #94 (Tiny Creatures):** the closest canid in the set. Dark grey, pointed ears, pose is three-quarter, not verified as side view. The fox entry would use this sprite only if the user accepts a grey wolf as the fox's look.
- **Chosen direction is not final.** Open options: (a) grey wolf #93/#94 as the fox sprite, (b) draw a fox in-house, (c) leave the fox out of the first build.

---

## Final animal sprite map (decided 2026-10-12)

Source: Tiny Creatures (`assets/sources/tiny-creatures/x/tiny-creatures/Tilemap/tilemap.png`), CC0. Index = row × 10 + col. Crop at x = col × 17, y = row × 17, size 16 × 16.

| Spec species | Sprite tile | What it looks like | Notes |
|---|---|---|---|
| Rabbit | #177 | Brown, long ears | Confirmed |
| Cow | #151 | Black-and-white cow | Confirmed |
| Chicken | #150 | White hen | Confirmed |
| Mouse | #175 | Squirrel | User-chosen stand-in. Not a mouse. |
| Fox | #93 | Grey wolf-like canid | User-chosen stand-in. Not a fox. The simulation species stays `fox`. |
| Grass | Tiny Islands **#15** (solid green, `rgb(50,140,25)`) | Flat green fill | **Confirmed.** Fully opaque, one colour, tiles seamlessly. Preview: `assets/previews/ti-grass-15-tiled.png`. Flat, so add texture variants later if needed. |
| Trees | Tiny Islands **#5** and **#19** (trees on grass) | Green trees | Confirmed. Tiny Creatures #118/#119 are NOT trees. |

The species in the simulation stay exactly as the spec defines them (seven species, food web unchanged). Sprites are a visual layer only. The journal should show the species name from the spec, not the sprite's real animal.


---

## Lab building (2026-10-12)

The research lab is a 5 × 4 tile stone building. Its tiles come from Kenney Tiny Town (CC0), copied into the atlas at row 11 (`atlas index 154 + k`): roof 48, 49, 51, 50; wall 76, 77; arched door 90. Preview: `assets/previews/lab-closeup.png`. Tile indexes for Tiny Town use 12 columns (`row * 12 + col`), with 1 px spacing.
