# Decisions log

Short, dated records of choices that shape the code. Add a new entry instead of rewriting an old one. If a decision is reversed, mark the old entry "Superseded by D-xx".

Format: **Decision** — what was chosen. **Why** — the reason. **Consequence** — what it means for the code.

---

## D-01 — Next.js + TypeScript for the app shell, Phaser for the world

- **Decision:** Menus, lab, journal, and results are React pages. Phaser runs the island inside a client-only component.
- **Why:** Spec §7 recommends this split. React handles forms, charts, and tabs well. Phaser handles tilemaps, sprites, and cameras.
- **Consequence:** Phaser is loaded with `next/dynamic` and `ssr: false`. Nothing in `src/game` may be imported by server code.

## D-02 — Simulation is pure TypeScript with no framework imports

- **Decision:** `src/simulation` and `src/missions` import nothing from React, Phaser, or the DOM.
- **Why:** Spec §5 requires the lab to run without player movement or rendering. It also makes tests fast and deterministic.
- **Consequence:** Tests for these folders run in Node under Vitest.

## D-03 — The simulation service is the store; no Redux or Zustand

- **Decision:** A single `SimulationService` holds state and notifies subscribers. React reads it with `useSyncExternalStore`. Phaser reads the same service.
- **Why:** Spec §7.1 forbids duplicate state that can drift out of sync. One store is enough for this scope.
- **Consequence:** Components do not call `useState` for simulation values.

## D-04 — Seeded PRNG with serializable state (mulberry32)

- **Decision:** All randomness goes through one PRNG. Its 32-bit state is stored in every snapshot.
- **Why:** Spec §5.8 and §8 require exact reproduction. A seed alone is insufficient once the run starts from an evolved state.
- **Consequence:** `Math.random` is banned in `src/simulation` (add a lint rule).

## D-05 — Simulation uses tile units; Phaser converts to pixels

- **Decision:** Animal positions are floats in tile units. Phaser multiplies by 16.
- **Why:** Keeps the simulation independent of render scale. The tileset is 16 px, so the conversion is trivial.
- **Consequence:** No pixel coordinates in snapshots.

## D-06 — Mission maps are generated from one hub base

- **Decision:** `tools/build-mission-maps.ts` produces the three mission maps from `hub.json`, changing only vegetation and objects.
- **Why:** Spec §3.4 says missions share tiles and collision, while each keeps independent environmental state. Generating them avoids three diverging maps.
- **Consequence:** Edit the hub base and rerun the generator. Mission maps are never hand-edited.

## D-07 — Forest cover is a spatial footprint, not a ratio of tree count (resolves plan Q1)

- **Decision:** Forest cover (%) = share of forest-region tiles under tree crown footprints, computed from tree positions on the same map.
- **Why:** Spec §6 sets tree count 8 → forest cover 20% and tree count 15 → forest cover 40%. A single linear ratio cannot match both. A footprint derived from positions keeps both numbers tied to one model, as spec §6 requires.
- **Consequence:** Mission 2's starting map places 8 trees so the footprint is 20%. Criteria are checked against the footprint. The forest-cover value is never edited directly. **Confirm with the user before M4.5 if this differs from what they expect.**

## D-08 — Grass is stored per region; global coverage is an area-weighted mean (resolves plan Q2)

- **Decision:** Grass coverage is stored per named grassland region. The global value is the area-weighted mean over grass-capable tiles. Mission 3's "grass near the pond" uses the pond region.
- **Why:** Spec §5.6 requires per-region values. Spec §6 mixes region-specific and global wording.
- **Consequence:** Regions are defined in the map object layer with stable IDs.

## D-09 — Experiments copy snapshots; only labeled interventions touch the live world (resolves plan Q6)

- **Decision:** Every experiment starts from a copied snapshot. Mission evidence comes from experiment records. The live world changes only through the labeled intervention, when the mission allows it.
- **Why:** Spec §4.2 and §4.4 require that experiments do not silently alter the live ecosystem, and that the mission's initial state is never overwritten.
- **Consequence:** Mission completion is evaluated on experiment records. Live-world intervention is a separate, confirmed action.

