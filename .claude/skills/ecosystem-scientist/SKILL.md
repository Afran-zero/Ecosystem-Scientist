---
name: ecosystem-scientist
description: Project knowledge for the Ecosystem Scientist browser game (Next.js + Phaser + pure-TypeScript ecology simulation, three restoration missions, local saves). Use for any work in this repository: scaffolding, map or Tiled work, simulation rules, lab UI, missions, persistence, tests, or deciding what to build next.
---

# Ecosystem Scientist

A browser-based, top-down pixel-art ecosystem game. The player explores one hub island, observes seven species, and uses a research lab to run experiments. Three restoration missions each start from a damaged island state. Progress saves locally. No backend.

## Sources of truth (read these, do not guess)

- `Product requirements.txt` (project root): product scope and acceptance criteria. Spec §10 is the definition of done.
- `docs/IMPLEMENTATION_PLAN.md`: ordered milestones M0–M5 with a "Done when" check per task, and open questions Q1–Q8.
- `docs/brain/ARCHITECTURE.md`: layer ownership, invariants, simulation step order, data contracts.
- `docs/brain/ECOLOGY_MODEL.md`: ecology assumptions and every starting number, with mission values.
- `docs/brain/DECISIONS.md`: decisions D-01 to D-15. Check here before making a design choice.
- `docs/memory/PROJECT_MEMORY.md`: current milestone, open items, session log, verification evidence. Read first in every session; update last.
- `docs/memory/ASSETS.md`: every downloaded art pack with source, license, checksum, and perspective. Raw files are in `assets/sources/` (not served). Tiny Islands (terrain) and Tiny Creatures (animals) are CC0. Animals are side-facing, which conflicts with the top-down spec. Decision D-16 is pending.

If a file named here does not exist yet, the project has not reached that step. Do not invent its contents.

## Non-negotiable rules

1. **Layer boundaries.** `src/simulation` and `src/missions` import nothing from React, Phaser, the DOM, or localStorage. Phaser renders simulation positions and never computes populations.
2. **One source of state.** The simulation service is the store. React reads it through `useSyncExternalStore`. No copies of population or environment values in component state.
3. **Determinism.** Use the seeded PRNG only (mulberry32). Never `Math.random` in simulation code. Snapshots include PRNG state. Frame rate must not change outcomes.
4. **Tile units in simulation.** Animal positions are float tile coordinates. Phaser multiplies by 16 for pixels.
5. **Config drives numbers.** Species rates, food-web edges, and mission starting values live in `public/data/*.json`, validated by zod at startup. Do not hard-code them in TypeScript.
6. **Experiments copy, never mutate.** Experiments start from a copied snapshot. Missions keep their own initial states. Only a labeled, confirmed intervention changes the live world, and only when the mission allows it.
7. **Missions are calculated.** Completion comes from explicit criteria evaluated on recorded statistics. Never a "success" button or a hard-coded flag.
8. **Charts show records.** Every chart and table is derived from `statistics` day records. No sample data after the prototype stage.
9. **Forest cover is a footprint.** It is derived from tree positions on the same map (D-07). Never edit the percentage directly.
10. **Exactly seven species, exactly three missions.** Chickens and mice are omnivores, shown that way in the journal and food-web diagram. Do not add species or missions without the user asking.
11. **No scope expansion** before the full loop works: enter island → explore → inspect animals → lab → experiment → three missions → save → reload.

## Simulation step order (each in-game hour)

Environment → plant growth and resources → animal energy and health → movement and target selection → feeding and hunting → births and deaths → statistics → mission objective update. 24 steps per day. A prey is consumed at most once per step.

Spec §5.8 invariants run after each step in tests: no negative population, health, energy, or biomass; no duplicate IDs; no cap overflow; no consumption of unavailable resources; no movement outside the island or into blocked terrain; no NaN or infinity; chart data equal to simulation state.

## The three missions (starting values in spec §6)

| Mission | Problem | Key starting state | Pass criteria |
|---|---|---|---|
| 1 — Restore the Grazing Meadow | Grass lost; rabbits and cows compete | Grass 25%, rabbits 24, cows 12, foxes 4, trees 18 | Grass ≥ 60%; rabbits and cows never extinct; 30+ days; valid record |
| 2 — Reconnect the Forest | Tree and habitat loss | Trees 8, forest cover 20%, mice 18, rabbits 12, foxes 6, grass 45% | Trees ≥ 15; forest cover ≥ 40%; ≥ 2 species at end; 45+ days; evidence |
| 3 — Clean the Polluted Pond | Pollution damages pond | Pollution 75, water quality 25, pond grass 30%, trees 12, mice 10, rabbits 8, foxes 3 | Pollution ≤ 30; water quality ≥ 65; pond grass ≥ 50%; 30+ days; valid experiment |

Starting values marked "proposed" in ECOLOGY_MODEL.md are configuration, not facts.

## Working method for this repo

- Follow the milestone order in the plan. Do not populate missions before the simulation is validated.
- Before a task, read its "Done when" line. Mark a task done only after its test passes. Do not tick spec §10 items without test evidence.
- Write the simulation test first when a rule is precise (step order, caps, feeding once, determinism).
- When a rule is ambiguous, check DECISIONS.md. If it is not there, record a new decision and say so to the user.
- Asset licenses: keep each pack's license in `public/assets/LICENSES/`. Tiny Islands and Tiny Creatures are CC0. Check Kenney packs individually.
- Pin exact dependency versions. Use releases at least two weeks old.
- Update `docs/memory/PROJECT_MEMORY.md` at the end of each session: status, milestone table, session log, and any new evidence.

## Commands (available once M0 is complete)

- `npm run dev` — local dev server
- `npm run check` — lint, typecheck, unit tests
- `npm test` — Vitest (simulation, missions, persistence). 24 tests pass.
- `npm run e2e` — Playwright end-to-end suite
- `npm run build` — production build
- `npm run build:maps` — regenerate the hub atlas and map (`python tools/build_hub_map.py`)
- `npm run sim:calibrate -- 90 1 2 3` — run the hub for N days across seeds and print trajectories

## Current build state (2026-10-12)

- Built: hub island (`public/maps/hub.json`), simulation core (`src/simulation`), Phaser hub scene with depth-sorted trees (`src/game/HubScene.ts`), shared live store (`src/game/liveSimulation.ts`), laboratory overlay with six tabs (`src/components/laboratory/`), menu, `/game`.
- Tests: 54 unit tests (`npm test`), 3 Playwright tests (`npm run e2e`): menu, scripted collision, lab.
- Not built: missions (M4), live intervention, journal, saves and recovery (M5), touch controls, ESLint.
- Calibration target settled in D-24: 30 days, 20 seeds, prey must not go extinct, grass above 15%. Fox persistence is deferred by the user.
- Fox and mouse sprites are substitutes (grey wolf #93, squirrel #175). See `docs/memory/ASSETS.md`.
- Read `docs/memory/PROJECT_MEMORY.md` for the milestone table and the next actions.

## Known open questions

- Q1 forest cover definition (D-07 proposed; confirm with the user before M4.5)
- Q3 hub soil and water quality values (assumed)
- M0.6 mouse and fox sprite availability in Tiny Creatures

Check `docs/IMPLEMENTATION_PLAN.md` §8 for the current status of each question.
