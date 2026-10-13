# Ecosystem Scientist — Implementation Plan

Source of truth for product scope: `Product requirements.txt` (project root). This plan turns that spec into an ordered build. If the plan and the spec disagree, the spec wins and the plan gets corrected.

Status: **Planning complete. No code scaffolded yet.** Track progress in [memory/PROJECT_MEMORY.md](memory/PROJECT_MEMORY.md).

---

## 0. How to read this plan

- Build in the milestone order below. Do not populate the three missions before the simulation is validated (spec §11).
- Each task has a **Done when** line. A task is done only when that check passes, not when code exists.
- Architecture rules in [brain/ARCHITECTURE.md](brain/ARCHITECTURE.md) are mandatory. Any change that breaks them needs a new entry in [brain/DECISIONS.md](brain/DECISIONS.md) first.
- Ecology numbers (rates, starting values) live in data files, never in code. Their current values and rationale are in [brain/ECOLOGY_MODEL.md](brain/ECOLOGY_MODEL.md).

---

## 1. Scope recap

| Item | Target |
|---|---|
| Product | Browser pixel-art ecosystem game, one hub island, one lab, three restoration missions |
| Screens | Main menu, Island, Research lab, Field journal, Mission results |
| Map | 160 × 120 tiles of 16 px = 2,560 × 1,920 world px; camera about 960 × 640 |
| Species | 7: grass, trees, rabbit, cow, chicken, mouse, fox |
| Simulation step | 1 in-game hour; 24 steps per day |
| Persistence | localStorage only, versioned, validated, with a recovery path |
| Backend | None |

Out of scope for the MVP: multiplayer, accounts, external AI APIs, genetics, extra species, a backend or database.

---

## 2. Stack and tooling decisions

These choices are recorded in [brain/DECISIONS.md](brain/DECISIONS.md). Pin exact versions at scaffold time. Use the latest stable release that is at least two weeks old.

| Concern | Choice | Reason |
|---|---|---|
| App shell and UI | Next.js (App Router) + TypeScript + Tailwind CSS | Spec §7. Menus, lab, journal, and results are ordinary React pages. |
| Game world | Phaser 3 (UMD-free ESM import, loaded client-side only) | Spec §7. Phaser needs `window`, so it is loaded with `next/dynamic` and `ssr: false`. |
| Map authoring | Tiled, exported as JSON | Spec §3.1. Layers: ground, vegetation, solid, decor, interactive. |
| Charts | Recharts | Spec §7. Fed only from simulation records. |
| Tests | Vitest for simulation, missions, persistence. Playwright for end-to-end acceptance. | Simulation tests need no browser. E2E covers spec §10. |
| Save validation | zod schemas | Spec §9 requires validation before load. |
| Deployment | Vercel | Spec §7. Static-friendly, no server code. |
| Randomness | Seeded PRNG (mulberry32). Its single 32-bit state is stored in every snapshot. | Deterministic replay and exact snapshot restore (spec §5.8). |

Avoid adding a state library (Redux, Zustand). The simulation service is the store, and React reads it through `useSyncExternalStore`. This prevents the duplicate state the spec forbids (spec §7.1).

---

## 3. Target repository layout

Follow spec §7.2. Additional folders the plan adds:

```
ecosystem-scientist/
├── docs/                    # this folder: plan, brain, memory
├── .claude/skills/ecosystem-scientist/SKILL.md
├── public/
│   ├── assets/
│   │   ├── LICENSES/        # license file for every asset pack (spec "Recommended asset links" section)
│   │   └── ...
│   ├── maps/                # hub.json, mission-meadow.json, mission-forest.json, mission-pond.json
│   └── data/                # species.json, food-web.json, missions.json
├── src/
│   ├── config/              # typed loaders for public/data, validated at startup
│   ├── simulation/          # pure TypeScript, no React, no Phaser, no DOM
│   ├── missions/            # pure TypeScript
│   ├── persistence/         # save.ts, migrations.ts, schema.ts
│   ├── game/                # Phaser scenes, entities, map loading, input
│   ├── components/          # React: game overlay, laboratory, journal, missions
│   └── types/
├── tests/
│   ├── simulation/
│   ├── missions/
│   ├── persistence/
│   └── e2e/                 # Playwright
└── tools/
    └── build_maps.py         # generates hub and mission maps from the atlas (see §5.2)
```

