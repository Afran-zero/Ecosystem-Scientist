# Project memory — current state

Working log for this project. Read it at the start of a session, and update it at the end of a session. Keep entries short and dated. Decisions go to [../brain/DECISIONS.md](../brain/DECISIONS.md), not here.

---

## Current status

- **Phase:** M0 to M4 done. M3.4 live change, M4.11 journal, M1.9 touch controls, M4.9 reset test, and M4.1 idempotency are done. M1.6 still open (tree art). M5 not started.
- **Next actions, in order:**
  1. M1.6: replace the one-tile tree with a taller canopy sprite. Re-run `tests/e2e/depth-visual.spec.ts` and look at `assets/previews/depth-*.png`.
  2. Field guides: have someone check `public/data/animal-facts.json` against a source before teaching use (D-35).
  3. M5: saves for the live islands (Continue returns when this exists), performance check (M5.8), and deploy.
- **Deferred:** fox persistence (D-24). The user asked for this to wait.

## Milestone progress

| Milestone | Status | Done | Not done yet |
|---|---|---|---|
| M0 Setup | Done, except lint and licences | Next.js 16 + TypeScript, Tailwind, Phaser 4, Recharts, zod, Vitest, Playwright; `npm run check`; production build; client-only Phaser | ESLint (M0.3). Licence copies in `public/assets/LICENSES/` (M0.5). |
| M1 Playable world | Mostly done | Hub map (160×120, five layers); regions; player movement (diagonals normalised); camera follows and clamps; collision from the shared solid layer; scripted collision e2e (M1.3); tree sprites with depth at their base (M1.6 code, not yet tested); prompts for station, missions, animals | M1.6 automated check. Touch controls (M1.9). Mission briefing is a stub (M4). |
| M2 Living ecosystem | Core done; prey calibration settled | Config validation; hourly step and batching; seeded PRNG with restorable state; environment validator; grass regrowth and reserve; state machine for states in use; food web from config; prey eaten once; reproduction with cap; day records; invariants each hour in tests; determinism and restore | Trees do not grow. Idle and rest states unused. No spatial grid and no 400-animal benchmark (M2.8). Step-order test (M2.12). Fox persistence (deferred). |
| M3 Research laboratory | Built; some items open | Overlay with six tabs (M3.1); controls with validation and reset (M3.2); every control tested against a simulation read (M3.3); experiments with seed, validation, saved records (M3.5 partly); charts from day records (M3.7 partly); food-web diagram with selection (M3.8 partly); pause while open; state kept on close | Live intervention with confirmation (M3.4, needs M4). Chart-data unit test. Food-web test. Browser timing (M3.6). Submit to mission (needs M4). |
| M4 Three missions | Done (M4.1 generator is build_maps.py; M4.9 and M4.11 tested) | Mission loader and engine; three missions with reference and failing control; any-order completion (6 orders); results screen built from data; briefing dialog; mission lab (locked controls, evidence submit); mission progress saved; mission list page | None in M4. The plan names `tools/build-mission-maps.ts`; the real generator is `tools/build_maps.py`. |
| M5 Persistence and QA | Not started | | Saves, recovery, journal, performance, deploy |

Update each row when its tasks in [../IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) are checked. A task is checked only when its "Done when" test passes.

## Open items