## D-10 — Real-time speed constants (resolves plan Q7)

- **Decision:** 1× = one in-game hour per 2 real seconds. 5× and 10× scale that rate. Pause stops advancement.
- **Why:** Spec §4.2 gives the speed options but no base rate.
- **Consequence:** Stored as a constant in config so it is easy to tune.

## D-11 — Phaser handles player collision; the simulation uses the same tile grid for animals (resolves plan Q8)

- **Decision:** Phaser uses the tilemap for player collision. The simulation builds its own walkability grid from the same `solid` and water tiles.
- **Why:** Spec §5.8 forbids animals moving through blocked terrain, so the simulation needs the grid. Phaser's physics should not decide animal movement.
- **Consequence:** A test checks that both grids agree on every tile.

## D-12 — Mouse population cap of 100 (resolves plan Q5)

- **Decision:** Mouse maximum population is 100, documented as a software limit.
- **Why:** The spec gives caps for four species but not mice. Mice reproduce quickly, so a cap is needed.
- **Consequence:** Listed in `species.json` and in ECOLOGY_MODEL.md.

## D-13 — Validation library: zod

- **Decision:** Save data and config files are validated with zod schemas.
- **Why:** Spec §9 requires validation before loading. zod gives typed parsing without hand-written checks.
- **Consequence:** Schema changes need a migration in `src/persistence/migrations.ts`.

## D-14 — Testing: Vitest for logic, Playwright for the full loop

- **Decision:** Vitest covers simulation, missions, persistence, and chart data. Playwright covers the end-to-end game loop and viewport checks.
- **Why:** Spec §10 mixes logic checks and user-facing checks. Each needs its own tool.
- **Consequence:** `npm test` runs Vitest. `npm run e2e` runs Playwright.

## D-15 — Asset sources: Tiny Islands for terrain, Tiny Creatures for animals (pending M0.6)

- **Decision:** Terrain and buildings come from Tiny Islands (CC0, top-down). Animals come from Tiny Creatures (CC0). Any species missing from it is filled from another CC0 pack.
- **Why:** The spec's "Recommended asset links" section recommends this combination and keeps the 16 px scale. Both packs were downloaded and checked on 2026-10-12.
- **Consequence:** Raw downloads go in `assets/sources/` (not served). Only used files are copied to `public/assets/`, with licenses in `public/assets/LICENSES/`. Checksums and details are in [../memory/ASSETS.md](../memory/ASSETS.md). **Status: open until M0.6 maps the spec species to tile indexes.**

## D-16 — Animals use side-facing Tiny Creatures sprites on the top-down map (decided by user 2026-10-12)

- **Decision:** Use the side-facing Tiny Creatures sprites for animals on the top-down map. The user chose this for speed. Many top-down games do the same with side-facing sprites.
- **Why:** Tiny Creatures is CC0 and has the 16 px scale. The vectoraith pack is side-view and paid, so it is not used.
- **Consequence:** The spec's visual-style line ("top-down pixel art") now applies to terrain and plants. Animals are a documented exception. Animal coverage on the verified tile map:
  - Chicken #150, cow #151, rabbit #177: confirmed.
  - Fox: **sprite #93 (grey wolf-like canid), chosen by user 2026-10-12.** The simulation species stays `fox`. See [../memory/ASSETS.md](../memory/ASSETS.md) for the final map.
  - Mouse: missing from Tiny Creatures. **Substitute chosen by user: #175 (squirrel).**
  - Plants: trees from Tiny Islands **#5 and #19** (confirmed as trees on grass). Grass, forest floor, meadow, pond, and shoreline also from Tiny Islands. Plain grass #15 confirmed. **Correction 2026-10-12: #118 and #119 are a baby figure and a winged figure, not trees. An earlier note said they were trees; that was wrong.**
- **Open:** Find a CC0 mouse and a CC0 fox (side-facing 16 px is acceptable), and check the license before download. Verify the plain grass tile before M1.1.