Rule: `src/simulation` and `src/missions` must not import from `src/game`, `src/components`, or `phaser`. This is what lets the lab run fast-forward without rendering.

---

## 4. Phase overview

| Milestone | Spec §11 name | Output | Gate to next milestone |
|---|---|---|---|
| M0 | Setup (not in spec, required) | Scaffolded app, tooling, tests running, docs linked | `npm run build` and `npm test` pass on an empty project |
| M1 | Playable world | Hub map, player, camera, collisions, interaction prompts, asset loading | Acceptance §10 "World and interaction" items pass |
| M2 | Living ecosystem | Seven species, food web, movement, feeding, hunting, reproduction, vegetation, clock | Simulation invariants (spec §5.8) pass in tests with 100 seeds |
| M3 | Research laboratory | Lab UI, controls, snapshots, experiments, charts, comparisons | Same snapshot plus seed gives identical results; controls verified |
| M4 | Three missions | Meadow, forest, pond states, objectives, evaluation, results screens | Each mission has a passing reference experiment and a failing control |
| M5 | Persistence and QA | Saves, recovery, E2E suite, performance check, production build | Full loop in §10 passes in Playwright, reload included |

Milestones are sequential. Inside a milestone, the tasks are ordered by dependency.

---

## 5. Milestone tasks

### M0 — Setup

- [ ] **M0.1** Scaffold Next.js + TypeScript + Tailwind at the project root. Done when `npm run dev` serves a blank page.
- [ ] **M0.2** Install Phaser, Recharts, zod, Vitest, Playwright, and add a `src/game/PhaserGame.tsx` client wrapper using `next/dynamic` with `ssr: false`. Done when a blank Phaser canvas renders on `/game`.
- [ ] **M0.3** Configure ESLint, `tsc --noEmit` with strict mode, and an `npm run check` script that runs lint, typecheck, and unit tests.
- [ ] **M0.4** Create `src/types/index.ts` with the shared contracts from spec §8: `Animal`, `AnimalState`, `EnvironmentState`, `MissionDefinition`, `ExperimentRecord`, `SimulationSnapshot`. Done when the types compile and every field has units in a comment.
- [ ] **M0.5** Create `public/assets/LICENSES/` and add the license file for each asset pack downloaded. Done when every pack folder has a matching license file.
- [ ] **M0.6** Confirm the asset packs listed in the spec are downloaded and inspected: Tiny Islands (terrain), Tiny Creatures (animals), and Kenney only where needed. Record which animal sprites exist for cow, chicken, rabbit, mouse, and fox. If mouse or fox is missing, record the substitution in DECISIONS.md before M1.

### M1 — Playable world

- [ ] **M1.1** Author `hub.json` in Tiled: 160 × 120 tiles, 16 px tiles, layers named `ground`, `vegetation`, `solid`, `decor`, `interactive`. Done when the file loads in Phaser with no console warnings.
- [ ] **M1.2** Paint the seven required regions with terrain tiles, not labels: grassland, forest, pond, meadow, forest edge, research station, coastline. Water surrounds the island. Done when each region is recognizable in a screenshot without its name.
- [x] **M1.3** Map boundary and collision: `solid` and water tiles block movement. Done when a scripted walk test cannot enter water or solid tiles.
- [ ] **M1.4** Player movement with WASD and arrow keys, four directions, and diagonal movement normalized so diagonal speed does not exceed cardinal speed. Done when diagonal distance per second equals cardinal distance per second.
- [ ] **M1.5** Camera follows the player, clamps to map bounds, and lerps smoothly. Pixel rendering uses integer zoom where practical. Done when the camera stops at each edge without showing outside-map area.
- [x] **M1.6** Depth sorting for trees and buildings so the player walks behind and in front of them. _(16 × 32 trees from tools/make_tree_sprites.py, base on the trunk tile; stumps on the forest mission. Checked by tests/e2e/depth-visual.spec.ts and by the frames in assets/previews/depth-*.png)_ Done when the player visibly passes behind a tree canopy and in front of a stump.
- [ ] **M1.7** Interaction system: an `interactive` object or animal within range shows a prompt. E opens the matching dialogue, lab entrance, or mission briefing. Done when every interactive object type shows the correct prompt and action.
- [ ] **M1.8** Placeholder animals move on the map so M1 can be tested. Movement is replaced by simulation-driven positions in M2. Done when the placeholders are visibly separate, not one shared sprite.
- [x] **M1.9** _(touch joystick and E button; tested with the touch emulation in tests/e2e/gaps.spec.ts)_ Touch controls for mobile (virtual joystick plus interact button). Done when the hub can be walked and interacted with on a touch device emulator.
- [ ] **M1.10** Pause the world while menus, lab, or results are open. Done when player and animal positions do not change while a modal is open.