- [ ] **M1.6** Automated or documented check that the player walks behind and in front of trees.
- [ ] **Fox persistence** (deferred by the user). Foxes went extinct in 1 of 20 seeds over 30 days, and in 15 of 20 over 90 days. Tune later with D-20 as the starting point.
- [x] **Q1** Forest cover definition (D-07). The user said to start M4 on 2026-10-13, which confirms it.
- [ ] **Animal field guides** need a check against a source (D-35). They are general statements written for this game.
- [ ] **Tree art** is a single 16 px tile, so the canopy never overlaps the player. Needs taller sprites (M1.6).
- [ ] **Q3** Hub soil and water quality values. Assumed.
- [ ] Mouse and fox sprites are substitutes (D-16 and the sprite map in [ASSETS.md](ASSETS.md)).
- [ ] Map regions are rectangles (forest, meadow). Edges look blocky. Revisit at the art pass.
- [ ] Tree tiles are small (Tiny Islands #5, #19). They read as dim spots at the default zoom.
- [ ] Lab results and environment are sandbox only. Nothing is saved between page loads yet (M5).
- [ ] Vectoraith side-view pack: demo only, reference only.
- [ ] Optional packs from the spec (Kenney, itch CC0 tilesets) not downloaded. Fetch only if a gap appears.

## Session log
| 2026-10-13 | **Open items closed.** Idempotency checked for `build_maps.py`. Live intervention on missions with review and confirm (D-38). Field journal at `/journal` (D-39). Touch joystick and E button (D-37). Scene tests for reset and live change. 96 unit, 13 e2e. |
| 2026-10-13 | **M4 and polish.** Mission loader, engine and three reference strategies (D-31). Islands keep their simulation for the session (D-32). Mission progress saved through the save service (D-33). Briefing, results and animal field-guide dialogs. Food-chain lesson in the lab. Redesigned menu with About and How to play; Continue removed (D-34). Results start from the starting snapshot (D-36). M1.6 checked: not met, tree art needs a taller sprite. |

| Date | What happened |
|---|---|
| 2026-10-12 | Read the product requirements. Created `docs/`: implementation plan, architecture and ecology model (brain), decisions log, memory. Created the project skill. |
| 2026-10-12 | Checked the vectoraith pack. Full pack is paid and side-view only, so the demo is reference only. Downloaded Tiny Islands (CC0, top-down) and Tiny Creatures (CC0, side-facing). Manifest in `ASSETS.md`. |
| 2026-10-12 | Confirmed sprites: chicken #150, cow #151, rabbit #177, squirrel #175 as mouse, grey wolf #93 as fox. Corrected an error: #118/#119 are not trees. Confirmed grass #15 and derived variants. |
| 2026-10-12 | **Build started.** Scaffolded the project. Generated the hub map with `tools/build_hub_map.py`. Wrote the simulation core, the hub scene, the menu, and `/game`. Tuned calibration (log in ECOLOGY_MODEL.md). |
| 2026-10-12 | **Calibration settled** at 30 days, 20 seeds, prey must not go extinct, grass above 15% (D-24). Prey met: 0 extinctions, lowest grass 65.2%. Fox deferred. An interrupted trial had left fox values changed; restored to D-20. |
| 2026-10-12 | **M1 gaps.** Trees are now sprites with depth at their base. Scripted collision e2e added and passing. |
| 2026-10-12 | **Lab building.** The one-tile station was too small. Replaced it with a 5 × 4 stone building from Kenney Tiny Town (CC0, D-30), with a label and a footprint that is solid. Playwright now runs with one worker: parallel runs made the game tests time out. |
| 2026-10-12 | **M3 lab.** Controls with validation (unit + e2e). Experiments: control and experiment runs saved with seed and starting state. Charts from day records. Food web diagram. Overlay pauses the island and keeps state on close. Decisions D-25 to D-29. 90-day run takes about 0.5 s in Node. |
| 2026-10-13 | **Repair.** `src/game/liveSimulation.ts` was missing, so `tsc` failed and the lab tests could not load. Rewrote it as the shared store (settings with validation, lab open state, saved runs, `attach`, `notify`). `npm run check` passes (73 unit tests), `next build` passes, Playwright passes 4/4 including `tree-depth.spec.ts`. M1.6 still unticked: the test checks depth order only, not the visible canopy and stump check. |

## Verification evidence

- 2026-10-13 (open items): `npm run check`: 96 unit tests in 11 files pass. `next build` passes. Playwright: 13 of 13 pass, including `tests/e2e/gaps.spec.ts` (mission reset to the exact start snapshot, live change after review, journal across reload, touch joystick and E button). M4.1: `build_maps.py` run twice gives identical SHA-256 for all four maps.

- 2026-10-13 (M4 session): `npx tsc --noEmit` passes. `npx vitest run`: 91 tests in 10 files pass, including `order.test.ts` (6 orders), `reference.test.ts` (10 seeds per mission), `explain.test.ts`, `animal-facts.test.ts`. `npx next build` passes. `npx playwright test`: 10 of 10 pass, including the animal dialog, the mission flow with reload, and the depth frames. Screens saved in `assets/previews/ui-*.png`.
- Mission check (`tools/mission-check.ts 10`): all three reference strategies pass 10 of 10. Defaults fail all three.
- M1.6 visual check: `assets/previews/depth-hub-*.png` and `depth-mission-forest-*.png`. The draw order is correct, but no sprite overlaps the player, so the "visibly passes behind" test is not met.

Record test names, benchmark numbers, and deployed URLs here as they are produced. Nothing is marked verified without evidence listed below.

- `npm run check` / `npx vitest run`: 54 unit tests in 5 files pass. Files: `random`, `config-and-world`, `engine`, `lab`, `liveSimulation`.
- 2026-10-13: `npx tsc --noEmit` passes. `npx vitest run`: 73 tests in 7 files pass. `npx next build` passes. `npx playwright test`: 4 of 4 pass.
- Earlier (2026-10-12): `npx tsc --noEmit` passes.
- `npx next build`: compiles; routes `/`, `/game`.
- `npx playwright test` (one worker): 3 tests pass:
  - `tests/e2e/game.spec.ts`: menu → New game → canvas, no console errors.
  - `tests/e2e/hub-collision.spec.ts`: holds left for 10 s, every sampled tile is walkable, the player stops at the coast.
  - `tests/e2e/lab.spec.ts`: lab opens; island hour does not move while open; out-of-range rabbits (150) rejected with an alert, 25 accepted; control and experiment both save; charts render; Escape closes; runs are still there on reopen.
- Calibration (`tools/calibrate-summary.ts`):
  - 30 days, 20 seeds: 1 of 20 runs had any extinction (fox, deferred). Prey 0. Lowest grass 65.2%.
  - 90 days, 20 seeds: 15 of 20 runs had fox extinction. Prey 0. Lowest grass 16.7%. Recorded, not targeted.
- Timing (`tools/time-run.ts`): 90 days in 500 ms, 30 days in 151 ms, in Node. Browser time not measured yet.
- Screenshots: `assets/previews/island-with-trees.png`, `lab-overview.png`, `lab-food-web.png`, `lab-populations.png`, `lab-results.png`, `island-lab-view.png`, `lab-closeup.png`.
- Not measured yet: frame rate with 400 animals (M5.8), browser time for a 90-day lab run (M3.6).

## Conventions agreed so far

- Ecology numbers live in `public/data/*.json`, not in code.
- Simulation and missions import nothing from React, Phaser, or the DOM. `src/game/liveSimulation.ts` imports no Phaser either.
- Use `Math.random` nowhere in `src/simulation`. Use the seeded PRNG.
- Animal positions are in tile units. Phaser converts to pixels.
- Raw downloads go in `assets/sources/` (not served). Only used files go into `public/`.
- The hub map is generated by `python tools/build_hub_map.py`. Edit the script, not the JSON.
- Invalid lab input is rejected, never clamped (D-26).
- Do not add a backend, accounts, or 