## D-17 — Hub map is generated by a Python script, output in Tiled JSON

- **Decision:** `tools/build_hub_map.py` builds the terrain atlas (`public/assets/tilesets/atlas.png`) and the map (`public/maps/hub.json`). The JSON is Tiled map format 1.10, so it opens in Tiled for hand edits.
- **Why:** PIL is available here, and the atlas needs image composition. Writing the map by script keeps it reproducible. The spec's plan was to author in Tiled, so Tiled stays the editing tool for later changes.
- **Consequence:** Edit the script and re-run `npm run build:maps`. Hand edits to the JSON are overwritten. Extra data lives in an `ecology` block (region grid, tree positions, spawn), which Tiled ignores.

## D-18 — Regions are rectangles over a noisy island; ecology reads the region grid

- **Decision:** Forest, meadow, and station are rectangles. The pond is an ellipse. Grassland is the rest. Each tile's region is stored in `ecology.regions`, and the simulation reads that grid for grass.
- **Why:** Quick to build and easy to test. The spec only requires that regions be recognisable through terrain tiles.
- **Consequence:** Region edges look blocky. Revisit during the art pass. The simulation does not depend on the shape, so the change would be local to the generator.

## D-19 — Predators hunt only when hungry (satiation)

- **Decision:** A predator hunts only when its energy is below 60. Otherwise it wanders.
- **Why:** Without this, five foxes killed about two rabbits a day each, and prey collapsed in the first 10 days. Satiation is a standard predator-prey rule.
- **Consequence:** Constant `PREDATOR_HUNGER_THRESHOLD` in `engine.ts`. Documented in ECOLOGY_MODEL.md.

## D-20 — Fox parameters adopted from calibration

- **Decision:** Fox metabolism 0.5/h, detection radius 12, hunt success 0.5, energy per prey 50, speed 2.6, starting population 5.
- **Why:** The calibration log in ECOLOGY_MODEL.md shows the other values produced extinction in 2 of 3 seeds within 30 days.
- **Consequence:** Foxes are still marginal (see M2.15). Treat these as provisional.

## D-21 — Chickens and mice forage on grass biomass (the spec's "seeds")

- **Decision:** The food-web edges for chicken and mouse point at `grass`, labelled "forages". No separate seed resource.
- **Why:** The spec's "seeds" resource would need its own regrowth and stock. The MVP model is simpler when every plant-eating species draws from one reserve per region.
- **Consequence:** Documented as an assumption in `public/data/food-web.json` and ECOLOGY_MODEL.md section 7. Revisit if the journal needs a seed resource.

## D-22 — Tree tiles come from Tiny Islands, not Tiny Creatures

- **Decision:** Trees use Tiny Islands #5 and #19.
- **Why:** Verified as trees on grass. Tiny Creatures #118 and #119 are not trees. An earlier note said they were, which was wrong and has been corrected in memory.
- **Consequence:** Tree sprites are tilemap tiles, so they are drawn in the vegetation layer and do not depth-sort with the player (M1.6).

## D-23 — Player sprite: Tiny Creatures #9 (green-hatted adventurer)

- **Decision:** The player uses Tiny Creatures #9.
- **Why:** Checked on a single-tile render. It is the only clear adventurer in the set.
- **Consequence:** Replace if the art pass finds a better human sprite.

## D-24 — Calibration target settled: 30-day hub stability for prey, fox persistence deferred

- **Decision:** The hub calibration target is: over 30 simulated days, across 20 seeds, no prey species (rabbit, cow, chicken, mouse) goes extinct, and grass stays above 15% in every grassland region. Fox persistence is out of this target and will be tuned in a later pass. The original 90-day target from plan M2.15 is replaced by this one for now.
- **Why:** The user said 90 days is a lot for now and asked to defer the foxes. The mission durations are 30, 45, and 30 days, so 30 days is the window that matters first.
- **Measured at this decision (20 seeds, 90 days, current settings):** prey never went extinct, and the lowest grass coverage was 16.7%. Foxes went extinct in 15 of 20 runs. Those fox numbers are recorded, not solved.
- **Consequence:** `tools/calibrate-summary.ts` reports against this target. Revisit D-20 (fox values) in the later pass.
- **Note:** An interrupted fox-variant trial left `species.json` at metabolism 0.4 and energy 60 for the fox. It was restored to the D-20 values (0.5 and 50) on this date.