### M2 — Living ecosystem

- [ ] **M2.1** `src/config`: load and validate `species.json`, `food-web.json`, and the environment defaults. Invalid config must fail at startup with a readable error. Done when a bad field produces a named error in a test.
- [ ] **M2.2** `src/simulation/clock.ts`: fixed step of 1 in-game hour, 24 steps per day, separate from render time. Done when 720 steps produce identical output regardless of how the steps are batched.
- [ ] **M2.3** `src/simulation/random.ts`: mulberry32 PRNG with `getState`/`setState`. Done when restoring state reproduces the next 1,000 values.
- [ ] **M2.4** `src/simulation/environment.ts`: temperature, rainfall, sunlight, soil quality, pollution, water quality, simulation hour. Ranges enforced by one validator used by both UI and simulation. Done when out-of-range input is rejected with no state change.
- [ ] **M2.5** `src/simulation/plants.ts`: grass coverage per grassland region (0–100), growth driven by sunlight, water, soil, and pollution. Grazing removes biomass; regrowth restores it; coverage is capped at maximum. Trees tracked as count plus growth state; not grazed. Done when grass never exceeds the cap and grazing never removes more than available.
- [ ] **M2.6** `src/simulation/animals.ts`: animal entities with every field from spec §5.2 and the state machine from spec §5.3. Done when each state transition has a unit test.
- [ ] **M2.7** Species-specific behavior: rabbit (grass, shelter, flee foxes), cow (grass and water), chicken and mouse (configured forage), fox (reachable prey, chase, hunt). Done when each species' test scenario produces its expected state sequence.
- [ ] **M2.8** Perception and movement: detection radius, speed, collision with terrain grid. Animals never teleport. Use a spatial grid for neighbour lookup so 400 animals run within budget. Done when the 400-animal benchmark completes one simulated day under 200 ms in Node.
- [ ] **M2.9** `src/simulation/food-web.ts`: relationships read only from `food-web.json`. Feeding updates prey state, predator energy, and statistics. A prey can be consumed once. Done when a prey killed in a step is excluded from every other predator's target list in that step.
- [ ] **M2.10** `src/simulation/reproduction.ts`: all parameters from spec §5.5 per species, including the population cap. Done when no species exceeds its cap across 100 seeds over 90 days.
- [ ] **M2.11** `src/simulation/statistics.ts`: per-day records of counts, births, deaths, grass coverage, tree count, environment. Done when chart inputs come only from these records.
- [ ] **M2.12** `src/simulation/engine.ts`: orchestrates the step order from spec §5.4 (environment, plants, energy and health, movement and targets, feeding and hunting, births and deaths, statistics, mission hook). Done when the step order is asserted by a test that records the call order.
- [ ] **M2.13** Invariant checks from spec §5.8, run after every step in test mode and on a sampled basis in the app. Done when a deliberately corrupted state is caught by the check.
- [ ] **M2.14** Determinism test: same config, seed, and snapshot produce byte-identical final snapshots. Done when this is green for 50 seeds.
- [ ] **M2.15** Calibration pass for the hub island. Target settled in D-24: 30 simulated days, 20 seeds, no prey extinction, grass above 15% in every grassland region. Fox persistence is deferred to a later pass. Record the final values in `ECOLOGY_MODEL.md`.

