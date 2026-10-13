# Architecture — the project's "brain"

This file is the mental model of the system. Read it before changing code. It states what each part owns and the rules that must hold. Source spec: `Product requirements.txt` §7.1 and §8.

---

## 1. Layers and ownership

```
React UI (Next.js)  ──reads──►  Simulation service  ◄──reads config──  public/data/*.json
   │   dispatches actions            ▲
   ▼                                 │ steps
Phaser world  ──renders & inputs──►  │
                                     │
Mission engine ──evaluates──────────┘
   │
Save service ◄── serializes snapshots, mission progress, journal
```

| Layer | Owns | Must not |
|---|---|---|
| `src/simulation` | Animals, plants, environment, time, food web, reproduction, statistics | Import React, Phaser, DOM, or localStorage |
| `src/missions` | Objective definitions, evaluation, mission completion | Mutate the live world except through the simulation's public API |
| `src/game` (Phaser) | Rendering, camera, player movement, tile collision for the player, input | Hold authoritative population or environment numbers |
| `src/components` (React) | Layout, controls, charts, journal, results | Keep copies of simulation values. Read them from the service each render. |
| `src/persistence` | Save format, validation, migrations, checkpoints | Contain game rules |
| `src/config` | Loading and validating `public/data` | Contain hard-coded ecology numbers |

---

## 2. Invariants (must always hold)

1. **Deterministic step.** For a given snapshot and seed, one step produces one result. Frame rate never changes ecology.
2. **Simulation is authoritative.** Phaser and React display values from the simulation. No second copy of a population or environment value exists anywhere.
3. **Snapshots are complete.** A snapshot contains animals, plants, trees, environment, simulation hour, and PRNG state. A seed alone is never enough.
4. **Experiments copy, they do not mutate.** An experiment starts from a copied snapshot. The live world and the mission's initial state are never changed by an experiment.
5. **Missions are independent.** Each mission has its own map file and initial state. Completing one never alters another's starting state.
6. **Completion is computed.** A mission is complete when its criteria evaluate to true on recorded statistics. No button sets it.
7. **Config is the only source of ecology numbers.** Species rates, food-web edges, and mission starting values live in `public/data/*.json`.
8. **Validity checks run.** Spec §5.8 checks run each step in tests, and sampled in the app. Failures are loud.
9. **No animal teleports.** Movement uses speed, distance, detection radius, and tile collision.
10. **A prey is consumed at most once per step.**

---

## 3. Simulation step order (spec §5.4)

Each in-game hour, in this order:

1. Environmental changes (temperature, rainfall, sunlight, pollution, water quality)
2. Plant growth and resource availability (grass regrowth, grazing debt, tree growth)
3. Animal energy and health (hunger rises, energy drops, starvation and age damage)
4. Movement and target selection (state machine transitions, perception, movement)
5. Feeding and hunting (prey consumed once; predator energy updated)
6. Births and deaths (reproduction rules, mortality, cap enforcement)
7. Population and habitat statistics (day records)
8. Mission objective updates (evaluation hook; read-only on the world)

`tests/simulation/engine.order.test.ts` asserts this order.

---

## 4. Key data contracts

Defined in `src/types/index.ts`. Units are part of the name or the comment.

- `Animal` — `id`, `speciesId`, `x`, `y` (tile units, float), `ageHours`, `health` (0–100), `energy` (0–100), `hunger` (0–100), `state`, `targetId?`, `reproductionCooldownHours`, `alive`.
- `AnimalState` — `idle | wander | searchFood | eat | hunt | flee | rest | reproduce | dead`.
- `EnvironmentState` — `temperatureC`, `rainfallMmPerDay`, `sunlightPercent`, `soilQuality` (0–100), `pollution` (0–100), `waterQuality` (0–100), `simulationHour`.
- `MissionDefinition` — `id`, `title`, `mapId`, `initialStateId`, `durationDays`, `objectives`, `allowedControls`.
- `ExperimentRecord` — `id`, `missionId`, `seed`, `durationDays`, `startingState`, `interventions`, `finalState`, `statistics`, `createdAt`.
- `SimulationSnapshot` — full reproducible state including PRNG state.

Coordinates: simulation uses **tile units** (float). Phaser multiplies by 16 for pixels. Never store pixel coordinates in simulation state.

---

## 5. Map model

- One Tiled map per island state: `hub.json`, `mission-meadow.json`, `mission-forest.json`, `mission-pond.json`. The three missions are generated from the hub base by `tools/build-mission-maps.ts`.
- Layers: `ground`, `vegetation`, `solid`, `decor`, `interactive`.
- The collision grid used by the **simulation** is built from the same `solid` and water tiles that Phaser uses for the player. One source, two consumers.
- Grassland regions are defined as named rectangles or polygons in the map's object layer, so each region has a stable ID used by per-region grass coverage.

---

## 6. Time and speed

- Simulation step = 1 in-game hour. 24 steps = 1 in-game day.
- Live island speeds: Pause, 1× (1 in-game hour per 2 real seconds), 5×, 10×. Constants live in config.
- The lab runs the engine headless. For long runs it uses chunked timeslices or a Web Worker. Rendering is not involved.

---

## 7. Persistence model

Stored under one localStorage key with a `schemaVersion`:

- Selected mission and current map, player position
- Live simulation snapshot
- Discovered species and journal entries
- Mission completion flags
- Experiment records (completed)
- UI preferences

Load path: read → parse → zod validate → migrate → check invariants → hydrate. Any failure goes to the recovery screen. Nothing is written per frame. Checkpoints: mission completion, experiment submission, live intervention, and every 30 seconds of play.

---

## 8. What "done" looks like for the architecture

- `src/simulation` and `src/missions` build and test in Node with no browser.
- Deleting the Phaser folder does not break any simulation test.
- Every number a player sees in the lab or in Phaser can be traced to a simulation record.
- A new mission can be added by editing `missions.json` and generating its map, with no engine change.