## D-25 — The laboratory is an overlay on the island page, and the island pauses while it is open

- **Decision:** The lab is a full-screen overlay on `/game`, opened from the research station (E) or by the test hook. The island's clock stops while it is open. Escape or "Back to island" closes it.
- **Why:** Spec 4 allows either a dedicated screen or an overlay. An overlay keeps the live simulation in the same page, so nothing is reloaded and nothing is lost on close.
- **Consequence:** The shared state lives in `src/game/liveSimulation.ts`, which imports no Phaser. Phaser reads it, and React subscribes through `useSyncExternalStore`.

## D-26 — Invalid lab input is rejected, not clamped

- **Decision:** A value outside its range or not a number is refused, shows an error, and leaves the last valid value in place. Animal counts must be whole numbers.
- **Why:** Spec 4.2: "Reject invalid input without corrupting the simulation." Clamping would hide a typing error.
- **Consequence:** `validateSettings` in `src/simulation/controls.ts` is the single check. A run cannot start with invalid settings. Tests cover it.

## D-27 — Experiments run on the main thread, starting from a fresh state

- **Decision:** A run is `buildRun` followed by `runDays`, executed synchronously. It starts from its own fresh state with the chosen settings and seed. It never reads from the live island.
- **Why:** Measured on this machine: a 90-day hub run takes about 0.5 s in Node (`tools/time-run.ts`). A Web Worker is not needed yet. Spec M3.6 asks that the lab not freeze, so this must be re-measured in the browser.
- **Consequence:** A control run uses default settings with the same seed and duration. An experiment uses the player's settings. The control's stored `startingState` is the baseline snapshot (spec 4.4).

## D-28 — "Ecosystem health" is a stated composite, not a hidden formula

- **Decision:** Health = half grass coverage + half species present (out of five). The Overview label says so.
- **Why:** The spec's mock value (64/100) has no formula. A composite the player can read is better than an invented number.
- **Consequence:** Change the formula in one place, `Overview()` in `LabOverlay.tsx`, and keep the label in step.

## D-29 — Environment sliders affect experiments only; the live island changes only through interventions

- **Decision:** The Environment and Populations controls set the conditions of a new run. The live island's environment is not changed by them.
- **Why:** Spec 4.2: the live world changes only through a labelled intervention, which a mission must allow. Missions arrive in M4.
- **Consequence:** The Environment tab says so. Live interventions are not built yet.

## D-30 — The research lab is a five-tile stone building from Kenney Tiny Town

- **Decision:** The lab is a 5 × 4 tile stone building with a single arched door on the south side. Its tiles come from Kenney Tiny Town (CC0). A label reads "Research lab". The footprint is solid. The entrance tile is in front of the door.
- **Why:** A single house tile was too small to read as a lab. Tiny Islands has only small houses, which read as a village. Kenney Tiny Town is CC0, and the spec recommends Kenney for buildings.
- **Consequence:** The atlas has a new row 11 with the Tiny Town tiles. Buildings are drawn in a separate `buildings` layer. The station region is now (27, 74) to (38, 86).

## D-31 — The mission reference strategies are the ones the mission check passes on 10 of 10 seeds

- **Decision:** Reference settings, found with `tools/mission-check.ts 10`: meadow rainfall 90, sunlight 100, soil 100, rabbits 16, cows 3. Forest soil 100, sunlight 100, rainfall 100, pollution 0, rabbits 16, mice 24, foxes 3. Pond pollution 10, rainfall 70, soil 80, sunlight 85, rabbits 8, mice 10, foxes 3. Defaults fail all three missions.
- **Why:** Plan M4.7 needs a passing reference and a failing control per mission. Earlier reference values passed 4 of 10 seeds for the forest and 9 of 10 for the meadow.
- **Consequence:** Tests `tests/missions/reference.test.ts` and `tests/missions/order.test.ts` use these values. Changing the ecology or the mission data means re-running the check.