### M3 — Research laboratory

- [x] **M3.1** Lab shell: a dedicated screen with tabs Overview, Environment, Populations, Food web, Experiments, Results. Done when each tab opens and returns without losing state.
- [x] **M3.2** Control components: slider plus numeric input, synchronized, with unit, range, reset-to-default, and rejection of invalid input. Done when every control in spec §4.2 has a test for each rule in spec §4.2's list.
- [x] **M3.3** Every control is wired to a defined parameter. Done when a table in the test suite maps each control to the parameter it changes, and a test changes each one and asserts the change.
- [x] **M3.4** _(live change on a mission, after review and confirmation; tests/simulation/intervention.test.ts and tests/e2e/gaps.spec.ts)_ Live intervention action: separate button, labeled, with a confirmation dialog, available only when the active mission allows it. Done when the live world is unchanged until confirmed.
- [ ] **M3.5** Experiment workflow from spec §4.4: baseline snapshot, variable selection, configuration, validation, run, results, comparison, save record, submit to mission. Done when each step is reachable and the record contains the fields in spec §8.
- [ ] **M3.6** Fast-forward runner: runs the engine headless (no rendering) in a Web Worker or chunked timeslices so the UI stays responsive. Done when a 90-day experiment completes in the browser without freezing the lab. (Use a Web Worker if chunking is not enough.)
- [ ] **M3.7** Charts: population, vegetation, birth/death, environment, comparison, species table. Every series is derived from `statistics` records. Done when a test feeds a known record set and checks the chart data arrays.
- [ ] **M3.8** Food-web diagram: nodes for the seven species, arrows from prey to predator, selecting a node highlights its immediate neighbours. Chickens and mice are labeled omnivores. Done when the diagram matches `food-web.json` exactly.
- [ ] **M3.9** Experiment reset that does not erase mission progress. Done when a reset leaves mission completion flags untouched.

### M4 — Three missions

- [x] **M4.1** _(generated by tools/build_maps.py, not a .ts file; regenerating gives byte-identical maps)_ Generate the three mission maps from the hub base with `tools/build_maps.py` (run `npm run build:maps`). Each map keeps the same tiles and differs only in vegetation and objects. Done when the generator is idempotent and the three outputs are committed.
- [x] **M4.2** `missions.json`: each mission has `id`, `title`, `mapId`, `initialStateId`, `durationDays`, `objectives`, `allowedControls`. Initial states are stored separately from the live world. Done when the loader rejects a mission that references a missing map or state.
- [x] **M4.3** Mission engine: objectives are explicit measurable conditions with a timing flag (`atEnd` or `throughout`). Completion is calculated, not set by a button. Done when a fixture run with known statistics yields the expected pass or fail per objective.
- [x] **M4.4** Mission 1 — Restore the Grazing Meadow. Starting state from spec §6. Criteria: grass ≥ 60%, rabbits and cows never extinct, observation period complete, valid record submitted.
- [x] **M4.5** Mission 2 — Reconnect the Forest. Starting state from spec §6. Criteria: trees ≥ 15, forest cover ≥ 40%, at least two species present at the end, evidence submitted and at least one population change explained. **Resolve the forest-cover definition first (see §8, Q1).**
- [x] **M4.6** Mission 3 — Clean the Polluted Pond. Starting state from spec §6. Criteria: pollution ≤ 30, water quality ≥ 65, pond-area grass ≥ 50%, valid experiment submitted.
- [x] **M4.7** Reference experiment per mission: for each mission, a documented intervention set and seed that passes, and a control configuration that fails. Store both as test fixtures. Done when both run in CI.
- [x] **M4.8** Mission results screen: initial state, intervention, duration, final state, criteria satisfied, and a short scientific explanation written from the data (not hard-coded text). Done when changing the data changes the explanation.
- [x] **M4.9** _(tests/e2e/gaps.spec.ts: a reset returns the exact start snapshot)_ Mission reset: restores the mission's defined initial state, not a previously restored one. Done when reset after completion yields the original starting snapshot hash.
- [x] **M4.10** Missions can be done in any order. The hub is always reachable. Done when all six orders of the three missions can be completed in a test.
- [x] **M4.11** _(journal at /journal; saved with progress; tests/e2e/gaps.spec.ts)_ Field journal: discovered species, observations, habitat, trophic relationships. Discovery is recorded when the player first inspects an animal or the lab. Done when journal entries persist.

