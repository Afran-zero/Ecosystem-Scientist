# Ecosystem Scientist

A top-down pixel-art ecosystem game. Explore one island, watch seven species live out their lives, and use a research lab to run experiments. Three restoration missions start from damaged island states.

The product spec is `Product requirements.txt`. The plan, design notes, and project memory are in `docs/`.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000 (menu) and /game (island)
```

## Check it

```bash
npm run check        # typecheck + unit tests
npm run build        # production build
npm run e2e          # Playwright (starts the production server on port 3100)
npm run sim:calibrate -- 90 1 2 3   # 90-day hub run across seeds
```

## Rebuild the island

```bash
npm run build:maps   # python tools/build_hub_map.py (needs Pillow)
```

## Layout

- `src/simulation/` — ecology engine (pure TypeScript, no rendering)
- `src/game/` — Phaser scenes
- `src/app/` — Next.js pages
- `public/data/` — species, food web, environment (ecology numbers live here)
- `public/maps/` — Tiled JSON maps
- `assets/sources/` — original downloads (CC0 packs). Not served.
- `docs/` — plan, brain (architecture, ecology, decisions), memory (status, assets)

## Credits

Art: Tiny Islands by Majadroid, and Tiny Creatures by Clint Bellanger with Kenney (both CC0). Attribution is not required, and is appreciated. See `public/assets/` licence notes.
# Ecosystem-Scientist