## D-32 — Each island keeps its live simulation for the page session

- **Decision:** The hub and each mission keep their own simulation object in memory. Leaving an island and returning does not rebuild it. Resetting a mission deletes its cached island, so the next visit starts from the defined damaged state.
- **Why:** The spec requires that moving between screens does not lose the current simulation (section 2), and that replaying a mission starts from its defined start (M4.9).
- **Consequence:** Reloading the browser still rebuilds every island. Saving live islands is part of M5.

## D-33 — Mission progress is saved through the save service; live islands are not yet

- **Decision:** Mission status and submissions are written to the save file's `progress` section, through `persistence/save.ts`. The file's live section is written empty until M5. A save that cannot be read is never overwritten.
- **Why:** The save schema already reserves this section. A corrupt save should reach the recovery screen (spec section 9), not be replaced silently.
- **Consequence:** Completed missions survive a reload. The hub and mission islands do not.

## D-34 — "Continue" is removed from the main menu until saves exist

- **Decision:** The opening menu has New game and Missions only. The disabled Continue button is gone.
- **Why:** Spec section 10: no visible control may be inert or misleading. Continue needs M5 saves.

## D-35 — Animal field guides are general statements; roles and lifespans come from the model

- **Decision:** `public/data/animal-facts.json` holds habitat, diet, behaviour and facts about the real animal. The "Eats", "Eaten by", lifespan and breeding rows are computed from `food-web.json` and `species.json`, so they match the island.
- **Why:** The dialog must agree with the simulation, while the natural-history text is not something the model can supply.
- **Consequence:** The facts are not checked against a source. A reviewer should check them before the game is used for teaching. The test checks that each species has a complete guide.

## D-36 — The results text starts from the run's starting snapshot

- **Decision:** A run's start values are measured by restoring `startingState`, before any day ran. Trends and the restoration summary compare that start with the last day.
- **Why:** Using the first recorded day hid real change. The meadow showed 32.7% → 32.7% grass, when the start was 31.9%.
- **Consequence:** `explain.ts` takes the world and config as inputs. The results text stays a pure function of the record.

## D-37 — Touch controls appear only on coarse pointers

- **Decision:** The joystick and E button show when `(pointer: coarse)` matches. They write to the store, and the island reads them beside the keyboard input. The joystick's analogue direction takes over while it is held.
- **Why:** Plan M1.9 asks for touch controls on mobile, and desktop should not show them.
- **Consequence:** A touch laptop with a fine primary pointer will not show them. The keyboard still works.

## D-38 — Live changes apply to the island only on a mission, and never change a score

- **Decision:** The lab's Environment tab offers "Change the live island" on a mission. Only the controls the mission allows can change. The player reviews the list before it is applied. Missions are still scored on experiments, which start from fresh runs.
- **Why:** Spec 4.2: the live world changes only through a labelled intervention that the mission allows. Spec 4.4: experiments are kept apart from the mission's original conditions, so a live change must not be a way to pass.
- **Consequence:** A live change is visible on the island and in the log, but it does not count toward completion.

## D-39 — The field journal records what the player inspects

- **Decision:** A species is added the first time it is inspected with E, and the lab is added when it is first opened. Each inspection records the island, the day and the animal's state. The journal is saved with the mission progress, and it keeps the latest 200 observations.
- **Why:** Plan M4.11: discovery is recorded on first inspection, and entries must persist.
- **Consequence:** Nothing is written before the saved state is loaded, so an early action cannot overwrite a save.

## D-40 — The live response is a preview of an experiment, with a short horizon