### M5 — Persistence and quality assurance

- [ ] **M5.1** Save schema with a version number, zod validation, and migrations. Done when a version-0 fixture migrates to the current version in a test.
- [ ] **M5.2** Save checkpoints per spec §9: after mission completion, after experiment submission, after live-world change, and periodically (every 30 seconds of play) with no per-frame writes. Done when a frame-rate test shows no localStorage writes between checkpoints.
- [ ] **M5.3** Corrupted or unsupported saves show a recovery screen with "start new" and "export raw data as text" options. The app must not crash. Done when corrupted JSON, a wrong type, and a future version each show the recovery screen.
- [ ] **M5.4** New Game confirms that existing progress will be replaced. Done when cancelling leaves the save untouched.
- [ ] **M5.5** Full reset restores the expected baseline. Done when the hub snapshot hash after reset equals the fixture hash.
- [ ] **M5.6** Playwright E2E for the full loop: new game → explore → inspect animals → open lab → change controls → run experiment → complete three missions → reload → progress still present.
- [ ] **M5.7** Target viewport test: 1280 × 720 desktop and 390 × 844 mobile. Done when no control is off-screen and every modal can be closed.
- [ ] **M5.8** Performance check: 60 fps target in the world with 400 animals on a mid-range laptop. Lab fast-forward of 90 days within a few seconds. Record the numbers in PROJECT_MEMORY.md.
- [ ] **M5.9** Production build deployed to Vercel. Done when the deployed URL completes the M5.6 loop.
- [ ] **M5.10** Final acceptance: tick every item in spec §10 only after its test passes. Record evidence paths in PROJECT_MEMORY.md.

---

## 6. Data and configuration plan

### 6.1 `species.json` (one entry per species)

Fields: `id`, `displayName`, `classification` (producer, herbivore, omnivore, carnivore), `resources`, `sprite`, `movementSpeed`, `detectionRadius`, `maxPopulation`, `minReproductiveAgeHours`, `reproductionProbabilityPerDay`, `reproductionCooldownHours`, `minHealth`, `minEnergy`, `mortalityPerDay`, `maxAgeHours`. Values are in [brain/ECOLOGY_MODEL.md](brain/ECOLOGY_MODEL.md).

### 6.2 `food-web.json`

A list of edges `{ prey, predator, kind }` where kind is `consumes` or `grazes`. Spec examples: grass → rabbit, grass → cow, seeds → chicken, seeds → mouse, rabbit → fox, mouse → fox. Chickens and mice are omnivores; their extra resources are documented in the species file.

Note: spec §5.1 says chickens and mice are omnivores. Their food-web edges are configured per the spec's listed resources. Do not invent plant-to-animal edges beyond what the spec lists without recording it in DECISIONS.md.

### 6.3 `missions.json`

Each mission contains the starting state values from spec §6, the objective list, the allowed controls, and the duration. Mission starting values are data, not code, so they can be changed without touching the engine (spec §6 note).

### 6.4 Environment defaults

Proposed hub baseline (from the spec's illustrative lab values, stated as assumptions): temperature 24 °C, rainfall 45 mm/day, sunlight 70%, soil quality 70, pollution 20, water quality 80. Mission values are in §6 of the spec and [brain/ECOLOGY_MODEL.md](brain/ECOLOGY_MODEL.md).

---

## 7. Testing strategy

| Layer | Tool | What it proves |
|---|---|---|
| Unit | Vitest | Each simulation function, validators, PRNG, schema migrations |
| Invariants | Vitest, run every step in test mode | Spec §5.8 checks: no negatives, no NaN, no duplicate IDs, no cap overflow, no blocked-terrain movement |
| Determinism | Vitest | Same snapshot and seed give identical results across 50 seeds |
| Mission | Vitest | Each objective evaluates correctly on fixture statistics; reference passes, control fails |
| Chart data | Vitest | Chart arrays match `statistics` records exactly |
| Persistence | Vitest | Round-trip, migration, corruption handling |
| UI and world | Playwright | Movement, collisions, prompts, lab navigation, full loop with reload |
| Performance | Node benchmark + Playwright timing | 400 animals per day under budget; 90-day fast-forward responsiveness |

Every spec §10 checkbox maps to at least one test. Keep the mapping in `tests/ACCEPTANCE.md` once M0 is done.

---

## 8. Open questions and proposed resolutions

These need an answer, or a decision recorded in DECISIONS.md, before the milestone named.

| # | Question | Proposed resolution | Needed by |
|---|---|---|---|
| Q1 | **Forest cover vs tree count.** Spec §6 says tree count 8 = forest cover 20%, and tree count 15 = forest cover 40%. A single linear ratio (trees ÷ capacity) cannot give both: 8 trees would need capacity 40 and 15 trees would give 37.5%. | Define forest cover as a **spatial footprint**: the share of forest-region tiles covered by tree crowns, computed from tree positions on the same map. Mission 2's start map places trees so the footprint is 20%. Criteria stay exactly as written and are checked against the derived footprint, so the displayed numbers come from one model (spec §6 Mission 2 rule). | Before M4.5 |
| Q2 | **Grass coverage: per region or global?** Spec §5.6 says per grassland region. Mission criteria use a single percentage. | Store per-region values. Report global coverage as the area-weighted mean over grass-capable tiles. Pond-area grass (Mission 3) uses the pond region only. | Before M2.5 |
| Q3 | **Hub baseline for values the spec does not give.** Soil, water quality. | Use the proposed values in §6.4 and ECOLOGY_MODEL.md. Mark as assumptions. | Before M2.4 |
| Q4 | **Mouse and fox sprites.** Tiny Creatures is said to include the needed animals. Mouse and fox are not confirmed. | Check during M0.6. If absent, use Kenney or another CC0 pack and log it. | M0.6 |
| Q5 | **Mouse population cap.** Spec §4.2 gives no cap for mice. | Set 100 in `species.json` and document it as a software limit. | Before M2.10 |
| Q6 | **Experiments versus live world.** Spec §4.4 says experiments start from a baseline snapshot. Spec §4.2 says the live world changes only through a labeled intervention. | Experiments always copy from a snapshot. Mission evidence comes from experiment records. The live world changes only via the labeled intervention, when the mission allows it. | Before M3.5 |
| Q7 | **Real-time speed.** Spec sets Pause, 1×, 5×, 10× but not the base rate. | 1× = one in-game hour per 2 real seconds. 5× and 10× scale that. Stored as a constant. | Before M3.6 |
| Q8 | **Physics.** Spec mentions Phaser lightweight physics. Simulation owns animal positions. | Phaser handles player collision against the tilemap only. Animal collision uses the same tile grid inside the simulation, so the two agree. | Before M1.3 |

---

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Missions are unwinnable with default ecology numbers | Core loop broken | Reference experiment per mission (M4.7) and calibration pass (M2.15) before content is written |
| Phaser and simulation drift apart | Visual animals disagree with the lab | Phaser only renders simulation positions. No separate movement logic in Phaser. |
| Next.js server rendering touches `window` via Phaser | Build failure | Client-only dynamic import (M0.2) |
| localStorage quota or corruption | Lost progress | Versioned schema, validation, recovery screen, periodic checkpoints (M5.1–M5.3) |
| Lab freezes during 90-day runs | Poor usability | Headless engine in a Web Worker if chunked runs are too slow (M3.6) |
| Asset licenses lost | Legal risk | License files kept beside each pack (M0.5) |
| Scope creep into extra species or backend | Schedule slip | Spec's final boundary: no expansion until the full loop works (spec §11) |

---

## 10. Definition of done

The project is done when every item in spec §10 is checked, each check points to a passing test, and the M5.6 end-to-end loop passes on the deployed Vercel URL. The spec's own checkboxes are only marked after the test is green.