- **Decision:** The lab's live charts (Environment and Populations tabs) run each setting with the experiment engine, seed 2026, for up to 60 days, and compare it with the island's base. They update 350 ms after the last change. Nothing is saved, and the island is not touched.
- **Why:** The lab should show the chain responding as the player edits, without freezing the page. A 60-day run takes well under a second in the browser. The seed is fixed so that a preview and an experiment with the same settings match exactly (tested).
- **Consequence:** Full-length runs (up to 90 days) are still on the Experiments tab and are saved.

## D-41 — Livability index: four equal parts, 0 to 100

- **Decision:** Livability is the mean of grass coverage, water quality, (100 minus pollution), and the share of species still present. Each is on a 0 to 100 scale.
- **Why:** The spec asks for a livability measure, but no formula is given. A plain average of stated parts can be checked by a reader, like the ecosystem health score (D-28).
- **Consequence:** The weights are a teaching choice, not a biological measure. They are in `src/simulation/livability.ts`.

## D-42 — Predation is recorded per prey species, and a kill is also a death

- **Decision:** Each day records how many animals of each prey species were eaten by predators. These are counted within that species' deaths, never separately from them.
- **Why:** The lab should show animals eating animals. A separate count lets the charts say which prey the predators are taking.
- **Consequence:** A test checks the predation invariant (eaten never exceeds deaths) and that prey are eaten and animals are born over 60 days.

## D-43 — Experiments change the hub's base only when ticked and confirmed, and never a mission

- **Decision:** On the hub, the Experiments tab has "Make this experiment the island's new base", off by default. When a run with it ticked finishes, the player confirms, and the live hub is rebuilt from that run's settings, keeping the lab open. "Return to the original base" rebuilds it from the original defaults after confirmation. Missions never change: their start is the defined damaged state (plan M4.9).
- **Why:** The brief says experiments must not change the base map unless the player ticks the box, and the player must be able to go back to the default.
- **Consequence:** The base is saved with the progress. Saved runs are kept when the base changes.

## D-44 — Runs live in the browser's localStorage, capped at 20, oldest dropped first

- **Decision:** Runs are written to this browser's save (the save service key), with mission progress and the journal. The newest 20 are kept. If the browser refuses the write (storage full), the oldest runs are dropped until it fits, and the lab says how many were not kept.
- **Why:** The brief asks that results are stored in each user's browser. A run's starting and final snapshots make each save large, so a cap and a clear message are needed.
- **Consequence:** A reload keeps the runs. A different browser or a cleared site data loses them. Nothing is sent to a server.

## D-45 — Theme: field journal in honey and walnut, two surfaces, two pixel fonts

- **Decision:** Titles, buttons, tabs and labels use Jersey 10. Body text uses Pixelify Sans. Menu, mission list and journal are cream paper with ink text. Dialogs are parchment with ink text. The island HUD, the lab and the game frame are walnut with cream text. Colours are tokens in `globals.css`.
- **Why:** The brief asked for a yellow, cream and brown look with pixel buttons and text, matched to the fonts. Six candidate pixel fonts were rendered side by side. Jersey 10 looked sturdiest for titles and buttons, and Pixelify Sans was the most readable for paragraphs.
- **Consequence:** Text colour is decided by the surface, through `.paper` and `.ink-zone`. A dark box inside a paper dialog must be marked `on-dark`. The contrast test fails if a token change breaks readability.

## D-46 — Responsive layout: charts use the side space on wide screens, and stack on a phone

- **Decision:** The lab's Environment and Populations tabs split into two columns on screens 1024 px and wider: the controls on the left (sticky while scrolling), the charts on the right. Chart and card grids fill the width available (`.eco-grid`, `.eco-grid-wide`), so a wide screen gets more columns and a phone gets one. Below 1024 px everything stacks. The controls wrap on a narrow screen, and the lab's tab bar scrolls sideways.
- **Why:** The game is played on a PC and on a phone. Single-column layouts left most of a wide screen empty.
- **Consequence:** `tests/e2e/responsive.spec.ts` checks, at 1440 px and 390 px, that no page or lab tab scrolls sideways, that PC charts sit beside the controls and share rows, and that phone charts stack.
